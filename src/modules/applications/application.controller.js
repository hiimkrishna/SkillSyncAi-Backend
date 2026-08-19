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
// POST /api/applications
// ============================================

export const applyToJobController = async (request, reply) => {
  try {
    const { jobId } = request.body || {};
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

    return reply.code(error.statusCode || 400).send({
      success: false,
      message: error.message || "Failed to apply for job",
    });
  }
};

// ============================================
// GET MY APPLICATIONS
// GET /api/applications/my
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

    return reply.code(error.statusCode || 400).send({
      success: false,
      message: error.message || "Failed to fetch applications",
    });
  }
};

// ============================================
// GET RECRUITER APPLICATIONS
// GET /api/applications/recruiter
// ============================================

export const getRecruiterApplicationsController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const applications = await getRecruiterApplications(recruiterId);

    return reply.code(200).send({
      success: true,
      data: applications,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 400).send({
      success: false,
      message: error.message || "Failed to fetch recruiter applications",
    });
  }
};

// ============================================
// GET SINGLE APPLICATION
// GET /api/applications/:id
// ============================================

export const getApplicationController = async (request, reply) => {
  try {
    const { id } = request.params || {};

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: "Application ID is required",
      });
    }

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

    return reply.code(error.statusCode || 400).send({
      success: false,
      message: error.message || "Failed to fetch application",
    });
  }
};

// ============================================
// UPDATE APPLICATION
// PATCH /api/applications/:id/status
// ============================================

export const updateApplicationStatusController = async (request, reply) => {
  try {
    const { id } = request.params || {};

    const {
      status,
      rejectionReason,
      shortlistNotes,
      shortlistPriority,
      interviewDetails,
      offerDetails,
    } = request.body || {};

    // ============================================
    // VALIDATE APPLICATION ID
    // ============================================

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: "Application ID is required",
      });
    }

    // ============================================
    // VALIDATE STATUS
    // ============================================

    if (!status) {
      return reply.code(400).send({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = [
      "pending",
      "screening",
      "shortlisted",
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

    // ============================================
    // ONLY RECRUITER CAN UPDATE
    // ============================================

    if (request.user.role !== "recruiter") {
      return reply.code(403).send({
        success: false,
        message: "Only recruiters can update application status",
      });
    }

    // ============================================
    // STATUS-SPECIFIC VALIDATION
    // ============================================

    if (status === "rejected") {
      if (!rejectionReason?.trim()) {
        return reply.code(400).send({
          success: false,
          message: "Rejection reason is required",
        });
      }
    }

    if (status === "shortlisted") {
      if (
        shortlistPriority &&
        !["low", "medium", "high", "urgent"].includes(shortlistPriority)
      ) {
        return reply.code(400).send({
          success: false,
          message: "Invalid shortlist priority",
        });
      }
    }

    // ============================================
    // UPDATE APPLICATION
    // ============================================

    const application = await updateApplicationStatus(
      id,
      request.user.userId,
      request.user.role,
      {
        status,
        rejectionReason,
        shortlistNotes,
        shortlistPriority,
        interviewDetails,
        offerDetails,
      },
    );

    if (!application) {
      return reply.code(404).send({
        success: false,
        message: "Application not found",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Application updated successfully",
      data: application,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 400).send({
      success: false,
      message: error.message || "Failed to update application",
    });
  }
};
