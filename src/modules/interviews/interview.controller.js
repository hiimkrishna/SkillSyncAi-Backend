import {
  scheduleInterview,
  getRecruiterInterviews,
  getRecruiterInterviewById,
  rescheduleInterview,
  cancelRecruiterInterview,
  completeRecruiterInterview,
} from "./interview.service.js";

// ============================================
// SCHEDULE INTERVIEW
// POST /api/interviews
// ============================================

export const scheduleInterviewController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const interview = await scheduleInterview(recruiterId, request.body);

    return reply.code(201).send({
      success: true,
      message: "Interview scheduled successfully",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to schedule interview",
    });
  }
};

// ============================================
// GET RECRUITER INTERVIEWS
// GET /api/interviews/recruiter
// ============================================

export const getRecruiterInterviewsController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const interviews = await getRecruiterInterviews(recruiterId);

    return reply.code(200).send({
      success: true,
      data: interviews,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch interviews",
    });
  }
};

// ============================================
// GET SINGLE INTERVIEW
// GET /api/interviews/:id
// ============================================

export const getRecruiterInterviewByIdController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await getRecruiterInterviewById(interviewId, recruiterId);

    return reply.code(200).send({
      success: true,
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch interview",
    });
  }
};

// ============================================
// UPDATE / RESCHEDULE INTERVIEW
// PATCH /api/interviews/:id
// ============================================

export const updateInterviewController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await rescheduleInterview(
      interviewId,
      recruiterId,
      request.body,
    );

    return reply.code(200).send({
      success: true,
      message: "Interview updated successfully",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to update interview",
    });
  }
};

// ============================================
// CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
// ============================================

export const cancelInterviewController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await cancelRecruiterInterview(interviewId, recruiterId);

    return reply.code(200).send({
      success: true,
      message: "Interview cancelled successfully",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to cancel interview",
    });
  }
};

// ============================================
// COMPLETE INTERVIEW
// PATCH /api/interviews/:id/complete
// ============================================

export const completeInterviewController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await completeRecruiterInterview(
      interviewId,
      recruiterId,
    );

    return reply.code(200).send({
      success: true,
      message: "Interview marked as completed",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to complete interview",
    });
  }
};
