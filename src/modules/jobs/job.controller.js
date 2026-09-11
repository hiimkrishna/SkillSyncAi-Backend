import {
  getJobs,
  getJobById,
  getRecruiterJobs,
  getRecruiterJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
} from "./job.service.js";

// ============================================
// GET ALL PUBLIC JOBS
// ============================================

export const getAllJobs = async (request, reply) => {
  try {
    const { search, location, type, status } = request.query;

    const jobs = await getJobs({
      search,
      location,
      type,
      status,
    });

    return reply.code(200).send({
      success: true,
      jobs,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

// ============================================
// GET SINGLE PUBLIC JOB
// ============================================

export const getSingleJob = async (request, reply) => {
  try {
    const { id } = request.params;

    const job = await getJobById(id);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: "Job not found",
      });
    }

    return reply.code(200).send({
      success: true,
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to fetch job",
    });
  }
};

import {
  getMatchedJobsForCandidate,
  MATCH_DEFAULT_LIMIT,
} from "./job.match.service.js";

// ============================================
// GET MATCHED JOBS (candidate AI Job Match)
// GET /api/jobs/match?limit=20
// ============================================

export const getMatchedJobs = async (request, reply) => {
  try {
    const userId = request.user.userId;

    const { limit, useAi } = request.query || {};

    const matches = await getMatchedJobsForCandidate(
      userId,
      limit ? Number(limit) : MATCH_DEFAULT_LIMIT,
      useAi,
    );

    return reply.code(200).send({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    request.log.error(error);

    if (error.statusCode === 404) {
      return reply.code(404).send({
        success: false,
        message: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Failed to load matched jobs",
    });
  }
};

// ============================================
// GET MY JOBS
// ============================================

export const getMyJobs = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { search, location, type, status } = request.query;

    const jobs = await getRecruiterJobs(recruiterId, {
      search,
      location,
      type,
      status,
    });

    return reply.code(200).send({
      success: true,
      jobs,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to fetch recruiter jobs",
    });
  }
};

// ============================================
// GET MY SINGLE JOB
// ============================================

export const getMySingleJob = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id } = request.params;

    const job = await getRecruiterJobById(id, recruiterId);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: "Job not found",
      });
    }

    return reply.code(200).send({
      success: true,
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to fetch recruiter job",
    });
  }
};

// ============================================
// CREATE JOB
// ============================================

export const createNewJob = async (request, reply) => {
  try {
    // IMPORTANT:
    // Never take recruiterId
    // from request.body.

    const recruiterId = request.user.userId;

    const job = await createJob(recruiterId, request.body);

    return reply.code(201).send({
      success: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to create job",
    });
  }
};

// ============================================
// UPDATE JOB
// ============================================

export const updateExistingJob = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id } = request.params;

    const job = await updateJob(id, recruiterId, request.body);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: "Job not found",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to update job",
    });
  }
};

// ============================================
// UPDATE JOB STATUS
// ============================================

export const updateJobStatusController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id } = request.params;

    const { status } = request.body;

    const job = await updateJobStatus(id, recruiterId, status);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: "Job not found",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Job status updated successfully",
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to update job status",
    });
  }
};

// ============================================
// DELETE JOB
// ============================================

export const removeJob = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id } = request.params;

    const job = await deleteJob(id, recruiterId);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: "Job not found",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to delete job",
    });
  }
};
