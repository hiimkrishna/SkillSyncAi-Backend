// src/modules/jobs/job.eligibility.service.js
// Supervisor mods:
//   1. Minimum-requirement filter per job. Jobs stay visible to every
//      candidate, but candidates below the bar CANNOT apply (HTTP 422).
//   4. Recruiter-defined filters: required skills (+ match-score
//      threshold, default bar 80), minimum experience years, education
//      keyword and minimum education grade.
//
// Filtering variables chosen to match this project's data:
//   - skills: candidate_profiles.skills + parsed resume skills (merged,
//     same snapshot as the AI job-match scorer)
//   - experience: explicit `years` per entry when present, else parsed
//     year-ranges from `period`/`summary` text (e.g. "2020-2024"),
//     else 0.5 yr fallback per entry
//   - education: free-text keyword over degree/institution/field/year
//     (+ optional numeric grade parsed from a `grade`/`gpa` field)

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";
import { scoreCandidateForJob } from "./job.match.service.js";

// Platform-wide strict bar (supervisor: "more than 80").
// NOBODY may apply below this match score, even if the recruiter
// left the job wide open. A job can only tighten further.
export const PLATFORM_MIN_MATCH_SCORE = 80;
export const SUGGESTED_MIN_MATCH_SCORE = 80;

// ============================================
// NORMALIZERS
// ============================================

export const normalizeRequiredSkills = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;|\n]+/)
      : [];

  const seen = new Set();
  const out = [];

  for (const item of list) {
    const raw = typeof item === "string" ? item : (item?.name ?? "");
    const cleaned = String(raw).trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }

  return out.slice(0, 30);
};

const skillKeysOf = (snapshot) =>
  (snapshot?.skills ?? []).map((s) => s.key).filter(Boolean);

const candidateTextIncludes = (haystack, needle) => {
  if (!needle) return false;
  const h = String(haystack ?? "").toLowerCase();
  const n = String(needle).toLowerCase().trim();
  if (!n) return false;
  if (n.length <= 2) {
    try {
      return new RegExp(
        `(^|[^a-z0-9+#])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9+#])`,
      ).test(h);
    } catch {
      return false;
    }
  }
  return h.includes(n);
};

// ============================================
// EXPERIENCE YEARS ESTIMATOR
// candidate_profiles.experience entries:
//   { role, company, period, summary, years? }
// ============================================

const parseYearsFromText = (text) => {
  if (!text || typeof text !== "string") return 0;
  let total = 0;

  // Year ranges: "2020-2024", "2020–2024", "2020 to 2024", "2020/2024"
  const rangeRe = /(19|20)\d{2}\s*(?:-|–|—|to|\/)\s*((19|20)\d{2}|present|now|current)/gi;
  let match;
  const currentYear = new Date().getFullYear();
  // eslint-disable-next-line no-cond-assign
  while ((match = rangeRe.exec(text)) !== null) {
    const start = Number(match[0].slice(0, 4));
    const endRaw = (match[2] || "").toLowerCase();
    const end = /present|now|current/.test(endRaw)
      ? currentYear
      : Number(String(match[2]).slice(0, 4));
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      total += Math.min(end - start, 40);
    }
  }

  // Explicit durations: "3 years", "18 months"
  const durRe = /(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?)\b/gi;
  // eslint-disable-next-line no-cond-assign
  while ((match = durRe.exec(text)) !== null) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value)) continue;
    total += unit.startsWith("month") || unit.startsWith("mo")
      ? value / 12
      : value;
  }

  return total;
};

