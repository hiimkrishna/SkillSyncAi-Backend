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
  const candidateId =
    await getCandidateProfileIdByUserId(userId);

  if (!candidateId) {
    const error = new Error(
      "Candidate profile not found"
    );

    error.statusCode = 404;

    throw error;
  }

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
  validateResumeFile(file);

  const candidateId =
    await resolveCandidateProfileId(userId);

  const extension =
    getFileExtension(file.filename);

  const buffer = await file.toBuffer();

  if (!buffer || buffer.length === 0) {
    const error = new Error(
      "Uploaded resume is empty"
    );

    error.statusCode = 400;

    throw error;
  }

  validateFileSize(buffer.length);

  await fs.mkdir(UPLOAD_DIR, {
    recursive: true,
  });

  const uniqueName =
    `${crypto.randomUUID()}${extension}`;

  const absolutePath =
    path.join(
      UPLOAD_DIR,
      uniqueName
    );

  const publicUrl =
    `/uploads/resumes/${uniqueName}`;

  await fs.writeFile(
    absolutePath,
    buffer
  );

  try {
    // ========================================
    // TEXT EXTRACTION
    // ========================================

    let rawText = "";

    if (extension === ".pdf") {
      console.log(
        "========================================"
      );

      console.log(
        "PDF resume detected"
      );

      // --------------------------------------
      // NORMAL PDF TEXT
      // --------------------------------------

      rawText =
        await extractPdfText(buffer);

      console.log(
        "Normal PDF text length:",
        rawText.length
      );

      // --------------------------------------
      // OCR FALLBACK
      // --------------------------------------

      if (
        !rawText ||
        rawText.trim().length < 30
      ) {
        console.log(
          "PDF text insufficient."
        );

        console.log(
          "Starting PaddleOCR fallback..."
        );

        rawText =
          await extractPdfTextWithOCR(
            buffer
          );
      }
    }

    // ========================================
    // DOCX
    // ========================================

    else if (extension === ".docx") {
      rawText =
        await extractDocxText(buffer);
    }

    // ========================================
    // VALIDATE TEXT
    // ========================================

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
      "Final extracted text length:",
      rawText.length
    );

    // ========================================
    // PARSE
    // ========================================

    const parsedResume =
      await parseResume(rawText);

    // ========================================
    // NORMALIZE
    // ========================================

    const normalizedResume =
      normalizeResume(parsedResume);

    // ========================================
    // STORE
    // ========================================

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

    return resume;
  } catch (error) {
    try {
      await fs.unlink(
        absolutePath
      );
    } catch {
      // ignore cleanup failure
    }

    throw error;
  }
};

// ============================================
// GET ONE
// ============================================

export const getResumeById = async ({
  userId,
  resumeId,
}) => {
  const candidateId =
    await resolveCandidateProfileId(userId);

  return getResumeByIdAndCandidateId({
    resumeId,
    candidateId,
  });
};

// ============================================
// DELETE
// ============================================

export const deleteResume = async ({
  userId,
  resumeId,
}) => {
  const candidateId =
    await resolveCandidateProfileId(userId);

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
      // file already deleted
    }
  }

  return deleteResumeByIdAndCandidateId({
    resumeId,
    candidateId,
  });
};