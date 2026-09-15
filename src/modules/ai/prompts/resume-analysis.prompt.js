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
- atsScore measures keyword coverage against common tech terms PLUS overall
  quality: round(0.6 * keywordCoverage + 0.4 * completeness), where
  keywordCoverage = min(100, matchedKeywords * 10). It is NOT the average.
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

  // ATS and completeness are DIFFERENT metrics: completeness is section
  // presence, ATS blends in keyword coverage. Honor an explicit atsScore
  // (fallback + rubric both provide it) instead of duplicating the average.
  const atsScore = Number.isFinite(Number(raw.atsScore))
    ? Math.max(0, Math.min(100, Math.round(Number(raw.atsScore))))
    : averageScore;

  return {
    atsScore,
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

// Common tech terms for keyword-coverage scoring. Scanned against the
// resume's skills + full text; absent terms drive gaps/suggestions.
const TECH_LEXICON = [
  "javascript", "typescript", "python", "java", "go", "c#", "php", "ruby",
  "react", "next.js", "node.js", "express", "fastapi", "django",
  "postgresql", "mysql", "mongodb", "redis",
  "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "git",
  "rest", "graphql", "agile", "testing", "linux", "figma",
];

const scanKeywords = (skills, text) => {
  const skillSet = new Set(
    skills.map((s) => String(typeof s === "string" ? s : s?.name ?? "").toLowerCase().trim()),
  );
  const haystack = `${[...skillSet].join(" ")} ${(text || "").toLowerCase()}`;
  const matched = [];
  const missing = [];
  for (const term of TECH_LEXICON) {
    if (haystack.includes(term)) matched.push(term);
    else missing.push(term);
  }
  return { matched, missing };
};

const hasMetrics = (entries, text) => {
  const blob = `${JSON.stringify(entries ?? [])} ${text || ""}`;
  return /(\d+\s?%|\$\s?\d|\d+\s?(users|ms|s\b|million|thousand|k\b|x\b))/i.test(blob);
};

const entryText = (e) => {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    return [e.role, e.title, e.company, e.period, e.description, e.summary]
      .filter(Boolean)
      .join(" ");
  }
  return "";
};

export const fallbackResumeAnalysis = (resumeData, rawText, analysisInputHash = null) => {
  const skills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const exp = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const edu = Array.isArray(resumeData?.education) ? resumeData.education : [];
  const text = rawText || "";
  const textLen = text.length;
  const lower = text.toLowerCase();

  // ---- granular section scores (every resume lands somewhere unique) ----
  const skillsScore = skills.length === 0
    ? 0
    : Math.min(100, Math.round(skills.length * 9));

  let experienceScore = 0;
  if (exp.length > 0) {
    experienceScore = Math.min(100, 20 + exp.length * 18);
    const detailChars = exp.reduce((n, e) => n + entryText(e).length, 0);
    if (detailChars > 300) experienceScore = Math.min(100, experienceScore + 8);
    if (hasMetrics(exp, text)) experienceScore = Math.min(100, experienceScore + 12);
  }

  let educationScore = 0;
  if (edu.length > 0) {
    educationScore = 40;
    const e0 = edu[0];
    if (e0 && typeof e0 === "object") {
      if (e0.degree) educationScore += 20;
      if (e0.institution) educationScore += 20;
      if (e0.year || e0.grade || e0.gpa) educationScore += 10;
      if (edu.length > 1) educationScore += 5;
    } else {
      educationScore += 20;
    }
    educationScore = Math.min(100, educationScore);
  }

  let formattingScore = 0;
  if (/[•\-\*]\s+\w/.test(text)) formattingScore += 25; // bullets
  if (/\S+@\S+\.\S+/.test(text) || /\+?\d[\d\s\-]{7,}\d/.test(text)) formattingScore += 25; // contact
  if (/experience/i.test(text) && /education|skills/i.test(text)) formattingScore += 25; // sections
  if (textLen > 800) formattingScore += 15;
  if (resumeData?.headline || resumeData?.summary) formattingScore += 10;
  formattingScore = Math.min(100, formattingScore);

  const completeness = Math.round(
    (skillsScore + experienceScore + educationScore + formattingScore) / 4,
  );

  // ---- ATS: keyword coverage blended with overall quality ----
  const { matched, missing } = scanKeywords(skills, text);
  const keywordCoverage = Math.min(100, matched.length * 10);
  const atsScore = Math.round(keywordCoverage * 0.6 + completeness * 0.4);

  // ---- data-driven strengths / gaps / suggestions ----
  const strengths = [];
  if (skills.length > 0) strengths.push(`Lists ${skills.length} skills (${matched.slice(0, 3).join(", ") || "general"})`);
  if (exp.length > 0) strengths.push(`${exp.length} experience ${exp.length === 1 ? "entry" : "entries"} found`);
  if (hasMetrics(exp, text)) strengths.push("Quantifies impact with numbers");
  if (educationScore >= 60) strengths.push("Education background present");
  if (textLen > 800) strengths.push("Detailed resume content");

  const gaps = [];
  if (skills.length < 8) gaps.push(`Only ${skills.length} skills listed — aim for 8-12 technical skills`);
  if (exp.length === 0) gaps.push("No experience entries — add roles, duration, and achievements");
  if (!hasMetrics(exp, text)) gaps.push("No measurable achievements detected — add numbers (%, users, time saved)");
  if (educationScore < 60) gaps.push("Education lacks degree/institution/dates");

  const topMissing = missing.slice(0, 4);
  const suggestions = [];
  if (!hasMetrics(exp, text)) {
    suggestions.push("Add 3-5 quantifiable achievements (e.g., improved performance by 30%, built feature for 10k users)");
  }
  if (!resumeData?.headline && !resumeData?.summary) {
    suggestions.push("Include a concise professional summary (2-3 lines) at the top tailored to tech roles");
  }
  if (topMissing.length > 0) {
    suggestions.push(`Add missing ATS keywords if applicable: ${topMissing.map((t) => t.toUpperCase()).join(", ")}`);
  }
  suggestions.push("Use bullet points with action verbs and keep formatting clean for ATS");

  return normalizeResumeAnalysis({
    atsScore,
    completeness,
    strengths: strengths.slice(0, 5),
    gaps: gaps.slice(0, 5),
    suggestions: suggestions.slice(0, 6),
    recommendedSkills: missing
      .filter((t) => !["rest", "testing", "linux", "figma"].includes(t))
      .slice(0, 6)
      .map((t) => t.toUpperCase()),
    summary:
      "AI analysis is temporarily running on fallback. Your resume has been scored deterministically — follow the suggestions above to improve ATS fit and match more jobs (AI will refine once available).",
    atsKeywordsMissing: topMissing.map((t) => t.toUpperCase()),
    sectionScores: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      formatting: formattingScore,
    },
  }, analysisInputHash);
};
