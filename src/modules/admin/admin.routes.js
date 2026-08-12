import {
  getAllUsersController,
  getPendingRecruitersController,
  getRecruiterController,
  approveRecruiterController,
  rejectRecruiterController,
  updateRecruiterController,
  suspendRecruiterController,
  deleteRecruiterController,
} from "./admin.controller.js";

export default async function adminRoutes(app) {
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