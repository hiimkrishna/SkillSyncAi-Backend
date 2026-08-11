
import {
  getUserSettings,
  updateUserSettings,
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
