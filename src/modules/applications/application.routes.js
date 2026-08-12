// src/modules/applications/application.routes.js

import {
  applyToJobController,
  getMyApplicationsController,
  getRecruiterApplicationsController,
  getApplicationController,
  updateApplicationStatusController,
} from "./application.controller.js";

export default async function applicationRoutes(fastify) {
  // ============================================
  // CANDIDATE APPLICATIONS
  // ============================================

  // Candidate applies to a job
  fastify.post("/", {
    preHandler: [fastify.authenticate],
    handler: applyToJobController,
  });

  // Candidate gets their own applications
  fastify.get("/my", {
    preHandler: [fastify.authenticate],
    handler: getMyApplicationsController,
  });

  // ============================================
  // RECRUITER APPLICATIONS
  // ============================================

  // Recruiter gets applications for their jobs
  fastify.get("/recruiter", {
    preHandler: [fastify.authenticate],
    handler: getRecruiterApplicationsController,
  });

  // ============================================
  // SINGLE APPLICATION
  // ============================================

  // Get one application
  fastify.get("/:id", {
    preHandler: [fastify.authenticate],
    handler: getApplicationController,
  });

  // Update application status
  fastify.patch("/:id", {
    preHandler: [fastify.authenticate],
    handler: updateApplicationStatusController,
  });
}