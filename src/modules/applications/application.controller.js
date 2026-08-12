// src/modules/applications/application.controller.js

import {
  applyToJob,
  getMyApplications,
  getRecruiterApplications,
  getApplicationById,
  updateApplicationStatus,
} from "./application.service.js";

// ============================================
// APPLY TO JOB
// ============================================

export const applyToJobController = async (request, reply) => {
  try {
    const { jobId } = request.body;

    const candidateId = request.user.userId;

    if (!jobId) {
      return reply.code(400).send({
        success: false,
        message: "Job ID is required",
      });
    }

    const application = await applyToJob(candidateId, jobId);

    return reply.code(201).send({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(400).send({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET MY APPLICATIONS - CANDIDATE
// ============================================

export const getMyApplicationsController = async (request, reply) => {
  try {
    const candidateId = request.user.userId;

    const applications = await getMyApplications(candidateId);

    return reply.code(200).send({
      success: true,
      data: applications,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(400).send({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET RECRUITER APPLICATIONS
// ============================================

export const getRecruiterApplicationsController = async (
  request,
  reply,
) => {
  try {
    const recruiterId = request.user.userId;

    const applications = await getRecruiterApplications(recruiterId);

    return reply.code(200).send({
      success: true,
      data: applications,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(400).send({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// GET SINGLE APPLICATION
// ============================================

export const getApplicationController = async (request, reply) => {
  try {
    const { id } = request.params;

    const application = await getApplicationById(
      id,
      request.user.userId,
      request.user.role,
    );

    if (!application) {
      return reply.code(404).send({
        success: false,
        message: "Application not found",
      });
    }

    return reply.code(200).send({
      success: true,
      data: application,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(400).send({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPDATE APPLICATION STATUS
// ============================================

export const updateApplicationStatusController = async (
  request,
  reply,
) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    if (!status) {
      return reply.code(400).send({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = [
      "pending",
      "screening",
      "interview",
      "offer",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return reply.code(400).send({
        success: false,
        message: "Invalid application status",
      });
    }

    const application = await updateApplicationStatus(
      id,
      request.user.userId,
      request.user.role,
      status,
    );

    return reply.code(200).send({
      success: true,
      message: "Application status updated successfully",
      data: application,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(400).send({
      success: false,
      message: error.message,
    });
  }
};