import {
  getMyResumes,
  createResume,
} from "./resume.service.js";

// ============================================
// GET MY RESUMES
// ============================================

export const getMyResumesController = async (request, reply) => {
  try {
    const resumes = await getMyResumes(request.user.userId);

    return reply.code(200).send({
      success: true,
      data: resumes,
    });
  } catch (error) {
    request.log.error(error);

    if (error.message === "Candidate not found") {
      return reply.code(404).send({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "User is not a candidate") {
      return reply.code(403).send({
        success: false,
        message: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// CREATE RESUME
// ============================================

export const createResumeController = async (request, reply) => {
  try {
    const resume = await createResume(
      request.user.userId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      data: resume,
    });
  } catch (error) {
    request.log.error(error);

    if (error.message === "Candidate not found") {
      return reply.code(404).send({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "User is not a candidate") {
      return reply.code(403).send({
        success: false,
        message: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};