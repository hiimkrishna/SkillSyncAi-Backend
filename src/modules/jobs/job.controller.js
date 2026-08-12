import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from "./job.service.js";

export const getAllJobs = async (request, reply) => {
  try {
    const {
      search,
      location,
      type,
      status,
    } = request.query;

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

export const getSingleJob = async (
  request,
  reply
) => {
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

export const createNewJob = async (
  request,
  reply
) => {
  try {
    const recruiterId = request.user.userId;

    const job = await createJob(
      recruiterId,
      request.body
    );

    return reply.code(201).send({
      success: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to create job",
    });
  }
};

export const updateExistingJob = async (
  request,
  reply
) => {
  try {
    const recruiterId = request.user.userId;
    const { id } = request.params;

    const job = await updateJob(
      id,
      recruiterId,
      request.body
    );

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

    return reply.code(500).send({
      success: false,
      message: "Failed to update job",
    });
  }
};

export const removeJob = async (
  request,
  reply
) => {
  try {
    const recruiterId = request.user.userId;
    const { id } = request.params;

    const job = await deleteJob(
      id,
      recruiterId
    );

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