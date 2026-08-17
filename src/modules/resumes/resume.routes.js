import {
  getMyResumesController,
  createResumeController,
  getResumeController,
  deleteResumeController,
} from "./resume.controller.js";

export default async function resumeRoutes(fastify) {
  fastify.get(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    getMyResumesController
  );

  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    createResumeController
  );

  fastify.get(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    getResumeController
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    deleteResumeController
  );
}