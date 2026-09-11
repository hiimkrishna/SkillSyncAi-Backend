export const buildInterviewQuestionsPrompt = ({ job, resumeData, rawText, count = 5 }) => {
  const jobDescription = `
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements || "Not specified"}
Type: ${job.type}
`.trim();

  const resumeText = rawText || JSON.stringify(resumeData, null, 2);

  const system = `
You are an expert technical interviewer for SkillSync AI.

Generate tailored interview questions to help a recruiter evaluate this candidate for the specific job.

Rules:
- Questions must be grounded in candidate's resume and job requirements. Never invent resume facts.
- Mix technical, behavioral, and experience-based questions.
- Tailor difficulty to job type/title (junior → fundamentals, senior → system design/leadership).
- Return ONLY valid JSON.
- Each question: { question: string, category: "technical"|"behavioral"|"experience", skill: string, difficulty: "junior"|"mid"|"senior", rationale: string }

Schema:
{
  "questions": [
    { "question": "Explain how you optimize React rendering...", "category": "technical", "skill": "React", "difficulty": "mid", "rationale": "Tests React performance per JD" }
  ]
}
`.trim();

  const user = `
JOB:
---
${jobDescription}
---

CANDIDATE:
Skills: ${JSON.stringify(resumeData?.skills || [], null, 2)}
Experience: ${JSON.stringify(resumeData?.experience || [], null, 2)}
Education: ${JSON.stringify(resumeData?.education || [], null, 2)}
Raw resume:
---
${resumeText.slice(0, 8000)}
---

Generate ${count} questions. Return JSON only.
`.trim();

  return { system, user };
};

export const normalizeQuestions = (raw, count = 5) => {
  const list = Array.isArray(raw.questions) ? raw.questions : Array.isArray(raw) ? raw : [];
  return list
    .slice(0, count)
    .map((q) => ({
      question: String(q.question || q.text || "").trim().slice(0, 500),
      category: ["technical", "behavioral", "experience"].includes(q.category) ? q.category : "technical",
      skill: String(q.skill || "general").trim().slice(0, 50),
      difficulty: ["junior", "mid", "senior"].includes(q.difficulty) ? q.difficulty : "mid",
      rationale: String(q.rationale || "").trim().slice(0, 300),
    }))
    .filter((q) => q.question);
};
