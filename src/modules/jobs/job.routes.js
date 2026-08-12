import {
  getAllJobs,
  getSingleJob,
  createNewJob,
  updateExistingJob,
  removeJob,
} from "./job.controller.js";

import {
  getJobsSchema,
  jobIdSchema,
  createJobSchema,
  updateJobSchema,
} from "./job.schemas.js";

export default async function jobRoutes(app) {
  // Public — candidate can browse jobs
  app.get(
    "/",
    {
      schema: getJobsSchema,
    },
    getAllJobs,
  );

  // Public — candidate can view a single job
  app.get(
    "/:id",
    {
      schema: jobIdSchema,
    },
    getSingleJob,
  );

  // Recruiter only
  app.post(
    "/",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],
      schema: createJobSchema,
    },
    createNewJob,
  );

  // Recruiter only
  app.patch(
    "/:id",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],
      schema: updateJobSchema,
    },
    updateExistingJob,
  );

  // Recruiter only
  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, app.authorize(["recruiter"])],
      schema: jobIdSchema,
    },
    removeJob,
  );
}
