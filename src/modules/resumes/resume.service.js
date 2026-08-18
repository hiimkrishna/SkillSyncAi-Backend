import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import {
  getCandidateProfileIdByUserId,
  getResumesByCandidateId,
  getResumeByIdAndCandidateId,
  insertResume,
  deleteResumeByIdAndCandidateId,
} from "./resume.repository.js";

import { extractPdfText } from "./extraction/pdf.extractor.js";
import { extractDocxText } from "./extraction/docx.extractor.js";
import { extractPdfTextWithOCR } from "./extraction/ocr.extractor.js";

import { parseResume } from "./parsing/resume.parser.js";
import { normalizeResume } from "./parsing/resume.normalizer.js";

import {
  validateResumeFile,
  validateFileSize,
  getFileExtension,
} from "./validation/resume.validation.js";

const UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "resumes"
);

// ============================================
// RESOLVE CANDIDATE
// ============================================

const resolveCandidateProfileId = async (userId) => {
  console.log("[SERVICE] Resolving candidate profile...");

  const candidateId =
    await getCandidateProfileIdByUserId(userId);

  if (!candidateId) {
    const error = new Error(
      "Candidate profile not found"
    );

    error.statusCode = 404;

    throw error;
  }

  console.log(
    "[SERVICE] Candidate profile found:",
    candidateId
  );

  return candidateId;
};

// ============================================
// GET MY RESUMES
// ============================================

export const getMyResumes = async (userId) => {
  const candidateId =
    await resolveCandidateProfileId(userId);

  return getResumesByCandidateId(candidateId);
};

// ============================================
// CREATE RESUME
// ============================================

