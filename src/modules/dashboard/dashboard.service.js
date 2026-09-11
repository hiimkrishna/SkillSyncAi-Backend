import {
  findUserById,
  findCandidateProfileByUserId,

  // Candidate
  getApplicationCount,
  getInterviewCount,
  getRecentApplications,
  getRecommendedJobs,

  // Recruiter
  getRecruiterJobCount,
  getRecruiterOpenJobCount,
  getRecruiterClosedJobCount,
  getRecruiterApplicationCount,
  getRecruiterPendingApplicationCount,
  getRecruiterShortlistedCount,
  getRecruiterRejectedCount,
  getRecentRecruiterApplications,
  getRecruiterRecentJobsWithCounts,
  getRecruiterWeeklyApplicationCount,
  getRecruiterHiredCount,
  countUsersByRole,
  countRecruitersByApprovalStatus,
  countInactiveUsers,
  countJobsByStatus,
  countApplicationsByStatus,
  countAllUsers,
  countAllJobs,
  countAllApplications,
  countAllInterviews,
  getRecentRecruitersForAdmin,
  getPendingRecruitersForAdmin,
  getAdminActivityFeed,
  countNewUsersSince,
  countNewJobsSince,
  countNewApplicationsSince,
  getTopJobsByApplications,
  getCandidateApplicationsInRange,
  getRecruiterApplicationsInRange,
  getRecruiterJobsInRange,
} from "./dashboard.repository.js";

import { calculateProfileCompletion } from "../../utils/profile-completion.js";
import { getSavedJobsCount } from "../saved-jobs/saved-jobs.service.js";

// ============================================
// GET DASHBOARD DATA
// ============================================

