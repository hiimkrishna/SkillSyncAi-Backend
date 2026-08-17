import mammoth from "mammoth";

export const extractDocxText = async (
  buffer
) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "DOCX input must be a Buffer"
    );
  }

  const result =
    await mammoth.extractRawText({
      buffer,
    });

  return cleanText(
    result.value
  );
};

const cleanText = (text) => {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};