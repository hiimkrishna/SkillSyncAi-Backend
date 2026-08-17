import {
  getMyResumes,
  createResume,
  getResumeById,
  deleteResume,
} from "./resume.service.js";

// ============================================
// GET MY RESUMES
// ============================================

export const getMyResumesController = async (request, reply) => {
  try {
    const userId = request.user.userId;

    const resumes = await getMyResumes(userId);

    return reply.code(200).send({
      success: true,
      data: resumes,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch resumes",
    });
  }
};

// ============================================
// CREATE / UPLOAD RESUME
// ============================================

export const createResumeController = async (request, reply) => {
  try {
    const userId = request.user.userId;

    const file = await request.file();

    if (!file) {
      return reply.code(400).send({
        success: false,
        message: "Resume file is required",
      });
    }

    const result = await createResume({
      userId,
      file,
    });

    return reply.code(201).send({
      success: true,
      message: "Resume uploaded and processed successfully",
      data: result,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to process resume",
    });
  }
};

// ============================================
// GET SINGLE RESUME
// ============================================

export const getResumeController = async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { id } = request.params;

    const resume = await getResumeById({
      userId,
      resumeId: id,
    });

    if (!resume) {
      return reply.code(404).send({
        success: false,
        message: "Resume not found",
      });
    }

    return reply.code(200).send({
      success: true,
      data: resume,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch resume",
    });
  }
};

// ============================================
// DELETE RESUME
// ============================================

export const deleteResumeController = async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { id } = request.params;

    const deleted = await deleteResume({
      userId,
      resumeId: id,
    });

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        message: "Resume not found",
      });
    }

    return reply.code(200).send({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to delete resume",
    });
  }
};