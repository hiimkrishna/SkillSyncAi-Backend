import {
  getCandidateProfile,
  createCandidateProfile,
  updateCandidateProfile,
} from "./candidate.service.js";

export const getMe = async (request, reply) => {
  try {
    const profile = await getCandidateProfile(request.user.userId);

    return reply.code(200).send({
      profile,
    });
  } catch (error) {
    request.log.error(error);

    if (error.message === "User not found") {
      return reply.code(404).send({
        message: "User not found",
      });
    }

    if (error.message === "User is not a candidate") {
      return reply.code(403).send({
        message: "Candidate access required",
      });
    }

    return reply.code(500).send({
      message: "Internal server error",
    });
  }
};

export const createMe = async (request, reply) => {
  try {
    const profile = await createCandidateProfile(
      request.user.userId,
      request.body
    );

    return reply.code(201).send({
      profile,
    });
  } catch (error) {
    if (error.message === "Candidate profile already exists") {
      return reply.code(409).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.code(500).send({
      message: "Internal server error",
    });
  }
};

export const updateMe = async (request, reply) => {
  try {
    const profile = await updateCandidateProfile(
      request.user.userId,
      request.body
    );

    return reply.code(200).send({
      profile,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      message: "Internal server error",
    });
  }
};