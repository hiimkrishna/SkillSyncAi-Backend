import {
  applyToJobController,
  getMyApplicationsController,
  getRecruiterApplicationsController,
  getApplicationController,
  updateApplicationStatusController,
} from "./application.controller.js";

export default async function applicationRoutes(fastify) {
  // ============================================
  // APPLY TO JOB
  // POST /api/applications
  // ============================================

  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    applyToJobController
  );

  // ============================================
  // CANDIDATE APPLICATIONS
  // GET /api/applications/my
  // ============================================

  fastify.get(
    "/my",
    {
      preHandler: [fastify.authenticate],
    },
    getMyApplicationsController
  );

  // ============================================
  // RECRUITER APPLICATIONS
  // GET /api/applications/recruiter
  // ============================================

  fastify.get(
    "/recruiter",
    {
      preHandler: [fastify.authenticate],
    },
    getRecruiterApplicationsController
  );

  // ============================================
  // SINGLE APPLICATION
  // GET /api/applications/:id
  // ============================================

  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    getApplicationController
  );

  // ============================================
  // UPDATE APPLICATION STATUS
  // PATCH /api/applications/:id/status
  // ============================================

  fastify.patch(
    "/:id/status",
    {
      preHandler: [fastify.authenticate],
    },
    updateApplicationStatusController
  );
}