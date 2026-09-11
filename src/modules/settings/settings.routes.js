import {
  getSettings,
  updateSettings,
  sendTwoFactor,
  verifyTwoFactor,
} from "./settings.controller.js";

import {
  updateSettingsSchema,
  verifyTwoFactorSchema,
} from "./settings.schema.js";

export default async function settingsRoutes(app) {
  app.get(
    "/",
    {
      preHandler: [app.authenticate],
    },
    getSettings
  );

  app.put(
    "/",
    {
      preHandler: [app.authenticate],
      schema: updateSettingsSchema,
    },
    updateSettings
  );

  app.post(
    "/2fa/send",
    {
      preHandler: [app.authenticate],
    },
    sendTwoFactor
  );

  app.post(
    "/2fa/verify",
    {
      preHandler: [app.authenticate],
      schema: verifyTwoFactorSchema,
    },
    verifyTwoFactor
  );
}
