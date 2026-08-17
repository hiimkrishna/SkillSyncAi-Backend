// src/modules/resumes/ai/parsing/resume.ai.parser.js

import OpenAI from "openai";
import { createEmptyResume } from "../../parsing/resume.schema.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const parseResumeWithAI = async (rawText) => {
  if (!rawText || !rawText.trim()) {
    throw new Error("Resume text is empty");
  }

  const emptyResume = createEmptyResume();

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    temperature: 0,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: `
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
        `,
      },
      {
        role: "user",
        content: `
Extract structured information from this resume:

--- RESUME START ---

${rawText}

--- RESUME END ---
        `,
      },
    ],
  });

  const content =
    response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "AI resume parser returned empty response"
    );
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(
      "AI resume parser returned invalid JSON"
    );
  }
};