import {
  getDashboardData,
  getReportData,
} from "./dashboard.service.js";

import { findUserById } from "./dashboard.repository.js";

import { buildRoleReportPdf } from "../../utils/report-pdf.js";

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

// ============================================
// GET DATE-RANGE REPORT
// ============================================

export const getReport = async (
  request,
  reply
) => {
  try {
    const userId =
      request.user.userId;

    const { from, to } =
      request.query || {};

    const data =
      await getReportData(userId, {
        from,
        to,
      });

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
          "Failed to load report",
      });
  }
};

// ============================================
// GET DATE-RANGE REPORT AS PDF
// Supervisor mod #6: proper formatted report.
// ============================================

export const getReportPdf = async (
  request,
  reply
) => {
  try {
    const userId =
      request.user.userId;

    const { from, to } =
      request.query || {};

    const [data, user] = await Promise.all([
      getReportData(userId, { from, to }),
      findUserById(userId),
    ]);

    const pdf = await buildRoleReportPdf(data, {
      generatedFor: user
        ? `${user.fullName} (${user.email})`
        : request.user.role,
    });

    const range = data?.range ?? {};
    const fromLabel = String(range.from ?? from ?? "report").slice(0, 10);
    const toLabel = String(range.to ?? to ?? "").slice(0, 10);

    return reply
      .code(200)
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="skillsync-${data.role}-report-${fromLabel}-to-${toLabel}.pdf"`,
      )
      .send(pdf);
  } catch (error) {
    request.log.error(error);

    return reply
      .code(error.statusCode || 500)
      .send({
        success: false,
        message:
          error.message ||
          "Failed to generate report PDF",
      });
  }
};