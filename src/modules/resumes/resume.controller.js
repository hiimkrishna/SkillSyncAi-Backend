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
    console.log("\n========================================");
    console.log("RESUME UPLOAD REQUEST RECEIVED");
    console.log("========================================");

    const userId = request.user.userId;

    console.log("[1] User ID:", userId);

    // ========================================
    // GET MULTIPART FILE
    // ========================================

    console.log("[2] Reading multipart file...");

    const file = await request.file();

    if (!file) {
      console.log("[ERROR] No multipart file received");

      return reply.code(400).send({
        success: false,
        message: "Resume file is required",
      });
    }

    console.log("[3] File received successfully");
    console.log("Filename:", file.filename);
    console.log("Mimetype:", file.mimetype);
    console.log("Fieldname:", file.fieldname);

    // ========================================
    // CREATE RESUME
    // ========================================

    console.log("[4] Sending file to resume service...");

    const resume = await createResume({
      userId,
      file,
    });

    console.log("[5] Resume service completed");
    console.log("Resume ID:", resume?.id);

    // ========================================
    // PUBLIC RESPONSE
    // ========================================
    //
    // Database contains full resumeData JSON.
    // We DO NOT expose the complete parsed JSON
    // here.
    //
    // Return only information needed by frontend.
    // ========================================

    return reply.code(201).send({
      success: true,
      message: "Resume uploaded and processed successfully",

      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        parseStatus: resume.parseStatus,
        parserVersion: resume.parserVersion,

        // User-facing useful information only
        summary:
          resume.resumeData?.summary || "",

        candidateName:
          resume.resumeData?.personalInfo?.name ||
          "",

        email:
          resume.resumeData?.personalInfo?.email ||
          "",

        phone:
          resume.resumeData?.personalInfo?.phone ||
          "",

        skills:
          resume.resumeData?.skills || [],

        education:
          resume.resumeData?.education || [],

        experience:
          resume.resumeData?.experience || [],
      },
    });
  } catch (error) {
    request.log.error(error);

    console.error("\n========================================");
    console.error("RESUME CONTROLLER ERROR");
    console.error("========================================");

    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

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

    // ========================================
    // PUBLIC RESPONSE
    // ========================================

    return reply.code(200).send({
      success: true,

      data: {
        id: resume.id,
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        parseStatus: resume.parseStatus,
        parserVersion: resume.parserVersion,

        summary:
          resume.resumeData?.summary || "",

        candidateName:
          resume.resumeData?.personalInfo?.name ||
          "",

        email:
          resume.resumeData?.personalInfo?.email ||
          "",

        phone:
          resume.resumeData?.personalInfo?.phone ||
          "",

        skills:
          resume.resumeData?.skills || [],

        education:
          resume.resumeData?.education || [],

        experience:
          resume.resumeData?.experience || [],
      },
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