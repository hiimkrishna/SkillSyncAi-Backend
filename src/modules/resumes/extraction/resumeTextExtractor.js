import { extractPdfText } from "./pdf.extractor.js";
import { extractDocxText } from "./docx.extractor.js";
import { extractPdfTextWithOCR } from "./ocr.extractor.js";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const detectResumeMimeType = (
  buffer,
  mimeType = null
) => {
  if (mimeType) {
    const normalized = String(mimeType).toLowerCase();

    if (
      normalized.includes("pdf") ||
      normalized === PDF_MIME
    ) {
      return PDF_MIME;
    }

    if (
      normalized.includes("docx") ||
      normalized.includes("wordprocessingml") ||
      normalized === DOCX_MIME
    ) {
      return DOCX_MIME;
    }
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    return "unknown";
  }

  const header = buffer
    .subarray(0, 8)
    .toString("hex")
    .toLowerCase();

  if (header.startsWith("25504446")) {
    return PDF_MIME;
  }

  if (header.startsWith("504b0304")) {
    return DOCX_MIME;
  }

  return "unknown";
};

export const extractTextFromResume = async (
  buffer,
  mimeType = null
) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error(
      "A valid resume buffer is required"
    );
  }

  const type = detectResumeMimeType(
    buffer,
    mimeType
  );

  if (type === DOCX_MIME) {
    console.log(
      "Extracting text from DOCX..."
    );
    return extractDocxText(buffer);
  }

  if (type === PDF_MIME) {
    console.log(
      "Attempting standard PDF extraction..."
    );

    let text = await extractPdfText(buffer);

    if (
      !text ||
      text.trim().length < 30
    ) {
      console.log(
        "Standard PDF extraction was weak, falling back to OCR..."
      );
      text = await extractPdfTextWithOCR(buffer);
    }

    return text;
  }

  throw new Error(
    "Unsupported file format. Please provide a PDF or DOCX."
  );
};
