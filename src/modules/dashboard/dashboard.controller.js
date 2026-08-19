import {
  getDashboardData,
} from "./dashboard.service.js";

// ============================================
// GET MY DASHBOARD
// ============================================

export const getDashboard = async (
  request,
  reply
) => {
  try {
    const userId =
      request.user.userId;

    const data =
      await getDashboardData(userId);

    return reply.code(200).send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error(error);

    return reply
      .code(error.statusCode || 500)
      .send({
        success: false,
        message:
          error.message ||
          "Failed to load dashboard",
      });
  }
};