export const buildJobRecommendationPrompt = ({ resumeData, rawText, jobs }) => {
  const resumeSkills = JSON.stringify(resumeData?.skills || [], null, 2);
  const resumeExp = JSON.stringify(resumeData?.experience || [], null, 2);
  const resumeSummary = resumeData?.headline || resumeData?.summary || "";

  const jobsList = jobs
    .slice(0, 30)
    .map(
      (j, idx) => `
[${idx + 1}] id: ${j.id}
Title: ${j.title}
Company: ${j.company}
Type: ${j.type}
Location: ${j.location || "Not specified"}
Description: ${(j.description || "").slice(0, 400)}
Requirements: ${(j.requirements || "").slice(0, 300)}
`,
    )
    .join("\n");

  const system = `
You are a career matching engine for SkillSync AI.

Given a candidate resume and a list of open tech jobs, rank the jobs by best fit.

Rules:
- Use only resume and job info. Never invent.
- Score each job 0-100 for fit (ATS-style).
- For each top job, list matchedSkills (from resume that match JD) and missingSkills, plus 1-sentence reason.
- Return ONLY valid JSON.
- Sort descending by score.
- Return top 5-10 jobs max.

Schema:
{
  "recommendations": [
    {
      "jobId": "uuid",
      "score": 85,
      "matchedSkills": ["React", "Node.js"],
      "missingSkills": ["Docker"],
      "reason": "Strong frontend match, 3 years React, missing Docker can be learned"
    }
  ]
}
`.trim();

  const user = `
RESUME:
Headline: ${resumeSummary}
Skills: ${resumeSkills}
Experience: ${resumeExp}
Raw: ${(rawText || "").slice(0, 6000)}

JOBS (open, from existing job list):
${jobsList}

Rank and return JSON only.
`.trim();

  return { system, user };
};

export const normalizeRecommendations = (raw, jobs) => {
  const list = Array.isArray(raw.recommendations) ? raw.recommendations : Array.isArray(raw) ? raw : [];
  const jobMap = new Map(jobs.map((j) => [String(j.id), j]));
  return list
    .map((r) => {
      const jobId = String(r.jobId || r.id || "");
      const job = jobMap.get(jobId);
      if (!job) return null;
      const score = Math.max(0, Math.min(100, Math.round(Number(r.score ?? 0))));
      const normalizeArr = (arr) =>
        Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : [];
      return {
        jobId,
        score,
        matchedSkills: normalizeArr(r.matchedSkills),
        missingSkills: normalizeArr(r.missingSkills),
        reason: String(r.reason || r.explanation || "").trim().slice(0, 500),
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          requirements: job.requirements,
          status: job.status,
          salary: job.salary,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applicationDeadline: job.applicationDeadline,
          createdAt: job.createdAt,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

// Fallback deterministic scorer (no AI) — Jaccard on skills + title keywords
export const fallbackRecommendations = (resumeData, jobs) => {
  const resumeSkills = new Set(
    (Array.isArray(resumeData?.skills) ? resumeData.skills : [])
      .map((s) => String(typeof s === "string" ? s : s?.name || s?.skill || "").toLowerCase().trim())
      .filter(Boolean),
  );

  return jobs
    .map((job) => {
      const jdText = `${job.title} ${job.description || ""} ${job.requirements || ""}`.toLowerCase();
      const jdSkills = jdText.match(/[a-z0-9#+.]+/g) || [];
      // Extract tech keywords heuristically: intersection with resume skills
      let matched = 0;
      const matchedSkills = [];
      const missingSkills = [];
      for (const skill of resumeSkills) {
        if (jdText.includes(skill)) {
          matched++;
          matchedSkills.push(skill);
        }
      }
      // Simple score: 40% skills overlap + 30% title match + 30% description length heuristic
      const titleMatch = resumeSkills.size > 0 && [...resumeSkills].some((s) => job.title.toLowerCase().includes(s)) ? 20 : 0;
      const skillScore = resumeSkills.size > 0 ? (matched / Math.max(1, resumeSkills.size)) * 60 : 0;
      const score = Math.round(Math.min(100, skillScore + titleMatch + 10));

      // Heuristic missing: words in requirements not in resume
      const reqWords = (job.requirements || "").split(/[,;|\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
      for (const w of reqWords) {
        const lw = w.toLowerCase();
        if (lw && !resumeSkills.has(lw) && !jdText.includes(lw.slice(0, 4))) missingSkills.push(w);
      }

      return {
        jobId: job.id,
        score,
        matchedSkills: matchedSkills.slice(0, 5),
        missingSkills: missingSkills.slice(0, 5),
        reason: matchedSkills.length
          ? `Matches ${matchedSkills.slice(0, 3).join(", ")}; good fit for ${job.title}`
          : `Potential fit for ${job.title} based on experience`,
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          requirements: job.requirements,
          status: job.status,
          salary: job.salary,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applicationDeadline: job.applicationDeadline,
          createdAt: job.createdAt,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};
