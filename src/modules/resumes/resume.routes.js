import {
  getMyResumesController,
  createResumeController,
} from "./resume.controller.js";

export default async function resumeRoutes(fastify) {
  // ============================================
  // GET MY RESUMES
  // ============================================

  fastify.get("/my", {
    preHandler: [
      fastify.authenticate,
      fastify.authorize(["candidate"]),
    ],
    handler: getMyResumesController,
  });

  // ============================================
  // CREATE RESUME
  // ============================================

  fastify.post("/", {
    preHandler: [
      fastify.authenticate,
      fastify.authorize(["candidate"]),
    ],
    handler: createResumeController,
  });
}