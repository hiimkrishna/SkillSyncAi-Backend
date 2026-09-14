import {
  scheduleInterview,
  getRecruiterInterviews,
  getCandidateInterviews,
  getRecruiterInterviewById,
  rescheduleInterview,
  cancelRecruiterInterview,
  completeRecruiterInterview,
  requestRescheduleAsCandidate,
  respondToRescheduleRequest,
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
// GET CANDIDATE INTERVIEWS (calendar)
// GET /api/interviews/candidate
// ============================================

export const getCandidateInterviewsController = async (request, reply) => {
  try {
    const candidateId = request.user.userId;

    const interviews = await getCandidateInterviews(candidateId);

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
// CANDIDATE RESCHEDULE REQUEST
// POST /api/interviews/:id/reschedule-request
// ============================================

export const requestRescheduleController = async (request, reply) => {
  try {
    const candidateId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await requestRescheduleAsCandidate(
      interviewId,
      candidateId,
      request.body || {},
    );

    return reply.code(200).send({
      success: true,
      message: "Reschedule request sent to the recruiter",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to request rescheduling",
    });
  }
};

// ============================================
// RECRUITER RESCHEDULE RESPONSE
// PATCH /api/interviews/:id/reschedule-respond
// ============================================

export const respondRescheduleController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;

    const { id: interviewId } = request.params;

    const interview = await respondToRescheduleRequest(
      interviewId,
      recruiterId,
      request.body || {},
    );

    return reply.code(200).send({
      success: true,
      message: "Reschedule request updated",
      data: interview,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to respond to reschedule request",
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
