import {
  getAllJobs,
  getSingleJob,
  getMyJobs,
  getMySingleJob,
  createNewJob,
  updateExistingJob,
  updateJobStatusController,
  removeJob,
} from "./job.controller.js";

import {
  getJobsSchema,
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
