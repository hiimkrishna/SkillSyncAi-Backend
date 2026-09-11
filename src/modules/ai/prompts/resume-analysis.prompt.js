export const RESUME_ANALYSIS_VERSION = "3.0";

export const buildResumeAnalysisPrompt = ({ resumeData, rawText }) => {
  const skills = JSON.stringify(resumeData?.skills || [], null, 2);
  const experience = JSON.stringify(resumeData?.experience || [], null, 2);
  const education = JSON.stringify(resumeData?.education || [], null, 2);
  const certifications = JSON.stringify(resumeData?.certifications || [], null, 2);
  const portfolio = JSON.stringify(resumeData?.portfolio || [], null, 2);
  const headline = resumeData?.headline || resumeData?.summary || "";

  const system = `
You are an expert career coach and ATS resume reviewer for SkillSync AI (tech jobs).

Analyze the candidate's resume and provide actionable feedback to help them fit technology jobs.

STRICT RULES:
- Only use information present in resume. Never invent.
- Use the exact scoring rubric below. Do not use personal judgment to change the weights.
- Scores must be whole numbers from 0 to 100.
- Be concise, supportive, and specific. Use the same evidence consistently.
- If evidence is absent, score that criterion as 0 and mention the gap.
- Return arrays in evidence order and do not repeat items.
- Return ONLY valid JSON, no markdown.

SCORING RUBRIC:
- skills: 0-100 based only on distinct technical skills explicitly listed.
  0 if none, 20 for 1-2, 40 for 3-4, 60 for 5-6, 80 for 7-9, 100 for 10+.
- experience: 0-100 based on relevant experience entries and detail.
  0 if none, 25 for 1 entry, 50 for 2, 70 for 3, 85 for 4, 100 for 5+;
  add no more than 15 points for explicit responsibilities, technologies, and measurable outcomes, capped at 100.
- education: 0 if absent, 50 if an education entry is present, 75 if degree and institution are present, 100 if degree, institution, and dates or result are present.
- formatting: 0-100 based on clear sections, consistent dates, readable bullets, and contact information.
  Start at 0 and add 25 for each of those four elements that is present.
- completeness is the rounded average of the four section scores.
- atsScore and completeness are both the rounded average of the four section scores.
- recommendedSkills and atsKeywordsMissing may include only common technology or job-search terms absent from the resume; never claim the candidate has them.

Required JSON schema (do not add or remove keys):
{
  "atsScore": 72,
  "completeness": 68,
  "strengths": ["Strong React/Next.js experience", "CS degree"],
  "gaps": ["Missing quantifiable achievements", "No cloud skills mentioned"],
  "suggestions": [
    "Add 2-3 bullet points with metrics (e.g., improved performance by 30%)",
    "Include missing tech: Docker, AWS, PostgreSQL if you have them",
    "Add a concise professional summary at top"
  ],
  "recommendedSkills": ["Docker", "AWS", "PostgreSQL", "TypeScript"],
  "summary": "2-3 sentence overall assessment, encouraging but honest.",
  "atsKeywordsMissing": ["CI/CD", "REST APIs"],
  "sectionScores": {
    "skills": 70,
    "experience": 65,
    "education": 80,
    "formatting": 75
  }
}
`.trim();

  const user = `
RESUME TO ANALYZE:
Headline: ${headline}
Skills: ${skills}
Experience: ${experience}
Education: ${education}
Certifications: ${certifications}
Portfolio: ${portfolio}

Raw text (fallback, truncated):
---
${(rawText || "").slice(0, 8000)}
---

Analyze and return JSON only.
`.trim();

  return { system, user };
};