export const getDashboardData = async (userId) => {
  // ============================================
  // GET USER
  // ============================================

  const user = await findUserById(userId);

  if (!user) {
    const error = new Error("User not found");

    error.statusCode = 404;

    throw error;
  }

  // ============================================
  // RECRUITER DASHBOARD
  // ============================================

  if (user.role === "recruiter") {
    return getRecruiterDashboardData(user);
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================

  if (user.role === "admin") {
    return getAdminDashboardData(user);
  }

  // ============================================
  // CANDIDATE DASHBOARD
  // ============================================

  if (user.role === "candidate") {
    return getCandidateDashboardData(user);
  }

  // ============================================
  // UNSUPPORTED ROLE
  // ============================================

  const error = new Error("Dashboard access required");

  error.statusCode = 403;

  throw error;
};

// ============================================
// GET CANDIDATE DASHBOARD
// ============================================

const getCandidateDashboardData = async (user) => {
  // ============================================
  // LOAD CANDIDATE PROFILE
  // ============================================

  const profile = await findCandidateProfileByUserId(user.id);

  // ============================================
  // PROFILE COMPLETION
  //
  // SINGLE SOURCE OF TRUTH
  // ============================================

  const { score: profileCompletionScore, checklist: profileChecklist } =
    calculateProfileCompletion(profile);

  // ============================================
  // LOAD DASHBOARD DATA
  // ============================================

  const [
    applicationCount,
    interviewCount,
    savedJobsCount,
    recentApplications,
    recommendedJobs,
  ] = await Promise.all([
    getApplicationCount(user.id),

    getInterviewCount(user.id),

    getSavedJobsCount(user.id),

    getRecentApplications(user.id),

    getRecommendedJobs(user.id),
  ]);

  // ============================================
  // QUICK STATS
  // ============================================

  const quickStats = [
    {
      title: "Applications",
      value: applicationCount,
      icon: "applications",
      change: null,
      href: "/applications",
    },

    {
      title: "Interviews",
      value: interviewCount,
      icon: "interviews",
      change: null,
      href: "/applications?status=interview",
    },

    {
      title: "Saved Jobs",
      value: savedJobsCount,
      icon: "savedJobs",
      change: null,
      href: "/jobs/saved",
    },

    {
      title: "Profile",
      value: `${profileCompletionScore}%`,
      icon: "profile",
      change: null,
      href: "/profile",
    },
  ];

  // ============================================
  // FORMAT RECENT APPLICATIONS
  // ============================================

  const formattedApplications = recentApplications.map((application) => ({
    id: application.id,

    jobId: application.jobId,

    position: application.position,

    company: application.company,

    status: application.status,

    appliedAt: application.appliedAt,
  }));

  // ============================================
  // FORMAT RECOMMENDED JOBS
  // ============================================

  const formattedJobs = recommendedJobs.map((job) => ({
    id: job.id,

    title: job.title,

    company: job.company,

    location: job.location ?? "Not specified",

    type: job.type,

    salary: formatSalaryRange(job.salaryMin, job.salaryMax),

    applicationStatus: job.applicationStatus ?? null,

    isApplied: Boolean(job.applicationStatus),
  }));

  // ============================================
  // AI CAREER TIPS
  // ============================================

  const aiTips = [];

  const skillsCompleted = profileChecklist.some(
    (item) => item.id === "skills" && item.completed,
  );

  const experienceCompleted = profileChecklist.some(
    (item) => item.id === "experience" && item.completed,
  );

  const headlineCompleted = profileChecklist.some(
    (item) => item.id === "headline" && item.completed,
  );

  // ==========================================
  // SKILLS TIP
  // ==========================================

  if (!skillsCompleted) {
    aiTips.push({
      id: "skills",

      text: "Add relevant technical skills to improve job matching.",

      category: "Skills",

      actionLabel: "Add Skills",

      href: "/profile",
    });
  }

  // ==========================================
  // EXPERIENCE TIP
  // ==========================================

  if (!experienceCompleted) {
    aiTips.push({
      id: "experience",

      text: "Add your work experience to strengthen your candidate profile.",

      category: "Experience",

      actionLabel: "Add Experience",

      href: "/profile",
    });
  }

  // ==========================================
  // HEADLINE TIP
  // ==========================================

  if (!headlineCompleted) {
    aiTips.push({
      id: "headline",

      text: "Add a professional headline so recruiters can quickly understand your profile.",

      category: "Profile",

      actionLabel: "Update Profile",

      href: "/profile",
    });
  }

  // ============================================
  // ACTIVITY TIMELINE
  // ============================================

  const activities = recentApplications.map((application) => ({
    id: application.id,

    title: `Applied for ${application.position}`,

    timestamp: application.appliedAt,

    type: "application",

    status: application.status,
  }));

  // ============================================
  // RESUME
  // ============================================

  /*
   * Resume score is separate from
   * profile completion.
   *
   * Will be connected later with
   * resume parsing / ATS system.
   */

  const resumeScore = 0;

  const resumeChecklist = [];

  // ============================================
  // FINAL CANDIDATE RESPONSE
  // ============================================

  return {
    user: {
      id: user.id,

      name: user.fullName,

      email: user.email,
    },

    resumeScore,

    quickStats,

    recentApplications: formattedApplications,

    recommendedJobs: formattedJobs,

    resumeChecklist,

    profileCompletionScore,

    profileChecklist,

    aiTips,

    activities,
  };
};

// ============================================
// GET RECRUITER DASHBOARD
// ============================================

const getRecruiterDashboardData = async (user) => {
  // ==========================================
  // LOAD RECRUITER DASHBOARD DATA
  // ==========================================

  const [
    totalJobs,
    openJobs,
    closedJobs,

    totalApplications,
    pendingApplications,
    shortlistedApplications,
    rejectedApplications,

    recentApplications,

    recentJobsWithCounts,

    weeklyApplicationCount,

    hiredCount,
  ] = await Promise.all([
    getRecruiterJobCount(user.id),

    getRecruiterOpenJobCount(user.id),

    getRecruiterClosedJobCount(user.id),

    getRecruiterApplicationCount(user.id),

    getRecruiterPendingApplicationCount(user.id),

    getRecruiterShortlistedCount(user.id),

    getRecruiterRejectedCount(user.id),

    getRecentRecruiterApplications(user.id),

    getRecruiterRecentJobsWithCounts(user.id),

    getRecruiterWeeklyApplicationCount(user.id),

    getRecruiterHiredCount(user.id),
  ]);

  // ==========================================
  // QUICK STATS
  // ==========================================

  const quickStats = [
    {
      title: "Total Jobs",

      value: totalJobs,

      icon: "jobs",

      change: null,

      href: "/recruiter/jobs",
    },

    {
      title: "Active Jobs",

      value: openJobs,

      icon: "activeJobs",

      change: null,

      href: "/recruiter/jobs?status=open",
    },

    {
      title: "Applications",

      value: totalApplications,

      icon: "applications",

      change: null,

      href: "/recruiter/applications",
    },

    {
      title: "Shortlisted",

      value: shortlistedApplications,

      icon: "shortlisted",

      change: null,

      href: "/recruiter/applications?status=shortlisted",
    },
  ];

  // ==========================================
  // FORMAT RECENT APPLICATIONS
  // ==========================================

  const formattedApplications = recentApplications.map((application) => ({
    id: application.id,

    candidateId: application.candidateId,

    candidateName: application.candidateName,

    candidateEmail: application.candidateEmail,

    jobId: application.jobId,

    position: application.position,

    company: application.company,

    status: application.status,

    appliedAt: application.appliedAt,
  }));

  // ==========================================
  // ACTIVITY TIMELINE
  // ==========================================

  const activities = recentApplications.map((application) => ({
    id: application.id,

    title: `${application.candidateName} applied for ${application.position}`,

    timestamp: application.appliedAt,

    type: "application",

    status: application.status,
  }));

  // ==========================================
  // FORMAT RECENT JOBS
  // ==========================================

  const formattedRecentJobs = recentJobsWithCounts.map((job) => ({
    id: job.id,

    title: job.title,

    company: job.company,

    status: job.status,

    createdAt: job.createdAt,

    applicants: Number(job.applicantCount ?? 0),
  }));

  // ==========================================
  // ACTIVITY METRICS
  // ==========================================

  const conversionRate =
    totalApplications > 0
      ? Math.round((hiredCount / totalApplications) * 1000) / 10
      : 0;

  const metrics = {
    weeklyApplications: weeklyApplicationCount,

    weeklyHires: hiredCount,

    hiredTotal: hiredCount,

    conversionRate,
  };

  // ==========================================
  // FINAL RECRUITER RESPONSE
  // ==========================================

  return {
    user: {
      id: user.id,

      name: user.fullName,

      email: user.email,
    },

    quickStats,

    jobs: {
      total: totalJobs,

      open: openJobs,

      closed: closedJobs,
    },

    applications: {
      total: totalApplications,

      pending: pendingApplications,

      shortlisted: shortlistedApplications,

      rejected: rejectedApplications,
    },

    recentApplications: formattedApplications,

    recentJobs: formattedRecentJobs,

    activities,

    metrics,
  };
};

// ============================================
// SALARY FORMATTER
// ============================================

const formatSalaryRange = (min, max) => {
  const minimum = Number(min);

  const maximum = Number(max);

  const hasMin = Number.isFinite(minimum) && minimum > 0;

  const hasMax = Number.isFinite(maximum) && maximum > 0;

  // ==========================================
  // NO SALARY
  // ==========================================

  if (!hasMin && !hasMax) {
    return "Negotiable";
  }

  // ==========================================
  // MINIMUM ONLY
  // ==========================================

  if (hasMin && !hasMax) {
    return `$${minimum / 1000}k+`;
  }

  // ==========================================
  // MAXIMUM ONLY
  // ==========================================

  if (!hasMin && hasMax) {
    return `Up to $${maximum / 1000}k`;
  }

  // ==========================================
  // BOTH
  // ==========================================

  return `$${minimum / 1000}k - $${maximum / 1000}k`;
};
// ============================================
// GET ADMIN DASHBOARD
// ============================================

const getAdminDashboardData = async (user) => {
  const [
    adminCount,
    candidateCount,
    recruiterCount,
    pendingRecruiters,
    rejectedRecruiters,
    inactiveUsers,
    totalJobs,
    openJobs,
    closedJobs,
    totalApplications,
    pendingApplications,
    shortlistedApplications,
    interviewApplications,
    hiredApplications,
    rejectedApplications,
    totalInterviews,
    recentRecruiters,
    pendingApprovals,
    activityFeed,
  ] = await Promise.all([
    countUsersByRole("admin"),
    countUsersByRole("candidate"),
    countUsersByRole("recruiter"),
    countRecruitersByApprovalStatus("pending"),
    countRecruitersByApprovalStatus("rejected"),
    countInactiveUsers(),
    countAllJobs(),
    countJobsByStatus("open"),
    countJobsByStatus("closed"),
    countAllApplications(),
    countApplicationsByStatus("pending"),
    countApplicationsByStatus("shortlisted"),
    countApplicationsByStatus("interview"),
    countApplicationsByStatus("hired"),
    countApplicationsByStatus("rejected"),
    countAllInterviews(),
    getRecentRecruitersForAdmin(5),
    getPendingRecruitersForAdmin(),
    getAdminActivityFeed(),
  ]);

  const totals = {
    totalUsers: adminCount + candidateCount + recruiterCount,

    admins: adminCount,

    candidates: candidateCount,

    recruiters: recruiterCount,

    pendingRecruiters,

    rejectedRecruiters,

    inactiveUsers,

    totalJobs,

    openJobs,

    closedJobs,

    totalApplications,

    applicationsByStatus: {
      pending: pendingApplications,

      shortlisted: shortlistedApplications,

      interview: interviewApplications,

      hired: hiredApplications,

      rejected: rejectedApplications,
    },

    totalInterviews,
  };

  return {
    user: {
      id: user.id,

      name: user.fullName,

      email: user.email,
    },

    totals,

    recentRecruiters,

    pendingApprovals,

    activityFeed,
  };
};

// ============================================
// DATE-RANGE REPORTS (candidate + recruiter)
// GET /api/dashboard/report?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================

const MAX_REPORT_RANGE_DAYS = 366;

const parseReportRange = (from, to) => {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();

  const start = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Invalid date range. Use YYYY-MM-DD format.");
    error.statusCode = 400;
    throw error;
  }

  if (start > end) {
    const error = new Error("From date cannot be after to date.");
    error.statusCode = 400;
    throw error;
  }

  const days = (end - start) / (24 * 60 * 60 * 1000);

  if (days > MAX_REPORT_RANGE_DAYS) {
    const error = new Error("Date range cannot exceed 12 months.");
    error.statusCode = 400;
    throw error;
  }

  return { from: start, to: end };
};

