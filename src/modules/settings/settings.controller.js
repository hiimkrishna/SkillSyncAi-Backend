
import {
  getUserSettings,
  updateUserSettings,
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
} from "./settings.service.js";

export const getSettings = async (request, reply) => {
  try {
    const settings = await getUserSettings(request.user.userId);

    return reply.code(200).send({
      settings,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      message: "Failed to fetch settings",
    });
  }
};

export const updateSettings = async (request, reply) => {
  try {
    const settings = await updateUserSettings(
      request.user.userId,
      request.body
    );

    return reply.code(200).send({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      message: "Failed to update settings",
    });
  }
};

export const sendTwoFactor = async (request, reply) => {
  try {
    const result = await sendTwoFactorOtp(request.user.userId);

    request.log.info(
      `2FA code issued for user ${request.user.userId}`
    );

    return reply.code(200).send({
      message: "Verification code sent",
      success: true,
      ...result,
    });
  } catch (error) {
    if (
      error.message === "User not found" ||
      error.message?.startsWith("Save a phone number")
    ) {
      return reply.code(400).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.code(500).send({
      message: "Failed to send verification code",
    });
  }
};

export const verifyTwoFactor = async (request, reply) => {
  try {
    const result = await verifyTwoFactorOtp(
      request.user.userId,
      request.body.code
    );

    return reply.code(200).send({
      message: "Two-factor authentication enabled",
      success: true,
      security: result,
    });
  } catch (error) {
    if (
      error.message === "No verification code was requested" ||
      error.message?.includes("expired") ||
      error.message?.startsWith("Incorrect verification code")
    ) {
      return reply.code(400).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.code(500).send({
      message: "Failed to verify code",
    });
  }
};
