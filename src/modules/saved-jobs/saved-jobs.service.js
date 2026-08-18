import {
  findSavedJob,
  insertSavedJob,
  deleteSavedJob,
  getSavedJobCount,
  getSavedJobs,
} from "./saved-jobs.repository.js";

// ============================================
// SAVE JOB
// ============================================

export const saveJob = async (
  userId,
  jobId
) => {
  const existing = await findSavedJob(
    userId,
    jobId
  );

  if (existing) {
    const error = new Error(
      "Job already saved"
    );

    error.statusCode = 409;

    throw error;
  }

  return insertSavedJob(
    userId,
    jobId
  );
};

// ============================================
// UNSAVE JOB
// ============================================

export const unsaveJob = async (
  userId,
  jobId
) => {
  const deleted = await deleteSavedJob(
    userId,
    jobId
  );

  if (!deleted) {
    const error = new Error(
      "Saved job not found"
    );

    error.statusCode = 404;

    throw error;
  }

  return deleted;
};

// ============================================
// GET COUNT
// ============================================

export const getSavedJobsCount = async (
  userId
) => {
  return getSavedJobCount(userId);
};

// ============================================
// GET SAVED JOBS
// ============================================

export const getMySavedJobs = async (
  userId
) => {
  return getSavedJobs(userId);
};