const countByStatus = (items) => {
  const byStatus = {};

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
  }

  return byStatus;
};

export const getReportData = async (userId, { from, to } = {}) => {
  const user = await findUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const range = parseReportRange(from, to);

  if (user.role === "candidate") {
    return getCandidateReportData(user, range);
  }

  if (user.role === "recruiter") {
    return getRecruiterReportData(user, range);
  }

  const error = new Error("Reports are available for candidates and recruiters.");
  error.statusCode = 403;
  throw error;
};

const getCandidateReportData = async (user, { from, to }) => {
  const applications = await getCandidateApplicationsInRange(
    user.id,
    from,
    to,
  );

  const byStatus = countByStatus(applications);

  // Accepted = hired or offer received; reviewing = pending or screening
  const totals = {
    applied: applications.length,
    reviewing: (byStatus.pending ?? 0) + (byStatus.screening ?? 0),
    shortlisted: byStatus.shortlisted ?? 0,
    interview: byStatus.interview ?? 0,
    accepted: (byStatus.hired ?? 0) + (byStatus.offer ?? 0),
    rejected: byStatus.rejected ?? 0,
  };

  return {
    role: "candidate",
    range: { from: from.toISOString(), to: to.toISOString() },
    totals,
    byStatus,
    applications: applications.map((a) => ({
      id: a.id,
      jobId: a.jobId,
      position: a.position,
      company: a.company,
      location: a.location,
      type: a.type,
      status: a.status,
      appliedAt: a.appliedAt,
    })),
  };
};