export const normalizeResumeAnalysis = (raw = {}, analysisInputHash = null) => {
  const normalizeArr = (arr) =>
    Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : [];

  const sectionScores = raw.sectionScores && typeof raw.sectionScores === "object" ? raw.sectionScores : {};
  const normalizeSectionScores = {
    skills: Math.max(0, Math.min(100, Math.round(Number(sectionScores.skills ?? 0)))),
    experience: Math.max(0, Math.min(100, Math.round(Number(sectionScores.experience ?? 0)))),
    education: Math.max(0, Math.min(100, Math.round(Number(sectionScores.education ?? 0)))),
    formatting: Math.max(0, Math.min(100, Math.round(Number(sectionScores.formatting ?? 0)))),
  };
  const averageScore = Math.round(
    (normalizeSectionScores.skills +
      normalizeSectionScores.experience +
      normalizeSectionScores.education +
      normalizeSectionScores.formatting) /
    4,
  );

  return {
    atsScore: averageScore,
    completeness: averageScore,
    strengths: normalizeArr(raw.strengths).slice(0, 5),
    gaps: normalizeArr(raw.gaps).slice(0, 5),
    suggestions: normalizeArr(raw.suggestions).slice(0, 6),
    recommendedSkills: normalizeArr(raw.recommendedSkills).slice(0, 10),
    summary: String(raw.summary || "").trim().slice(0, 1000),
    atsKeywordsMissing: normalizeArr(raw.atsKeywordsMissing).slice(0, 10),
    sectionScores: normalizeSectionScores,
    version: RESUME_ANALYSIS_VERSION,
    ...(analysisInputHash ? { analysisInputHash } : {}),
    analyzedAt: new Date().toISOString(),
  };
};

export const fallbackResumeAnalysis = (resumeData, rawText, analysisInputHash = null) => {
  const skills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const exp = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const edu = Array.isArray(resumeData?.education) ? resumeData.education : [];
  const hasSkills = skills.length > 0;
  const hasExp = exp.length > 0;
  const hasEdu = edu.length > 0;
  const textLen = (rawText || "").length;

  const atsScore = Math.min(
    100,
    Math.round(
      (hasSkills ? 30 : 0) +
      (hasExp ? 30 : 0) +
      (hasEdu ? 20 : 0) +
      (textLen > 500 ? 10 : 5) +
      (skills.length >= 5 ? 10 : skills.length * 2),
    ),
  );

  const completeness = Math.round((atsScore * 0.8 + (hasSkills && hasExp && hasEdu ? 20 : 0)));

  const strengths = [];
  if (hasSkills) strengths.push(`Lists ${skills.length} technical skills`);
  if (hasExp) strengths.push(`${exp.length} experience entries found`);
  if (hasEdu) strengths.push("Education background present");
  if (textLen > 800) strengths.push("Detailed resume content");

  const gaps = [];
  if (!hasSkills || skills.length < 5) gaps.push("Add more specific technical skills (aim for 8-12)");
  if (!hasExp) gaps.push("Experience section is sparse — add roles, duration, and achievements");
  if (!hasEdu) gaps.push("Education not detailed");
  if (textLen < 500) gaps.push("Resume is brief — expand with projects and achievements");

  const suggestions = [
    "Add 3-5 quantifiable achievements (e.g., improved performance by 30%, built feature for 10k users)",
    "Include a concise professional summary (2-3 lines) at the top tailored to tech roles",
    "Add missing ATS keywords: Docker, AWS, PostgreSQL, TypeScript, CI/CD if applicable",
    "Use bullet points with action verbs and keep formatting clean for ATS",
  ];

  const recommendedSkills = ["Docker", "AWS", "PostgreSQL", "TypeScript", "REST APIs", "CI/CD"].filter(
    (s) => !skills.map((x) => String(x).toLowerCase()).includes(s.toLowerCase()),
  );

  const atsKeywordsMissing = ["CI/CD", "REST APIs", "Agile"].filter(
    (k) => !(rawText || "").toLowerCase().includes(k.toLowerCase()),
  );

  return normalizeResumeAnalysis({
    atsScore,
    completeness,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
    suggestions,
    recommendedSkills,
    summary:
      "AI analysis is temporarily running on fallback. Your resume has been scored deterministically — follow the suggestions above to improve ATS fit and match more jobs (AI will refine once available).",
    atsKeywordsMissing,
    sectionScores: {
      skills: hasSkills ? Math.min(100, 50 + skills.length * 5) : 30,
      experience: hasExp ? 75 : 30,
      education: hasEdu ? 80 : 40,
      formatting: textLen > 1000 ? 80 : 65,
    },
  }, analysisInputHash);
};
