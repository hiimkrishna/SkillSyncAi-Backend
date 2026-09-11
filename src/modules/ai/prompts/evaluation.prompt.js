export const EVALUATION_VERSION = "1.0";

export const buildEvaluationPrompt = ({ job, resumeData, rawText, profileData }) => {
  const jobDescription = `
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"}
Type: ${job.type}
Description:
${job.description}
Requirements:
${job.requirements || "Not specified"}
Skills from JD:
${job.skills ? JSON.stringify(job.skills) : "Not specified"}
`.trim();

  // Compile resume + profile together — candidate's complete information
  const profile = profileData || {};

  const combinedSkills = [
    ...(Array.isArray(resumeData?.skills) ? resumeData.skills : []),
    ...(Array.isArray(profile.skills) ? profile.skills : []),
  ];
  // dedupe case-insensitive
  const mergedSkills = [...new Set(combinedSkills.map((s) => String(typeof s === "string" ? s : s?.name || s?.skill || "").trim()).filter(Boolean))];

  const resumeText = rawText || JSON.stringify(resumeData, null, 2);

  const experience = JSON.stringify(
    [...(Array.isArray(resumeData?.experience) ? resumeData.experience : []), ...(Array.isArray(profile.experience) ? profile.experience : [])].slice(0, 8),
    null,
    2,
  );
  const education = JSON.stringify(
    [...(Array.isArray(resumeData?.education) ? resumeData.education : []), ...(Array.isArray(profile.education) ? profile.education : [])].slice(0, 6),
    null,
    2,
  );

  const headline = profile.headline || resumeData?.headline || profile.bio || "";
  const location = profile.location || "";
  const phone = profile.phone ? "provided" : "not provided";

  const system = `
You are an AI hiring assistant for SkillSync AI. Your job is to assist recruiters, NOT to make hiring decisions.

You are given COMPILED candidate data from BOTH resume (parsed) and profile (candidate's manually updated whole profile). Compile them together and summarize for a recruiter's first impression.

Compare the COMPILED candidate profile against the job description and produce a structured evaluation.

STRICT RULES:
- Only use information present in resume + profile and JD. Never invent. Merge both sources — if resume and profile overlap, treat as confirmed.
- Be concise, factual, and helpful for a recruiter to decide "is this candidate worth moving to next stage?" — this is the FIRST IMPRESSION the recruiter sees.
- Score must be 0-100, calibrated like ATS: 90-100 excellent match, 70-89 good, 50-69 partial, <50 weak. Base score on compiled skills + experience relevance.
- matchedSkills: skills/keywords from JD that ARE in COMPILED data (resume + profile)
- missingSkills: important JD requirements NOT found in COMPILED data
- strengths: 3-5 bullet points why candidate is relevant (cite resume + profile)
- concerns: 2-4 bullet points gaps/risks (note if profile incomplete)
- summary: 3-4 sentences recruiter-facing first impression — who they are, key fit, and ATS-style fit. Must feel like a compiled summary of resume + profile.
- skillMatchPercent: integer 0-100 (matched / total JD skills)
- experienceRelevance: "high" | "medium" | "low"
- recommendation: "strong_yes" | "yes" | "maybe" | "no" (based on score)
- atsKeywordsMatched: key ATS keywords from JD found in COMPILED data (max 10)

Return ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "score": 82,
  "overallScore": 82,
  "matchedSkills": ["React", "Node.js"],
  "missingSkills": ["PostgreSQL"],
  "strengths": ["3 years React experience", "Built scalable APIs"],
  "concerns": ["No PostgreSQL mentioned", "Limited leadership"],
  "summary": "Candidate is a strong junior frontend fit with ...",
  "skillMatchPercent": 75,
  "experienceRelevance": "high",
  "recommendation": "yes",
  "atsKeywordsMatched": ["React", "Next.js"]
}
`.trim();

  const user = `
JOB DESCRIPTION:
---
${jobDescription}
---

COMPILED CANDIDATE DATA (resume + whole profile):
Headline: ${headline}
Location: ${location} | Phone: ${phone}
Bio: ${(profile.bio || "").slice(0, 500)}
Skills (merged resume + profile): ${mergedSkills.join(", ") || "Not specified"}
Experience (merged): ${experience}
Education (merged): ${education}
Certifications: ${JSON.stringify([...(Array.isArray(resumeData?.certifications) ? resumeData.certifications : []), ...(Array.isArray(profile.certifications) ? profile.certifications : [])].slice(0, 6), null, 2)}
Portfolio: ${JSON.stringify([...(Array.isArray(resumeData?.portfolio) ? resumeData.portfolio : []), ...(Array.isArray(profile.portfolio) ? profile.portfolio : [])].slice(0, 6), null, 2)}
Social: ${JSON.stringify(profile.socialLinks || {}, null, 2)}

Raw resume text fallback:
---
${resumeText.slice(0, 6000)}
---

Evaluate now and return JSON only — this will be shown to recruiter as first impression with AI matching score.
`.trim();

  return { system, user };
};

export const normalizeEvaluation = (raw) => {
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score ?? raw.overallScore ?? 0))));
  const skillMatchPercent = Math.max(
    0,
    Math.min(100, Math.round(Number(raw.skillMatchPercent ?? score))),
  );

  const normalizeArray = (arr) =>
    Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 10) : [];

  const validExperience = ["high", "medium", "low"].includes(raw.experienceRelevance)
    ? raw.experienceRelevance
    : score >= 80
      ? "high"
      : score >= 50
        ? "medium"
        : "low";

  const validRecommendation = ["strong_yes", "yes", "maybe", "no"].includes(raw.recommendation)
    ? raw.recommendation
    : score >= 85
      ? "strong_yes"
      : score >= 70
        ? "yes"
        : score >= 50
          ? "maybe"
          : "no";

  return {
    score,
    overallScore: score,
    matchedSkills: normalizeArray(raw.matchedSkills),
    missingSkills: normalizeArray(raw.missingSkills),
    strengths: normalizeArray(raw.strengths).slice(0, 5),
    concerns: normalizeArray(raw.concerns).slice(0, 5),
    summary: String(raw.summary || "").trim().slice(0, 1000),
    skillMatchPercent,
    experienceRelevance: validExperience,
    recommendation: validRecommendation,
    atsKeywordsMatched: normalizeArray(raw.atsKeywordsMatched || raw.matchedSkills).slice(0, 10),
    version: EVALUATION_VERSION,
    evaluatedAt: new Date().toISOString(),
  };
};
