// src/modules/jobs/job.match.service.js
// AI Job Match scoring for candidates.
// Deterministic skill-overlap scorer + optional OpenRouter LLM rerank
// with graceful fallback to deterministic when the key is missing/fails.
//
// Data flow:
//   candidate_profiles (skills, headline, bio, experience, location)
//   + resumes (raw_text, resume_data JSON: skills/experience/education)
//   -> jobs table (title, description, requirements, location, type)

import {
  findCandidateProfileByUserId,
  findLatestResumeByCandidateId,
  findOpenJobs,
} from "./job.repository.js";
import { buildJobRecommendationPrompt, normalizeRecommendations } from "../ai/prompts/job-recommendation.prompt.js";
import { callAIJSON } from "../ai/ai.client.js";

export const MATCH_THRESHOLD = 30;
export const MATCH_DEFAULT_LIMIT = 20;
export const MATCH_MAX_LIMIT = 50;

// ============================================
// NORMALIZATION HELPERS
// ============================================

const toSkillEntries = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  for (const item of list) {
    const raw =
      typeof item === "string" ? item : (item?.name ?? item?.skill ?? "");
    if (typeof raw !== "string") continue;
    const original = raw.trim();
    if (!original) continue;
    const key = original.toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.set(key, original);
  }
  return [...seen.entries()].map(([key, original]) => ({ key, original }));
};

const tokenize = (text) => {
  if (!text || typeof text !== "string") return [];
  return (
    text
      .toLowerCase()
      .match(/[a-z0-9#+.]+/g)
      ?.filter((t) => t.length >= 2) ?? []
  );
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Substring for normal skills; word-boundary check for very short tokens
// (e.g. "go", "c", "r") to avoid false positives inside other words.
const jobTextIncludesSkill = (jobTextLower, skillKey) => {
  if (!skillKey) return false;
  if (skillKey.length <= 2) {
    try {
      return new RegExp(
        `(^|[^a-z0-9+#])${escapeRegExp(skillKey)}(?![a-z0-9+#])`,
      ).test(jobTextLower);
    } catch {
      return false;
    }
  }
  return jobTextLower.includes(skillKey);
};

const splitRequirements = (requirements) => {
  if (!requirements || typeof requirements !== "string") return [];
  return requirements
    .split(/[,;|\n•\-–]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 10);
};

const experienceToText = (experience) => {
  if (!Array.isArray(experience)) return "";
  return experience
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object") {
        return [e.title, e.role, e.company, e.description, e.summary]
          .filter(Boolean)
          .join(" ");
      }
      return "";
    })
    .join(" \n ")
    .toLowerCase();
};

// ============================================
// DETERMINISTIC SCORER (0-100)
//   skill overlap : 60 pts
//   headline/title: 20 pts
//   experience    : 12 pts
//   location      :  8 pts
// ============================================

