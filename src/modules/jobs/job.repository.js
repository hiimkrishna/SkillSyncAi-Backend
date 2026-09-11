// src/modules/jobs/job.repository.js
// Data access only — no scoring, no HTTP, no auth.

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { resumes } from "../../db/schema/resumes.js";

// ============================================
// OPEN JOBS (candidate browsing pool)
// ============================================

export const findOpenJobs = async (maxRows = 50) => {
  const safeLimit = Math.min(Math.max(Number(maxRows) || 50, 1), 100);

  return db
    .select()
    .from(jobs)
    .where(and(isNull(jobs.deletedAt), eq(jobs.status, "open")))
    .orderBy(desc(jobs.createdAt))
    .limit(safeLimit);
};

// ============================================
// CANDIDATE PROFILE BY USER ID
// ============================================

export const findCandidateProfileByUserId = async (userId) => {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(
      and(
        eq(candidateProfiles.userId, userId),
        isNull(candidateProfiles.deletedAt),
      ),
    )
    .limit(1);

  return profile ?? null;
};

// ============================================
// LATEST RESUME FOR CANDIDATE PROFILE
// ============================================

export const findLatestResumeByCandidateId = async (candidateId) => {
  const [resume] = await db
    .select({
      id: resumes.id,
      rawText: resumes.rawText,
      resumeData: resumes.resumeData,
      fileName: resumes.fileName,
      parseStatus: resumes.parseStatus,
    })
    .from(resumes)
    .where(
      and(
        eq(resumes.candidateId, candidateId),
        isNull(resumes.deletedAt),
      ),
    )
    .orderBy(desc(resumes.createdAt))
    .limit(1);

  return resume ?? null;
};
