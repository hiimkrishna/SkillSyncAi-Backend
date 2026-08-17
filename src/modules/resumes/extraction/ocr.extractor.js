import {PaddleOcrService} from "ppu-paddle-ocr";
import { pdf } from "pdf-to-img";

let ocrService = null;
let initializationPromise = null;

// ============================================
// INITIALIZE OCR
// ============================================

const getOCRService = async () => {
  if (ocrService?.isInitialized()) {
    return ocrService;
  }

  if (!initializationPromise) {
    initializationPromise =
      (async () => {
        console.log(
          "Initializing PaddleOCR..."
        );

        const service =
          new PaddleOcrService();

        await service.initialize();

        ocrService = service;

        console.log(
          "PaddleOCR initialized."
        );

        return service;
      })();
  }

  return initializationPromise;
};

// ============================================
// BUFFER -> ARRAY BUFFER
// ============================================

const bufferToArrayBuffer = (
  buffer
) => {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset +
      buffer.byteLength
  );
};

// ============================================
// PDF OCR
// ============================================

export const extractPdfTextWithOCR =
  async (buffer) => {
    if (
      !Buffer.isBuffer(buffer)
    ) {
      throw new Error(
        "A valid PDF buffer is required for OCR"
      );
    }

    const ocr =
      await getOCRService();

    const pages =
      await pdf(buffer, {
        scale: 2,
      });

    const pageTexts = [];

    let pageNumber = 0;

    for await (const page of pages) {
      pageNumber++;

      console.log(
        `OCR processing page ${pageNumber}...`
      );

      /*
       * pdf-to-img may return an image
       * object rather than a Node Buffer.
       *
       * Convert it to PNG Buffer first.
       */

      let imageBuffer;

      if (
        Buffer.isBuffer(page)
      ) {
        imageBuffer = page;
      } else if (
        typeof page?.toBuffer ===
        "function"
      ) {
        imageBuffer =
          page.toBuffer(
            "image/png"
          );
      } else if (
        page instanceof Uint8Array
      ) {
        imageBuffer =
          Buffer.from(page);
      } else {
        throw new Error(
          "Unsupported rendered PDF page format"
        );
      }

      const arrayBuffer =
        bufferToArrayBuffer(
          imageBuffer
        );

      const result =
        await ocr.recognize(
          arrayBuffer
        );

      const text =
        result?.text ||
        "";

      if (text.trim()) {
        pageTexts.push(
          text.trim()
        );
      }

      console.log(
        `Page ${pageNumber} text length: ${text.length}`
      );
    }

    const finalText =
      cleanOCRText(
        pageTexts.join("\n\n")
      );

    console.log(
      "========================================"
    );

    console.log(
      "Final OCR text length:",
      finalText.length
    );

    console.log(
      "========================================"
    );

    return finalText;
  };

// ============================================
// CLEAN OCR TEXT
// ============================================

const cleanOCRText = (
  text
) => {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};