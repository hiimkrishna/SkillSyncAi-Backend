import {
  scheduleInterviewController,
  getRecruiterInterviewsController,
  getRecruiterInterviewByIdController,
  updateInterviewController,
  cancelInterviewController,
  completeInterviewController,
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
