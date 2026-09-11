export default async function aiRoutes(fastify) {
  const {
    evaluateApplicationController,
    getEvaluationController,
    generateQuestionsController,
    analyzeResumeController,
    getResumeAnalysisController,
    recommendedJobsController,
  } = await import("./ai.controller.js");

  // POST /api/ai/evaluate/:applicationId — recruiter only (kept, but not primary UI)
  fastify.post(
    "/evaluate/:applicationId",
    { preHandler: [fastify.authenticate, fastify.authorize(["recruiter"])] },
    evaluateApplicationController,
  );

  // GET /api/ai/evaluate/:applicationId
  fastify.get(
    "/evaluate/:applicationId",
    { preHandler: [fastify.authenticate, fastify.authorize(["recruiter"])] },
    getEvaluationController,
  );

  // POST /api/ai/interview-questions/:applicationId — hidden (not in active flow per user)
  fastify.post(
    "/interview-questions/:applicationId",
    { preHandler: [fastify.authenticate, fastify.authorize(["recruiter"])] },
    generateQuestionsController,
  );

  // POST /api/ai/resume/analyze — candidate: analyze uploaded resume & recommend changes
  fastify.post(
    "/resume/analyze",
    { preHandler: [fastify.authenticate, fastify.authorize(["candidate"])] },
    analyzeResumeController,
  );

  // GET /api/ai/resume/analysis — candidate: fetch latest AI analysis
  fastify.get(
    "/resume/analysis",
    { preHandler: [fastify.authenticate, fastify.authorize(["candidate"])] },
    getResumeAnalysisController,
  );

  // GET /api/ai/recommended-jobs — candidate: AI-ranked jobs from existing list based on resume
  fastify.get(
    "/recommended-jobs",
    { preHandler: [fastify.authenticate, fastify.authorize(["candidate"])] },
    recommendedJobsController,
  );
}
