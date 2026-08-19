// src/modules/applications/application.routes.js

import {
  applyToJobController,
  getMyApplicationsController,
  getRecruiterApplicationsController,
  getApplicationController,
  updateApplicationStatusController,
} from "./application.controller.js";

import {
  applyToJobSchema,
  applicationIdSchema,
  updateApplicationStatusSchema,
} from "./application.schema.js";

export default async function applicationRoutes(fastify) {
  // ============================================
  // APPLY TO JOB
  // POST /api/applications
  // ============================================

  fastify.post(
    "/",
    {
      schema: applyToJobSchema,

      preHandler: [fastify.authenticate, fastify.authorize(["candidate"])],
    },
    applyToJobController,
  );

  // ============================================
  // CANDIDATE APPLICATIONS
  // GET /api/applications/my
  // ============================================

  fastify.get(
    "/my",
    {
      preHandler: [fastify.authenticate, fastify.authorize(["candidate"])],
    },
    getMyApplicationsController,
  );

  // ============================================
  // RECRUITER APPLICATIONS
  // GET /api/applications/recruiter
  // ============================================

  fastify.get(
    "/recruiter",
    {
      preHandler: [fastify.authenticate, fastify.authorize(["recruiter"])],
    },
    getRecruiterApplicationsController,
  );

  // ============================================
  // UPDATE APPLICATION STATUS
  // PATCH /api/applications/:id/status
  // ============================================

  fastify.patch(
    "/:id/status",
    {
      schema: updateApplicationStatusSchema,

      preHandler: [fastify.authenticate, fastify.authorize(["recruiter"])],
    },
    updateApplicationStatusController,
  );

  // ============================================
  // GET SINGLE APPLICATION
  // GET /api/applications/:id
  // ============================================

  fastify.get(
    "/:id",
    {
      schema: applicationIdSchema,

      preHandler: [fastify.authenticate],
    },
    getApplicationController,
  );
}