const getRecruiterReportData = async (user, { from, to }) => {
  const [applications, jobsPosted] = await Promise.all([
    getRecruiterApplicationsInRange(user.id, from, to),
    getRecruiterJobsInRange(user.id, from, to),
  ]);

  const byStatus = countByStatus(applications);

  const totals = {
    jobsPosted: jobsPosted.length,
    applications: applications.length,
    reviewing: (byStatus.pending ?? 0) + (byStatus.screening ?? 0),
    shortlisted: byStatus.shortlisted ?? 0,
    interview: byStatus.interview ?? 0,
    hired: (byStatus.hired ?? 0) + (byStatus.offer ?? 0),
    rejected: byStatus.rejected ?? 0,
  };

  // Per-job breakdown from the in-range applications
  const byJobMap = new Map();

  for (const app of applications) {
    if (!byJobMap.has(app.jobId)) {
      byJobMap.set(app.jobId, {
        jobId: app.jobId,
        title: app.position,
        company: app.company,
        applications: 0,
        shortlisted: 0,
        hired: 0,
        rejected: 0,
      });
    }

    const row = byJobMap.get(app.jobId);
    row.applications += 1;
    if (app.status === "shortlisted") row.shortlisted += 1;
    if (app.status === "hired" || app.status === "offer") row.hired += 1;
    if (app.status === "rejected") row.rejected += 1;
  }

  return {
    role: "recruiter",
    range: { from: from.toISOString(), to: to.toISOString() },
    totals,
    byStatus,
    byJob: [...byJobMap.values()].sort(
      (a, b) => b.applications - a.applications,
    ),
    jobsPosted: jobsPosted.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      status: j.status,
      createdAt: j.createdAt,
    })),
    applications: applications.map((a) => ({
      id: a.id,
      jobId: a.jobId,
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail,
      position: a.position,
      company: a.company,
      status: a.status,
      appliedAt: a.appliedAt,
    })),
  };
};

