import {
  getCandidateProfile,
  createCandidateProfile,
  updateCandidateProfile,
} from "./candidate.service.js";

// ============================================
// GET MY PROFILE
// ============================================

export const getMe = async (request, reply) => {
  try {
    const profile = await getCandidateProfile(
      request.user.userId
    );

    return reply.code(200).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    if (error.message === "User not found") {
      return reply.code(404).send({
        success: false,
        message: "User not found",
      });
    }

    if (
      error.message ===
      "User is not a candidate"
    ) {
      return reply.code(403).send({
        success: false,
        message: "Candidate access required",
      });
    }

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
      await createCandidateProfile(
        request.user.userId,
        request.body
      );

    return reply.code(201).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    if (
      error.message ===
      "Candidate profile already exists"
    ) {
      return reply.code(409).send({
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
// UPDATE MY PROFILE
// ============================================

export const updateMe = async (
  request,
  reply
) => {
  try {
    const profile =
      await updateCandidateProfile(
        request.user.userId,
        request.body
      );

    return reply.code(200).send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};