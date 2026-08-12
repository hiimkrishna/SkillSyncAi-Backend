import { getDashboardData } from "./dashboard.service.js";

export const getDashboard = async (request, reply) => {
  try {
    const data = await getDashboardData(
      request.user.userId
    );

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error(error);

    if (error.message === "User not found") {
      return reply.code(404).send({
        success: false,
        message: "User not found",
      });
    }

    if (error.message === "Candidate access required") {
      return reply.code(403).send({
        success: false,
        message: "Candidate access required",
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};