const scoreJob = (candidate, job) => {
  const jobTextLower =
    `${job.title ?? ""} ${job.description ?? ""} ${job.requirements ?? ""}`.toLowerCase();
  const jobTitleLower = String(job.title ?? "").toLowerCase();

  // ---- skills ----
  const matchedSkills = [];
  for (const skill of candidate.skills) {
    if (jobTextIncludesSkill(jobTextLower, skill.key)) {
      matchedSkills.push(skill.original);
    }
  }

  const reqFragments = splitRequirements(job.requirements);
  const jobTerms = reqFragments.length > 0 ? reqFragments.length : 1;

  const matchedCount = matchedSkills.length;
  const candidateTotal = candidate.skills.length;

  let skillScore = 0;
  if (candidateTotal > 0) {
    const jdCoverage = matchedCount / Math.max(jobTerms, 1);
    const resumeCoverage = matchedCount / Math.max(candidateTotal, 1);
    skillScore = (jdCoverage * 0.75 + resumeCoverage * 0.25) * 60;
  }
  skillScore = Math.min(60, skillScore);

  // Missing skills = requirement fragments not covered by candidate skills.
  const missingSkills = reqFragments
    .filter((frag) => {
      const fragLower = frag.toLowerCase();
      return !candidate.skills.some(
        (s) => s.key.length >= 2 && fragLower.includes(s.key),
      );
    })
    .map((frag) => (frag.length > 60 ? `${frag.slice(0, 57)}...` : frag))
    .slice(0, 5);

  // ---- headline / title relevance (0-20) ----
  const headlineTokens = new Set(tokenize(candidate.headline));
  const titleTokens = tokenize(job.title);
  const titleTokenSet = new Set(titleTokens);
  let overlap = 0;
  for (const t of headlineTokens) {
    if (titleTokenSet.has(t)) overlap += 1;
  }
  const titleOverlapScore =
    titleTokens.length > 0 ? (overlap / titleTokens.length) * 15 : 0;
  const skillInTitle = candidate.skills.some((s) =>
    jobTitleLower.includes(s.key),
  )
    ? 5
    : 0;
  const titleScore = Math.min(20, titleOverlapScore + skillInTitle);

  // ---- experience (0-12) ----
  const expCount = Array.isArray(candidate.experience)
    ? candidate.experience.length
    : 0;
  const expText = experienceToText(candidate.experience);
  let expRelevantHits = 0;
  if (expText) {
    for (const skill of candidate.skills) {
      if (skill.key.length >= 3 && expText.includes(skill.key)) {
        expRelevantHits += 1;
      }
      if (expRelevantHits >= 3) break;
    }
  }
  const titleInExp =
    expText &&
    titleTokens.some((t) => t.length >= 4 && expText.includes(t));
  const expScore = Math.min(
    12,
    Math.min(expCount, 6) * 1 + expRelevantHits * 2 + (titleInExp ? 2 : 0),
  );

  // ---- location (0-8) ----
  let locScore = 0;
  const candLoc = String(candidate.location ?? "")
    .toLowerCase()
    .trim();
  const jobLoc = String(job.location ?? "")
    .toLowerCase()
    .trim();
  if (candLoc && jobLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) {
    locScore = 8;
  } else if (
    jobTitleLower.includes("remote") ||
    jobLoc.includes("remote") ||
    String(job.type ?? "").toLowerCase() === "remote"
  ) {
    locScore = 4;
  }

  const matchScore = Math.round(
    Math.min(100, Math.max(0, skillScore + titleScore + expScore + locScore)),
  );

  // ---- reasons ----
  const reasons = [];
  if (matchedSkills.length > 0) {
    reasons.push(
      `Matches ${matchedSkills.slice(0, 3).join(", ")} (${matchedCount}/${jobTerms} required skills)`,
    );
  }
  if (overlap > 0 && candidate.headline) {
    reasons.push(
      `Headline "${candidate.headline}" aligns with "${job.title}"`,
    );
  }
  if (locScore === 8 && candidate.location) {
    reasons.push(`Location match: ${candidate.location}`);
  }
  if (expScore >= 6 && expCount > 0) {
    reasons.push(`${expCount} relevant experience ${expCount === 1 ? "entry" : "entries"}`);
  }
  if (reasons.length === 0) {
    reasons.push(`Potential fit for ${job.title} based on profile`);
  }

  return {
    matchScore,
    matchedSkills: matchedSkills.slice(0, 8),
    missingSkills,
    reasons: reasons.slice(0, 3),
  };
};

// ============================================
// CANDIDATE SNAPSHOT (profile + resume merged)
// ============================================

