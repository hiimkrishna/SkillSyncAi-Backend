import {
  scheduleInterviewController,
  getRecruiterInterviewsController,
  getCandidateInterviewsController,
  getRecruiterInterviewByIdController,
  updateInterviewController,
  cancelInterviewController,
  completeInterviewController,
  requestRescheduleController,
  respondRescheduleController,
} from "./interview.controller.js";

export default async function interviewRoutes(fastify) {
  // ============================================
  // SCHEDULE INTERVIEW
  // POST /api/interviews
  // ============================================

  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    scheduleInterviewController,
  );

  // ============================================
  // GET RECRUITER INTERVIEWS
  // GET /api/interviews/recruiter
  // ============================================

  fastify.get(
    "/recruiter",
    {
      preHandler: [fastify.authenticate],
    },
    getRecruiterInterviewsController,
  );

  // ============================================
  // GET CANDIDATE INTERVIEWS (static — before /:id)
  // GET /api/interviews/candidate
  // ============================================

  fastify.get(
    "/candidate",
    {
      preHandler: [fastify.authenticate],
    },
    getCandidateInterviewsController,
  );

  // ============================================
  // CANDIDATE RESCHEDULE REQUEST
  // POST /api/interviews/:id/reschedule-request
  // ============================================

  fastify.post(
    "/:id/reschedule-request",
    {
      preHandler: [fastify.authenticate],
    },
    requestRescheduleController,
  );

  // ============================================
  // RECRUITER RESCHEDULE RESPONSE
  // PATCH /api/interviews/:id/reschedule-respond
  // ============================================

  fastify.patch(
    "/:id/reschedule-respond",
    {
      preHandler: [fastify.authenticate],
    },
    respondRescheduleController,
  );

  // ============================================
  // GET SINGLE INTERVIEW
  // GET /api/interviews/:id
  // ============================================

  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    getRecruiterInterviewByIdController,
  );

  // ============================================
  // UPDATE / RESCHEDULE
  // PATCH /api/interviews/:id
  // ============================================

  fastify.patch(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    updateInterviewController,
  );

  // ============================================
  // CANCEL
  // PATCH /api/interviews/:id/cancel
  // ============================================

  fastify.patch(
    "/:id/cancel",
    {
      preHandler: [fastify.authenticate],
    },
    cancelInterviewController,
  );

  // ============================================
  // COMPLETE
  // PATCH /api/interviews/:id/complete
  // ============================================

  fastify.patch(
    "/:id/complete",
    {
      preHandler: [fastify.authenticate],
    },
    completeInterviewController,
  );
}
