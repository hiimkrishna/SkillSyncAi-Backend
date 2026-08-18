import {
  findUserById,
  findCandidateProfileByUserId,
  getApplicationCount,
  getInterviewCount,
  getRecentApplications,
  getRecommendedJobs,
} from "./dashboard.repository.js";

import { calculateProfileCompletion } from "../../utils/profile-completion.js";
import { getSavedJobsCount } from "../saved-jobs/saved-jobs.service.js";

// ============================================
// GET DASHBOARD DATA
// ============================================

export const getDashboardData = async (userId) => {
  // ============================================
  // USER
  // ============================================

  const user = await findUserById(userId);

  if (!user) {
    const error = new Error("User not found");

    error.statusCode = 404;

    throw error;
  }

  // ============================================
  // ROLE CHECK
  // ============================================

  if (user.role !== "candidate") {
    const error = new Error("Candidate access required");

    error.statusCode = 403;

    throw error;
  }

  // ============================================
  // LOAD CANDIDATE PROFILE
  // ============================================

  const profile = await findCandidateProfileByUserId(userId);

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

  if (!skillsCompleted) {
    aiTips.push({
      id: "skills",

      text: "Add relevant technical skills to improve job matching.",

      category: "Skills",

      actionLabel: "Add Skills",

      href: "/profile",
    });
  }

  if (!experienceCompleted) {
    aiTips.push({
      id: "experience",

      text: "Add your work experience to strengthen your candidate profile.",

      category: "Experience",

      actionLabel: "Add Experience",

      href: "/profile",
    });
  }

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
  // FINAL RESPONSE
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
