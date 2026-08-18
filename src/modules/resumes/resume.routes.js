import {
  getMyResumesController,
  createResumeController,
  getResumeController,
  deleteResumeController,
} from "./resume.controller.js";

export default async function resumeRoutes(fastify) {
  // ============================================
  // GET MY RESUMES
  // ============================================

  fastify.get(
    "/my",
    {
      preHandler: [fastify.authenticate],
    },
    getMyResumesController
  );

  // ============================================
  // GET ALL MY RESUMES
  // ============================================

  fastify.get(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    getMyResumesController
  );

  // ============================================
  // CREATE RESUME
  // ============================================

  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    createResumeController
  );

  // ============================================
  // GET ONE RESUME
  // IMPORTANT: keep this AFTER /my
  // ============================================

  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    getResumeController
  );

  // ============================================
  // DELETE RESUME
  // ============================================

  fastify.delete(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    deleteResumeController
  );
}