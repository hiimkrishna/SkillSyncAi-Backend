export const buildResumeParsingPrompt = ({
  schema,
  rawText,
}) => `
You are an expert resume information extraction system.

Extract structured information from the resume.

IMPORTANT RULES:

- Support arbitrary resume layouts.
- Support different section names.
- Support one-column and multi-column extracted text.
- Support tables.
- Support resumes with missing sections.
- Support resumes without explicit section headings.
- Never invent information.
- Only extract information present in the resume.
- Preserve original meaning.
- Return empty values when information is unavailable.
- Extract ALL relevant records.
- Return ONLY valid JSON.

Canonical schema:

${JSON.stringify(schema, null, 2)}

Resume:

--- START RESUME ---

${rawText}

--- END RESUME ---
`;