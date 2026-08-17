import { eq, and, desc } from "drizzle-orm";

import { db } from "../../db/index.js";
import { resumes } from "../../db/schema/resumes.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";

// ============================================
// GET CANDIDATE PROFILE ID
// ============================================

export const getCandidateProfileIdByUserId = async (userId) => {
  const result = await db
    .select({
      id: candidateProfiles.id,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  return result[0]?.id || null;
};

// ============================================
// GET ALL RESUMES
// ============================================

export const getResumesByCandidateId = async (candidateId) => {
  return db
    .select()
    .from(resumes)
    .where(eq(resumes.candidateId, candidateId))
    .orderBy(desc(resumes.createdAt));
};

// ============================================
// GET ONE RESUME
// ============================================

export const getResumeByIdAndCandidateId = async ({
  resumeId,
  candidateId,
}) => {
  const result = await db
    .select()
    .from(resumes)
    .where(
      and(
        eq(resumes.id, resumeId),
        eq(resumes.candidateId, candidateId)
      )
    )
    .limit(1);

  return result[0] || null;
};

// ============================================
// INSERT RESUME
// ============================================

export const insertResume = async ({
  candidateId,
  fileName,
  fileUrl,
  mimeType,
  fileSize,
  rawText,
  resumeData,
  parseStatus,
  parserVersion,
  parseError,
}) => {
  const result = await db
    .insert(resumes)
    .values({
      candidateId,
      fileName,
      fileUrl,
      mimeType,
      fileSize,
      rawText,
      resumeData,
      parseStatus,
      parserVersion,
      parseError,
    })
    .returning();

  return result[0];
};

// ============================================
// DELETE RESUME
// ============================================

export const deleteResumeByIdAndCandidateId = async ({
  resumeId,
  candidateId,
}) => {
  const result = await db
    .delete(resumes)
    .where(
      and(
        eq(resumes.id, resumeId),
        eq(resumes.candidateId, candidateId)
      )
    )
    .returning({
      id: resumes.id,
    });

  return result.length > 0;
};