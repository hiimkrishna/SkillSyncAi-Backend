import {
  getSettings,
  updateSettings,
} from "./settings.controller.js";

import {
  updateSettingsSchema,
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
}
