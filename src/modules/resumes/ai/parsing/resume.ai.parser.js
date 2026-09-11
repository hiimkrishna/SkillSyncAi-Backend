// src/modules/resumes/ai/parsing/resume.ai.parser.js

import { createEmptyResume } from "../../parsing/resume.schema.js";
import { callAIJSON } from "../../../ai/ai.client.js";

export const parseResumeWithAI = async (rawText) => {
  if (!rawText || !rawText.trim()) {
    throw new Error("Resume text is empty");
  }

  const emptyResume = createEmptyResume();

  const system = `
You are an expert resume information extraction system.

Your job is to extract structured information from resumes
regardless of formatting, layout, section names, ordering,
tables, columns, or writing style.

Rules:

1. Extract only information explicitly present in the resume.
2. Never invent information.
3. If information is missing, return an empty string or empty array.
4. Different section names should map to the canonical schema.
5. Preserve important details.
6. Extract all skills, education, experience, projects,
   certifications, languages, achievements and references.
7. Keep dates as they appear when possible.
8. Separate multiple jobs, education records and projects.
9. Do not confuse contact information with reference information.
10. Return ONLY valid JSON.

Canonical schema:

${JSON.stringify(emptyResume)}
  `;

  const user = `
Extract structured information from this resume:

--- RESUME START ---

${rawText}

--- RESUME END ---
  `;

  return await callAIJSON({ system, user, temperature: 0 });
};