const buildCandidateSnapshot = (profile, resume) => {
  const resumeData =
    resume?.resumeData && typeof resume.resumeData === "object"
      ? resume.resumeData
      : {};

  const mergedSkills = toSkillEntries([
    ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ...(Array.isArray(resumeData.skills) ? resumeData.skills : []),
  ]);

  const mergedExperience = [
    ...(Array.isArray(profile?.experience) ? profile.experience : []),
    ...(Array.isArray(resumeData.experience) ? resumeData.experience : []),
  ];

  const snapshot = {
    skills: mergedSkills,
    headline:
      profile?.headline ||
      resumeData.headline ||
      resumeData.summary ||
      "",
    bio: profile?.bio || "",
    location: profile?.location || resumeData.location || "",
    experience: mergedExperience,
    // Merged resumeData shape reused for the optional LLM rerank prompt.
    mergedResumeData: {
      ...resumeData,
      skills: mergedSkills.map((s) => s.original),
      experience: mergedExperience,
      headline:
        profile?.headline ||
        resumeData.headline ||
        resumeData.summary ||
        "",
    },
    rawText: resume?.rawText || "",
    hasResume: Boolean(resume),
  };

  const hasUsableData =
    mergedSkills.length > 0 ||
    Boolean(snapshot.headline) ||
    Boolean(snapshot.bio) ||
    mergedExperience.length > 0;

  return { snapshot, hasUsableData };
};

// ============================================
// OPTIONAL LLM RERANK (OpenRouter, fallback safe)
// Never throws for missing key — returns null -> deterministic.
// ============================================

const tryLlmRerank = async (snapshot, openJobs, limit) => {
  try {
    const { system, user } = buildJobRecommendationPrompt({
      resumeData: snapshot.mergedResumeData,
      rawText: snapshot.rawText,
      jobs: openJobs,
    });

    const raw = await callAIJSON({ system, user, temperature: 0.2 });
    const normalized = normalizeRecommendations(raw, openJobs);
    if (!Array.isArray(normalized) || normalized.length === 0) return null;

    const jobMap = new Map(openJobs.map((j) => [String(j.id), j]));
    return normalized.slice(0, limit).map((rec) => {
      const job = jobMap.get(String(rec.jobId));
      if (!job) return null;
      return {
        jobId: job.id,
        job,
        matchScore: rec.score,
        score: rec.score, // alias for older clients
        matchedSkills: rec.matchedSkills ?? [],
        missingSkills: rec.missingSkills ?? [],
        reasons: rec.reason ? [rec.reason] : [],
        reason: rec.reason ?? "", // alias for older clients
      };
    }).filter(Boolean);
  } catch {
    // Key missing, timeout, invalid JSON — caller falls back silently.
    return null;
  }
};

// ============================================
// MAIN ENTRY
// ============================================

export const getMatchedJobsForCandidate = async (userId, limit = MATCH_DEFAULT_LIMIT, useAi = false) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || MATCH_DEFAULT_LIMIT, 1),
    MATCH_MAX_LIMIT,
  );

  // Fetch a slightly larger pool than requested so threshold filtering
  // still leaves enough results; LLM rerank also caps at 30 jobs.
  const [profile, openJobs] = await Promise.all([
    findCandidateProfileByUserId(userId),
    findOpenJobs(50),
  ]);

  if (!openJobs.length) return [];

  const resume = profile
    ? await findLatestResumeByCandidateId(profile.id)
    : null;

  const { snapshot, hasUsableData } = buildCandidateSnapshot(profile, resume);

  if (!hasUsableData) {
    const error = new Error(
      "Complete your profile and upload a resume to get AI job matches.",
    );
    error.statusCode = 404;
    throw error;
  }

  // Optional LLM rerank first (uses merged profile + resume).
  if (useAi) {
    const llmRanked = await tryLlmRerank(snapshot, openJobs, safeLimit);
    if (llmRanked && llmRanked.length > 0) {
      return llmRanked
        .filter((r) => r.matchScore >= MATCH_THRESHOLD)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, safeLimit);
    }
  }

  // Deterministic fallback — no AI key needed.
  return openJobs
    .map((job) => {
      const scored = scoreJob(snapshot, job);
      return {
        jobId: job.id,
        job,
        matchScore: scored.matchScore,
        score: scored.matchScore, // alias for older clients
        matchedSkills: scored.matchedSkills,
        missingSkills: scored.missingSkills,
        reasons: scored.reasons,
        reason: scored.reasons[0] ?? "", // alias for older clients
      };
    })
    .filter((r) => r.matchScore >= MATCH_THRESHOLD)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, safeLimit);
};