export const estimateExperienceYears = (experience) => {
  if (!Array.isArray(experience) || experience.length === 0) return 0;

  let total = 0;
  let fallbackEntries = 0;

  for (const entry of experience) {
    if (entry && typeof entry.years === "number" && entry.years > 0) {
      total += Math.min(entry.years, 40);
      continue;
    }
    if (entry && typeof entry.years === "string" && Number(entry.years) > 0) {
      total += Math.min(Number(entry.years), 40);
      continue;
    }
    const text = [
      entry?.period,
      entry?.summary,
      entry?.description,
      entry?.role,
      typeof entry === "string" ? entry : "",
    ]
      .filter(Boolean)
      .join(" ");
    const parsed = parseYearsFromText(text);
    if (parsed > 0) {
      total += Math.min(parsed, 40);
    } else {
      fallbackEntries += 1;
    }
  }

  // Unknown-format entries count as half a year each (conservative).
  total += fallbackEntries * 0.5;

  return Math.round(total * 10) / 10;
};

// ============================================
// EDUCATION MATCHERS
// entries: { institution, degree, field?, year?, grade?|gpa? }
// ============================================

const educationToText = (education) => {
  if (!Array.isArray(education)) return "";
  return education
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object") {
        return [e.degree, e.field, e.institution, e.year, e.grade, e.gpa]
          .filter(Boolean)
          .join(" ");
      }
      return "";
    })
    .join("\n");
};

const parseGrade = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
};

export const bestEducationGrade = (education) => {
  if (!Array.isArray(education)) return null;
  let best = null;
  for (const e of education) {
    if (!e || typeof e !== "object") continue;
    const grade = parseGrade(e.grade ?? e.gpa ?? e.cgpa ?? e.score);
    if (grade !== null && (best === null || grade > best)) best = grade;
  }
  return best;
};

// ============================================
// MAIN ELIGIBILITY CHECK
// ============================================

export const jobHasEligibilityFilters = (job) =>
  (Array.isArray(job?.requiredSkills) && job.requiredSkills.length > 0) ||
  Number(job?.minMatchScore) > 0 ||
  Number(job?.minExperienceYears) > 0 ||
  Boolean(job?.educationRequirement?.trim()) ||
  Number(job?.minEducationGrade) > 0;

