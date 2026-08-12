import {
  getDashboard,
} from "./dashboard.controller.js";

export default async function dashboardRoutes(app) {
  app.get(
    "/",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate"]),
      ],
    },
    getDashboard
  );
}