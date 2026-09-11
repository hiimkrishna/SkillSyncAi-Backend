import { getMe, createMe, updateMe } from "./candidate.controller.js";

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
    getMe
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
    createMe
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
    updateMe
  );
}