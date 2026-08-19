import {
  getMe,
  createMe,
  updateMe,
} from "./recruiter.controller.js";

import {
  createRecruiterProfileSchema,
  updateRecruiterProfileSchema,
} from "./recruiter.schemas.js";

export default async function recruiterRoutes(
  fastify
) {
  // ============================================
  // GET MY RECRUITER PROFILE
  // ============================================

  fastify.get(
    "/me",
    {
      preHandler: [fastify.authenticate],
    },
    getMe
  );

  // ============================================
  // CREATE MY RECRUITER PROFILE
  // ============================================

  fastify.post(
    "/me",
    {
      preHandler: [fastify.authenticate],
      schema:
        createRecruiterProfileSchema,
    },
    createMe
  );

  // ============================================
  // UPDATE MY RECRUITER PROFILE
  // ============================================

  fastify.put(
    "/me",
    {
      preHandler: [fastify.authenticate],
      schema:
        updateRecruiterProfileSchema,
    },
    updateMe
  );
}