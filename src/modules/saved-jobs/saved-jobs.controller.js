import {
  saveJob,
  unsaveJob,
  getMySavedJobs,
} from "./saved-jobs.service.js";

// ============================================
// SAVE JOB
// POST /api/saved-jobs/:jobId
// ============================================

export const saveJobController = async (
  request,
  reply
) => {
  try {
    const { jobId } = request.params;
    const userId = request.user.userId;

    if (!jobId) {
      return reply.code(400).send({
        message: "Job ID is required",
      });
    }

    const savedJob = await saveJob(
      userId,
      jobId
    );

    return reply.code(201).send({
      success: true,
      message: "Job saved successfully",
      data: savedJob,
    });
  } catch (error) {
    request.log.error(error);

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// UNSAVE JOB
// DELETE /api/saved-jobs/:jobId
// ============================================

export const unsaveJobController = async (
  request,
  reply
) => {
  try {
    const { jobId } = request.params;
    const userId = request.user.userId;

    if (!jobId) {
      return reply.code(400).send({
        message: "Job ID is required",
      });
    }

    await unsaveJob(
      userId,
      jobId
    );

    return reply.code(200).send({
      success: true,
      message: "Job removed from saved jobs",
    });
  } catch (error) {
    request.log.error(error);

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// GET MY SAVED JOBS
// GET /api/saved-jobs
// ============================================

export const getMySavedJobsController = async (
  request,
  reply
) => {
  try {
    const userId = request.user.userId;

    const savedJobs =
      await getMySavedJobs(userId);

    return reply.code(200).send({
      success: true,
      data: savedJobs,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: error.message,
      detail: error.cause?.message,
    });
  }
};