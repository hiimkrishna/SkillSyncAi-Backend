import {
  getRecruiterProfile,
  createRecruiterProfile,
  updateRecruiterProfile,
} from "./recruiter.service.js";

// ============================================
// GET MY PROFILE
// ============================================

export const getMe = async (
  request,
  reply
) => {
  try {
    const profile =
      await getRecruiterProfile(
        request.user.userId
      );

    return reply.code(200).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    // ==========================================
    // USER NOT FOUND
    // ==========================================

    if (error.message === "User not found") {
      return reply.code(404).send({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // INVALID ROLE
    // ==========================================

    if (
      error.message ===
      "User is not a recruiter"
    ) {
      return reply.code(403).send({
        success: false,
        message: "Recruiter access required",
      });
    }

    // ==========================================
    // INTERNAL ERROR
    // ==========================================

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// CREATE MY PROFILE
// ============================================

export const createMe = async (
  request,
  reply
) => {
  try {
    const profile =
      await createRecruiterProfile(
        request.user.userId,
        request.body
      );

    return reply.code(201).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    // ==========================================
    // USER NOT FOUND
    // ==========================================

    if (error.message === "User not found") {
      return reply.code(404).send({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // INVALID ROLE
    // ==========================================

    if (
      error.message ===
      "User is not a recruiter"
    ) {
      return reply.code(403).send({
        success: false,
        message: "Recruiter access required",
      });
    }

    // ==========================================
    // PROFILE ALREADY EXISTS
    // ==========================================

    if (
      error.message ===
      "Recruiter profile already exists"
    ) {
      return reply.code(409).send({
        success: false,
        message:
          "Recruiter profile already exists",
      });
    }

    // ==========================================
    // INTERNAL ERROR
    // ==========================================

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// UPDATE MY PROFILE
// ============================================

export const updateMe = async (
  request,
  reply
) => {
  try {
    const profile =
      await updateRecruiterProfile(
        request.user.userId,
        request.body
      );

    return reply.code(200).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    // ==========================================
    // USER NOT FOUND
    // ==========================================

    if (error.message === "User not found") {
      return reply.code(404).send({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // INVALID ROLE
    // ==========================================

    if (
      error.message ===
      "User is not a recruiter"
    ) {
      return reply.code(403).send({
        success: false,
        message: "Recruiter access required",
      });
    }

    // ==========================================
    // INTERNAL ERROR
    // ==========================================

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};