// ============================================
// ADMIN REPORTS AGGREGATES
// ============================================

export const getAdminReportsData = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    newUsers30d,
    newJobs30d,
    newApplications30d,
    applicationsByStatus,
    jobsOpen,
    jobsClosed,
    topJobs,
  ] = await Promise.all([
    countNewUsersSince(since),

    countNewJobsSince(since),

    countNewApplicationsSince(since),

    Promise.all([
      countApplicationsByStatus("pending"),

      countApplicationsByStatus("shortlisted"),

      countApplicationsByStatus("interview"),

      countApplicationsByStatus("hired"),

      countApplicationsByStatus("rejected"),
    ]).then(
      ([pending, shortlisted, interview, hired, rejected]) => ({
        pending,

        shortlisted,

        interview,

        hired,

        rejected,
      }),
    ),

    countJobsByStatus("open"),

    countJobsByStatus("closed"),

    getTopJobsByApplications(5),
  ]);

  return {
    growth: {
      last30Days: {
        newUsers: newUsers30d,

        newJobs: newJobs30d,

        newApplications: newApplications30d,
      },
    },

    applicationsByStatus,

    jobsByStatus: {
      open: jobsOpen,

      closed: jobsClosed,
    },

    topJobs: topJobs.map((job) => ({
      id: job.id,

      title: job.title,

      company: job.company,

      status: job.status,

      applicantCount: Number(job.applicantCount ?? 0),
    })),
  };
};
