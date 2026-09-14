import {
  getAllJobs,
  getSingleJob,
  getMatchedJobs,
  getJobEligibility,
  getMyJobs,
  getMySingleJob,
  createNewJob,
  updateExistingJob,
  updateJobStatusController,
  removeJob,
} from "./job.controller.js";

import {
  getJobsSchema,
  getMatchedJobsSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
} from "./job.schemas.js";

export default async function jobRoutes(app) {
  // ==========================================
  // PUBLIC JOB LIST
  // ==========================================

  app.get(
    "/",
    {
      schema: getJobsSchema,
    },
    getAllJobs,
  );

  // ==========================================
  // CANDIDATE AI JOB MATCH (static — before /:id)
  // GET /api/jobs/match?limit=20
  // ==========================================

  app.get(
    "/match",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],

      schema: getMatchedJobsSchema,
    },

    getMatchedJobs,
  );

  // Alias: GET /api/jobs/matched
  app.get(
    "/matched",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],

      schema: getMatchedJobsSchema,
    },

    getMatchedJobs,
  );

  // ==========================================
  // RECRUITER'S OWN JOBS
  // ==========================================

  app.get(
    "/recruiter",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: getJobsSchema,
    },

    getMyJobs,
  );

  // ==========================================
  // RECRUITER'S OWN SINGLE JOB
  // ==========================================

  app.get(
    "/recruiter/:id",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: jobIdSchema,
    },

    getMySingleJob,
  );

  // ==========================================
  // CREATE JOB
  // ==========================================

  app.post(
    "/",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: createJobSchema,
    },

    createNewJob,
  );

  // ==========================================
  // UPDATE JOB
  // ==========================================

  app.patch(
    "/:id",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: updateJobSchema,
    },

    updateExistingJob,
  );

  // ==========================================
  // UPDATE JOB STATUS
  // ==========================================

  app.patch(
    "/:id/status",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: updateJobStatusSchema,
    },

    updateJobStatusController,
  );

  // ==========================================
  // DELETE JOB
  // ==========================================

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],

      schema: jobIdSchema,
    },

    removeJob,
  );

  // ==========================================
  // CANDIDATE ELIGIBILITY FOR A JOB
  // (static suffix — before /:id)
  // ==========================================

  app.get(
    "/:id/eligibility",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],

      schema: jobIdSchema,
    },

    getJobEligibility,
  );

  // ==========================================
  // PUBLIC SINGLE JOB
  // ==========================================

  app.get(
    "/:id",
    {
      schema: jobIdSchema,
    },

    getSingleJob,
  );
}