export const createResume = async ({
  userId,
  file,
}) => {
  console.log("\n========================================");
  console.log("CREATE RESUME STARTED");
  console.log("========================================");

  // Keep the uploaded file path outside the try block
  // so it can safely be cleaned up if anything fails.
  let absolutePath = null;

  try {
    // ========================================
    // VALIDATE FILE
    // ========================================

    console.log("[1] Validating uploaded file...");

    validateResumeFile(file);

    console.log("[2] File validation passed");

    console.log("Filename:", file.filename);
    console.log("Mimetype:", file.mimetype);

    // ========================================
    // RESOLVE CANDIDATE
    // ========================================

    console.log("[3] Resolving candidate...");

    const candidateId =
      await resolveCandidateProfileId(userId);

    console.log(
      "[4] Candidate resolved:",
      candidateId
    );

    // ========================================
    // FILE EXTENSION
    // ========================================

    const extension =
      getFileExtension(file.filename);

    console.log(
      "[5] File extension:",
      extension
    );

    // ========================================
    // BUFFER
    // ========================================

    console.log(
      "[6] Reading uploaded file into buffer..."
    );

    const buffer =
      await file.toBuffer();

    console.log(
      "[7] Buffer received"
    );

    console.log(
      "Buffer size:",
      buffer?.length,
      "bytes"
    );

    if (
      !buffer ||
      buffer.length === 0
    ) {
      const error = new Error(
        "Uploaded resume is empty"
      );

      error.statusCode = 400;

      throw error;
    }

    // ========================================
    // FILE SIZE VALIDATION
    // ========================================

    validateFileSize(buffer.length);

    console.log(
      "[8] File size validation passed"
    );

    // ========================================
    // CREATE UPLOAD DIRECTORY
    // ========================================

    await fs.mkdir(
      UPLOAD_DIR,
      {
        recursive: true,
      }
    );

    console.log(
      "[9] Upload directory ready"
    );

    // ========================================
    // CREATE UNIQUE FILE NAME
    // ========================================

    const uniqueName =
      `${crypto.randomUUID()}${extension}`;

    absolutePath =
      path.join(
        UPLOAD_DIR,
        uniqueName
      );

    const publicUrl =
      `/uploads/resumes/${uniqueName}`;

    console.log(
      "[10] Generated unique filename:",
      uniqueName
    );

    // ========================================
    // SAVE FILE
    // ========================================

    await fs.writeFile(
      absolutePath,
      buffer
    );

    console.log(
      "[11] File successfully saved:",
      absolutePath
    );

    // ========================================
    // TEXT EXTRACTION
    // ========================================

    let rawText = "";

    // ========================================
    // PDF
    // ========================================

    if (extension === ".pdf") {
      console.log("\n========================================");
      console.log("[12] PDF DETECTED");
      console.log("========================================");

      // --------------------------------------
      // NORMAL PDF EXTRACTION
      // --------------------------------------

      console.log(
        "[13] Starting normal PDF text extraction..."
      );

      const extractionStart =
        Date.now();

      rawText =
        await extractPdfText(buffer);

      console.log(
        "[14] Normal PDF extraction completed"
      );

      console.log(
        "Extraction time:",
        `${Date.now() - extractionStart} ms`
      );

      console.log(
        "Extracted text length:",
        rawText?.length
      );

      // --------------------------------------
      // OCR FALLBACK
      // --------------------------------------

      if (
        !rawText ||
        rawText.trim().length < 30
      ) {
        console.log(
          "\n========================================"
        );

        console.log(
          "[15] NORMAL PDF TEXT INSUFFICIENT"
        );

        console.log(
          "Starting PaddleOCR fallback..."
        );

        console.log(
          "========================================"
        );

        const ocrStart =
          Date.now();

        rawText =
          await extractPdfTextWithOCR(
            buffer
          );

        console.log(
          "[16] OCR completed"
        );

        console.log(
          "OCR time:",
          `${Date.now() - ocrStart} ms`
        );

        console.log(
          "OCR text length:",
          rawText?.length
        );
      }
    }

    // ========================================
    // DOCX
    // ========================================

    else if (
      extension === ".docx"
    ) {
      console.log(
        "\n========================================"
      );

      console.log(
        "[12] DOCX DETECTED"
      );

      console.log(
        "========================================"
      );

      console.log(
        "[13] Starting DOCX text extraction..."
      );

      const extractionStart =
        Date.now();

      rawText =
        await extractDocxText(
          buffer
        );

      console.log(
        "[14] DOCX extraction completed"
      );

      console.log(
        "Extraction time:",
        `${Date.now() - extractionStart} ms`
      );

      console.log(
        "Extracted text length:",
        rawText?.length
      );
    }

    // ========================================
    // UNSUPPORTED FILE
    // ========================================

    else {
      const error = new Error(
        `Unsupported resume file type: ${extension}`
      );

      error.statusCode = 400;

      throw error;
    }

    // ========================================
    // VALIDATE EXTRACTED TEXT
    // ========================================

    console.log(
      "\n========================================"
    );

    console.log(
      "[17] VALIDATING EXTRACTED TEXT"
    );

    console.log(
      "========================================"
    );

    if (
      !rawText ||
      rawText.trim().length < 20
    ) {
      const error = new Error(
        "Could not extract enough text from the resume"
      );

      error.statusCode = 422;

      throw error;
    }

    console.log(
      "[18] Text validation passed"
    );

    console.log(
      "Final extracted text length:",
      rawText.length
    );

    console.log(
      "\nFirst 300 characters:"
    );

    console.log(
      rawText.substring(0, 300)
    );

    // ========================================
    // AI PARSING
    // ========================================

    console.log(
      "\n========================================"
    );

    console.log(
      "[19] STARTING RESUME AI PARSING"
    );

    console.log(
      "========================================"
    );

    const aiStart =
      Date.now();

    const parsedResume =
      await parseResume(
        rawText
      );

    console.log(
      "[20] AI PARSING COMPLETED"
    );

    console.log(
      "AI parsing time:",
      `${Date.now() - aiStart} ms`
    );

    // ----------------------------------------
    // DEBUG ONLY
    // ----------------------------------------
    //
    // This JSON is only printed in the backend
    // terminal for development/debugging.
    //
    // It is NOT sent to the frontend.
    //

    console.log(
      "Parsed resume:"
    );

    console.log(
      JSON.stringify(
        parsedResume,
        null,
        2
      )
    );

    // ========================================
    // NORMALIZE
    // ========================================

    console.log(
      "\n========================================"
    );

    console.log(
      "[21] NORMALIZING RESUME"
    );

    console.log(
      "========================================"
    );

    const normalizedResume =
      normalizeResume(
        parsedResume
      );

    console.log(
      "[22] NORMALIZATION COMPLETED"
    );

    // ========================================
    // DATABASE INSERT
    // ========================================

    console.log(
      "\n========================================"
    );

    console.log(
      "[23] INSERTING RESUME INTO DATABASE"
    );

    console.log(
      "========================================"
    );

    const resume =
      await insertResume({
        candidateId,

        fileName:
          file.filename,

        fileUrl:
          publicUrl,

        mimeType:
          file.mimetype,

        fileSize:
          buffer.length,

        rawText,

        resumeData:
          normalizedResume,

        parseStatus:
          "completed",

        parserVersion:
          "2.0",

        parseError:
          null,
      });

    console.log(
      "[24] DATABASE INSERT COMPLETED"
    );

    console.log(
      "Resume ID:",
      resume?.id
    );

    // ========================================
    // SUCCESS
    // ========================================

    console.log(
      "\n========================================"
    );

    console.log(
      "CREATE RESUME SUCCESS"
    );

    console.log(
      "========================================\n"
    );

    return resume;

  } catch (error) {

    // ========================================
    // ERROR
    // ========================================

    console.error(
      "\n========================================"
    );

    console.error(
      "CREATE RESUME FAILED"
    );

    console.error(
      "========================================"
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error stack:",
      error.stack
    );

    // ========================================
    // CLEANUP UPLOADED FILE
    // ========================================

    if (absolutePath) {
      try {
        await fs.unlink(
          absolutePath
        );

        console.log(
          "Uploaded file cleaned up"
        );
      } catch (cleanupError) {
        // Ignore "file not found" because
        // the file may not have been created
        // successfully.
        if (
          cleanupError.code !== "ENOENT"
        ) {
          console.error(
            "Cleanup failed:",
            cleanupError.message
          );
        }
      }
    }

    throw error;
  }
};

// ============================================
// GET ONE RESUME
// ============================================

export const getResumeById = async ({
  userId,
  resumeId,
}) => {
  const candidateId =
    await resolveCandidateProfileId(
      userId
    );

  return getResumeByIdAndCandidateId({
    resumeId,
    candidateId,
  });
};

// ============================================
// DELETE RESUME
// ============================================

export const deleteResume = async ({
  userId,
  resumeId,
}) => {
  const candidateId =
    await resolveCandidateProfileId(
      userId
    );

  const resume =
    await getResumeByIdAndCandidateId({
      resumeId,
      candidateId,
    });

  if (!resume) {
    return false;
  }

  if (resume.fileUrl) {
    const fileName =
      path.basename(
        resume.fileUrl
      );

    const filePath =
      path.join(
        UPLOAD_DIR,
        fileName
      );

    try {
      await fs.unlink(
        filePath
      );
    } catch {
      // File already deleted.
    }
  }

  return deleteResumeByIdAndCandidateId({
    resumeId,
    candidateId,
  });
};