export const checkEligibility = async (candidateUserId, job) => {
  const requiredSkills = normalizeRequiredSkills(job?.requiredSkills);
  const jobThreshold = Math.max(0, Math.min(100, Number(job?.minMatchScore) || 0));
  // Platform floor always wins — a job can only be stricter, never looser.
  const minMatchScore = Math.max(PLATFORM_MIN_MATCH_SCORE, jobThreshold);
  const minExperienceYears = Math.max(0, Number(job?.minExperienceYears) || 0);
  const educationKeyword = String(job?.educationRequirement ?? "").trim();
  const minEducationGrade =
    job?.minEducationGrade === null || job?.minEducationGrade === undefined
      ? null
      : Number(job.minEducationGrade);

  // THE unified score — identical to what /jobs/match and
  // /ai/recommended-jobs display for this candidate + job.
  const {
    matchScore,
    matchedSkills,
    missingSkills: scorerMissing,
    profile,
    snapshot,
    hasUsableData,
  } = await scoreCandidateForJob(candidateUserId, job);

  const keys = skillKeysOf(snapshot);
  const matchedRequired = requiredSkills.filter((skill) =>
    keys.some(
      (k) =>
        k === skill.toLowerCase() ||
        k.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(k),
    ),
  );
  const missingRequiredSkills = requiredSkills.filter(
    (skill) => !matchedRequired.includes(skill),
  );

  // mergedResumeData already unions profile + parsed-resume entries.
  const mergedExperience = Array.isArray(
    snapshot?.mergedResumeData?.experience,
  )
    ? snapshot.mergedResumeData.experience
    : (profile?.experience ?? []);
  const resumeEducation = Array.isArray(
    snapshot?.mergedResumeData?.education,
  )
    ? snapshot.mergedResumeData.education
    : [];
  const mergedEducation = [
    ...(profile?.education ?? []),
    ...resumeEducation.filter(
      (e) =>
        !JSON.stringify(profile?.education ?? []).includes(
          JSON.stringify(e),
        ),
    ),
  ];

  const experienceYears = estimateExperienceYears(mergedExperience);

  const educationText = educationToText(mergedEducation);
  const educationMatch =
    !educationKeyword || candidateTextIncludes(educationText, educationKeyword);

  const candidateGrade = bestEducationGrade(mergedEducation);
  const gradeMatch =
    minEducationGrade === null ||
    Number.isNaN(minEducationGrade) ||
    (candidateGrade !== null && candidateGrade >= minEducationGrade);

  const failures = [];
  if (!hasUsableData) {
    failures.push(
      "Complete your profile (headline, skills, experience) and upload a resume to get a match score",
    );
  }
  if (missingRequiredSkills.length > 0) {
    failures.push(
      `Missing required skills: ${missingRequiredSkills.join(", ")}`,
    );
  }
  if (matchScore < minMatchScore) {
    failures.push(
      `Match score ${matchScore} is below the required ${minMatchScore}`,
    );
  }
  if (minExperienceYears > 0 && experienceYears < minExperienceYears) {
    failures.push(
      `Experience ${experienceYears}y is below the required ${minExperienceYears}y`,
    );
  }
  if (!educationMatch) {
    failures.push(
      `Education does not mention required "${educationKeyword}"`,
    );
  }
  if (!gradeMatch) {
    failures.push(
      candidateGrade === null
        ? "No education grade found on your profile"
        : `Education grade ${candidateGrade} is below the required ${minEducationGrade}`,
    );
  }

  // Actionable "how to become a best fit" guidance, built from the
  // candidate's own profile + resume vs this job.
  const bestFitSteps = [];
  const gapSkills = [
    ...new Set([...missingRequiredSkills, ...(scorerMissing ?? [])]),
  ].slice(0, 6);
  if (gapSkills.length > 0) {
    bestFitSteps.push({
      title: `Learn and add: ${gapSkills.join(", ")}`,
      detail:
        "These appear in this job but not in your profile or resume. Add them to Profile → Skills (and your resume) once you can back them up.",
    });
  }
  if (matchScore < minMatchScore) {
    bestFitSteps.push({
      title: `Raise your match score from ${matchScore} to ${minMatchScore}+`,
      detail:
        "Mirror the job's key skills in your headline, skills list and experience descriptions, and keep your resume uploaded and parsed.",
    });
  }
  if (minExperienceYears > 0 && experienceYears < minExperienceYears) {
    bestFitSteps.push({
      title: `Grow experience toward ${minExperienceYears}y (you show ~${experienceYears}y)`,
      detail:
        "Fill Period + Years on every experience entry so nothing you earned goes uncounted.",
    });
  }
  if (!educationMatch) {
    bestFitSteps.push({
      title: `Add education mentioning "${educationKeyword}"`,
      detail: "Add the degree/institution on Profile → Education.",
    });
  }
  if (!gradeMatch) {
    bestFitSteps.push({
      title:
        candidateGrade === null
          ? "Add your education grade/GPA"
          : `Raise your grade from ${candidateGrade} toward ${minEducationGrade}`,
      detail: "Fill Grade/GPA on each education entry.",
    });
  }
  if (!hasUsableData) {
    bestFitSteps.push({
      title: "Complete your profile and upload a resume",
      detail:
        "Matching runs on your headline, skills, experience and parsed resume — empty profiles always score low.",
    });
  }

  return {
    eligible: failures.length === 0,
    reasons: failures,
    hasUsableProfile: hasUsableData,
    matchScore,
    matchedSkills,
    missingSkills: scorerMissing ?? [],
    requiredSkills,
    requiredSkillsMatched: matchedRequired,
    missingRequiredSkills,
    minMatchScore,
    experienceYears,
    minExperienceYears,
    educationKeyword: educationKeyword || null,
    educationMatch,
    candidateGrade,
    minEducationGrade,
    bestFitSteps,
  };
};

export const findJobWithFilters = async (jobId) => {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
    .limit(1);

  return job ?? null;
};
