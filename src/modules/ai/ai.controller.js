import {
  evaluateApplication,
  getEvaluation,
  generateInterviewQuestions,
  analyzeResumeForCandidate,
  getResumeAnalysis,
  recommendJobsForCandidate,
} from "./ai.service.js";

export const evaluateApplicationController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;
    const { applicationId } = request.params;

    const evaluation = await evaluateApplication(applicationId, recruiterId);

    return reply.code(200).send({
      success: true,
      message: "AI evaluation completed",
      data: evaluation,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to evaluate candidate",
    });
  }
};

export const getEvaluationController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;
    const { applicationId } = request.params;

    const data = await getEvaluation(applicationId, recruiterId);

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch evaluation",
    });
  }
};

export const generateQuestionsController = async (request, reply) => {
  try {
    const recruiterId = request.user.userId;
    const { applicationId } = request.params;
    const { count } = request.query;

    const questions = await generateInterviewQuestions(
      applicationId,
      recruiterId,
      count ? Number(count) : 5,
    );

    return reply.code(200).send({
      success: true,
      message: "Interview questions generated",
      data: questions,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to generate questions",
    });
  }
};

export const analyzeResumeController = async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { resumeId } = request.body || {};
    const analysis = await analyzeResumeForCandidate(userId, resumeId || null);
    return reply.code(200).send({
      success: true,
      message: "Resume analyzed",
      data: analysis,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to analyze resume",
    });
  }
};

export const getResumeAnalysisController = async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { resumeId } = request.query || {};
    const data = await getResumeAnalysis(userId, resumeId || null);
    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch resume analysis",
    });
  }
};

export const recommendedJobsController = async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { limit } = request.query || {};
    const recommendations = await recommendJobsForCandidate(
      userId,
      limit ? Number(limit) : 10,
    );
    return reply.code(200).send({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to recommend jobs",
    });
  }
};
