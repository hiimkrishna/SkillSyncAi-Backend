import {
  saveJobController,
  unsaveJobController,
  getMySavedJobsController,
} from "./saved-jobs.controller.js";

export default async function savedJobsRoutes(
  fastify
) {
  // ============================================
  // GET MY SAVED JOBS
  // ============================================

  fastify.get(
    "/",
    {
      preHandler: [
        fastify.authenticate,
      ],
    },
    getMySavedJobsController
  );

  // ============================================
  // SAVE JOB
  // ============================================

  fastify.post(
    "/:jobId",
    {
      preHandler: [
        fastify.authenticate,
      ],
    },
    saveJobController
  );

  // ============================================
  // UNSAVE JOB
  // ============================================

  fastify.delete(
    "/:jobId",
    {
      preHandler: [
        fastify.authenticate,
      ],
    },
    unsaveJobController
  );
}