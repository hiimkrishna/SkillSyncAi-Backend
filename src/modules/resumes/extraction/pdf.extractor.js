import { PDFParse } from "pdf-parse";

export const extractPdfText = async (
  buffer
) => {
  if (
    !buffer ||
    !Buffer.isBuffer(buffer)
  ) {
    throw new Error(
      "A valid PDF buffer is required"
    );
  }

  const parser =
    new PDFParse({
      data: buffer,
    });

  try {
    const result =
      await parser.getText();

    const text =
      result?.text || "";

    console.log(
      "PDF pages:",
      result?.total || 0
    );

    console.log(
      "PDF text length:",
      text.length
    );

    return cleanText(text);
  } finally {
    await parser.destroy();
  }
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