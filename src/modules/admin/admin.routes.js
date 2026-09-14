import {
  getAllUsersController,
  getPendingRecruitersController,
  getRecruiterController,
  approveRecruiterController,
  rejectRecruiterController,
  updateRecruiterController,
  suspendRecruiterController,
  unsuspendRecruiterController,
  deleteRecruiterController,
} from "./admin.controller.js";

import { getAdminReportsData } from "../dashboard/dashboard.service.js";
import { buildAdminReportPdf } from "../../utils/report-pdf.js";

export default async function adminRoutes(app) {
  // ============================================
  // GET PLATFORM REPORTS
  // ============================================

  app.get(
    "/reports",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    async (request, reply) => {
      try {
        const data = await getAdminReportsData();

        return reply.code(200).send({
          success: true,

          data,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,

          message: "Failed to load reports",
        });
      }
    },
  );

  // ============================================
  // GET PLATFORM REPORT AS PDF
  // Supervisor mod #6: proper formatted report.
  // ============================================

  app.get(
    "/reports/pdf",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    async (request, reply) => {
      try {
        const data = await getAdminReportsData();

        const pdf = await buildAdminReportPdf(data, {
          generatedFor: "Platform administrator",
        });

        return reply
          .code(200)
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            'attachment; filename="skillsync-platform-report.pdf"',
          )
          .send(pdf);
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,

          message: "Failed to generate reports PDF",
        });
      }
    },
  );

  // ============================================
  // GET ALL USERS
  // ============================================

  app.get(
    "/users",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    getAllUsersController,
  );

  // ============================================
  // GET PENDING RECRUITERS
  // ============================================

  app.get(
    "/recruiters/pending",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    getPendingRecruitersController,
  );

  // ============================================
  // GET RECRUITER BY ID
  // ============================================

  app.get(
    "/recruiters/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    getRecruiterController,
  );

  // ============================================
  // APPROVE RECRUITER
  // ============================================

  app.patch(
    "/recruiters/:id/approve",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    approveRecruiterController,
  );

  // ============================================
  // REJECT RECRUITER
  // ============================================

  app.patch(
    "/recruiters/:id/reject",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    rejectRecruiterController,
  );

  // ============================================
  // UPDATE RECRUITER
  // ============================================

  app.patch(
    "/recruiters/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    updateRecruiterController,
  );

  // ============================================
  // SUSPEND RECRUITER
  // ============================================

  app.patch(
    "/recruiters/:id/suspend",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    suspendRecruiterController,
  );

  // ============================================
  // UNSUSPEND RECRUITER
  // ============================================

  app.patch(
    "/recruiters/:id/unsuspend",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    unsuspendRecruiterController,
  );

  // ============================================
  // DELETE RECRUITER
  // ============================================

  app.delete(
    "/recruiters/:id",
    {
      preHandler: [app.authenticate, app.authorize(["admin"])],
    },
    deleteRecruiterController,
  );
}