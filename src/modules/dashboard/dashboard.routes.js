import {
  getDashboard,
  getReport,
  getReportPdf,
} from "./dashboard.controller.js";

const reportQuerySchema = {
  querystring: {
    type: "object",

    additionalProperties: false,

    properties: {
      from: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },

      to: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
    },
  },
};

export default async function dashboardRoutes(app) {
  // Static routes first — before "/"
  app.get(
    "/report/pdf",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate", "recruiter"]),
      ],

      schema: reportQuerySchema,
    },
    getReportPdf
  );

  app.get(
    "/report",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate", "recruiter"]),
      ],

      schema: reportQuerySchema,
    },
    getReport
  );

  app.get(
    "/",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate", "recruiter", "admin"]),
      ],
    },
    getDashboard
  );
}
