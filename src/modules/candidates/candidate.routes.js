import {
  getCandidateProfile,
  createCandidateProfile,
  updateCandidateProfile,
} from "./candidate.service.js";

import { createCandidateProfileSchema } from "./candidate.schemas.js";

export default async function candidateRoutes(app) {
  // GET current candidate profile
  app.get(
    "/me",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate"]),
      ],
    },
    async (request, reply) => {
      const profile = await getCandidateProfile(
        request.user.userId
      );

      if (!profile) {
        return reply.code(404).send({
          message: "Candidate profile not found",
        });
      }

      return {
        message: "Candidate profile retrieved",
        profile,
      };
    }
  );

  // CREATE candidate profile
  app.post(
    "/me",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate"]),
      ],
      schema: createCandidateProfileSchema,
    },
    async (request, reply) => {
      try {
        const profile = await createCandidateProfile(
          request.user.userId,
          request.body
        );

        return reply.code(201).send({
          message: "Candidate profile created",
          profile,
        });
      } catch (error) {
        if (error.message === "Candidate profile already exists") {
          return reply.code(409).send({
            message: error.message,
          });
        }

        throw error;
      }
    }
  );

  // UPDATE candidate profile
  app.put(
    "/me",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate"]),
      ],
      schema: createCandidateProfileSchema,
    },
    async (request, reply) => {
      const profile = await updateCandidateProfile(
        request.user.userId,
        request.body
      );

      if (!profile) {
        return reply.code(404).send({
          message: "Candidate profile not found",
        });
      }

      return {
        message: "Candidate profile updated",
        profile,
      };
    }
  );
}