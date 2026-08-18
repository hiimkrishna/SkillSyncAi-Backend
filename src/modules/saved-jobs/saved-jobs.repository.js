import {
  eq,
  and,
  count,
  desc,
} from "drizzle-orm";

import { db } from "../../db/index.js";

import { savedJobs } from "../../db/schema/saved-jobs.js";
import { jobs } from "../../db/schema/jobs.js";

// ============================================
// FIND SAVED JOB
// ============================================

export const findSavedJob = async (
  userId,
  jobId
) => {
  const [savedJob] = await db
    .select()
    .from(savedJobs)
    .where(
      and(
        eq(savedJobs.userId, userId),
        eq(savedJobs.jobId, jobId)
      )
    )
    .limit(1);

  return savedJob ?? null;
};

// ============================================
// SAVE JOB
// ============================================

export const insertSavedJob = async (
  userId,
  jobId
) => {
  const [savedJob] = await db
    .insert(savedJobs)
    .values({
      userId,
      jobId,
    })
    .returning();

  return savedJob;
};

// ============================================
// UNSAVE JOB
// ============================================

export const deleteSavedJob = async (
  userId,
  jobId
) => {
  const [deleted] = await db
    .delete(savedJobs)
    .where(
      and(
        eq(savedJobs.userId, userId),
        eq(savedJobs.jobId, jobId)
      )
    )
    .returning();

  return deleted ?? null;
};

// ============================================
// GET SAVED JOB COUNT
// ============================================

export const getSavedJobCount = async (
  userId
) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(savedJobs)
    .where(
      eq(savedJobs.userId, userId)
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET SAVED JOBS
// ============================================

export const getSavedJobs = async (
  userId
) => {
  const result = await db
    .select({
      savedJobId: savedJobs.id,
      jobId: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      type: jobs.type,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      savedAt: savedJobs.createdAt,
    })
    .from(savedJobs)
    .innerJoin(
      jobs,
      eq(savedJobs.jobId, jobs.id)
    )
    .where(
      eq(savedJobs.userId, userId)
    )
    .orderBy(
      desc(savedJobs.createdAt)
    );

  return result;
};