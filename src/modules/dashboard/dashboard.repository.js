import { eq, desc, count, and, gte, lte, isNull, inArray } from "drizzle-orm";

import { db } from "../../db/index.js";

import { users } from "../../db/schema/users.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { jobs } from "../../db/schema/jobs.js";
import { applications } from "../../db/schema/applications.js";
import { interviews } from "../../db/schema/interviews.js";
import { recruiterProfiles } from "../../db/schema/recruiter-profiles.js";

// ============================================
// GET USER
// ============================================

export const findUserById = async (userId) => {
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
};

// ============================================
// CANDIDATE
// ============================================

// ============================================
// GET CANDIDATE PROFILE
// ============================================

export const findCandidateProfileByUserId = async (userId) => {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  return profile ?? null;
};

// ============================================
// GET CANDIDATE APPLICATION COUNT
// ============================================

export const getApplicationCount = async (candidateId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .where(
      and(
        eq(applications.candidateId, candidateId),
        isNull(applications.deletedAt),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET CANDIDATE INTERVIEW COUNT
// ============================================

export const getInterviewCount = async (candidateId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .where(
      and(
        eq(applications.candidateId, candidateId),
        eq(applications.status, "interview"),
        isNull(applications.deletedAt),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET CANDIDATE RECENT APPLICATIONS
// ============================================

export const getRecentApplications = async (candidateId) => {
  return db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      status: applications.status,
      appliedAt: applications.createdAt,

      position: jobs.title,
      company: jobs.company,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(applications.candidateId, candidateId),
        isNull(applications.deletedAt),
        isNull(jobs.deletedAt),
      ),
    )
    .orderBy(desc(applications.createdAt))
    .limit(5);
};

// ============================================
// GET CANDIDATE UPCOMING INTERVIEWS
// Next live interviews with job context.
// ============================================

export const getUpcomingInterviews = async (candidateId, limit = 5) => {
  return db
    .select({
      id: interviews.id,
      applicationId: interviews.applicationId,
      type: interviews.type,
      status: interviews.status,
      title: interviews.title,
      scheduledAt: interviews.scheduledAt,
      durationMinutes: interviews.durationMinutes,
      meetingLink: interviews.meetingLink,
      location: interviews.location,
      notes: interviews.notes,
      rescheduleStatus: interviews.rescheduleStatus,
      position: jobs.title,
      company: jobs.company,
    })
    .from(interviews)
    .innerJoin(jobs, eq(interviews.jobId, jobs.id))
    .where(
      and(
        eq(interviews.candidateId, candidateId),
        inArray(interviews.status, ["scheduled", "rescheduled"]),
        gte(interviews.scheduledAt, new Date()),
        isNull(interviews.deletedAt),
        isNull(jobs.deletedAt),
      ),
    )
    .orderBy(interviews.scheduledAt)
    .limit(limit);
};

// ============================================
// GET RECOMMENDED JOBS
// ============================================

export const getRecommendedJobs = async (candidateId) => {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      type: jobs.type,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      createdAt: jobs.createdAt,

      applicationStatus: applications.status,
    })
    .from(jobs)
    .leftJoin(
      applications,
      and(
        eq(applications.jobId, jobs.id),
        eq(applications.candidateId, candidateId),
        isNull(applications.deletedAt),
      ),
    )
    .where(and(eq(jobs.status, "open"), isNull(jobs.deletedAt)))
    .orderBy(desc(jobs.createdAt))
    .limit(10);
};

// ============================================
// RECRUITER
// ============================================

// ============================================
// GET RECRUITER TOTAL JOB COUNT
// ============================================

export const getRecruiterJobCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(jobs)
    .where(eq(jobs.recruiterId, recruiterId));

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER OPEN JOB COUNT
// ============================================

export const getRecruiterOpenJobCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(jobs)
    .where(and(eq(jobs.recruiterId, recruiterId), eq(jobs.status, "open")));

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER CLOSED JOB COUNT
// ============================================

export const getRecruiterClosedJobCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(jobs)
    .where(and(eq(jobs.recruiterId, recruiterId), eq(jobs.status, "closed")));

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER APPLICATION COUNT
// ============================================

export const getRecruiterApplicationCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(jobs.recruiterId, recruiterId));

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER PENDING APPLICATION COUNT
// ============================================

export const getRecruiterPendingApplicationCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        eq(applications.status, "pending"),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER SHORTLISTED COUNT
// ============================================

export const getRecruiterShortlistedCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        eq(applications.status, "shortlisted"),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER REJECTED COUNT
// ============================================

export const getRecruiterRejectedCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        eq(applications.status, "rejected"),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECENT RECRUITER APPLICATIONS
// ============================================

export const getRecentRecruiterApplications = async (recruiterId) => {
  return db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,

      jobId: applications.jobId,

      candidateName: users.fullName,

      candidateEmail: users.email,

      position: jobs.title,

      company: jobs.company,

      status: applications.status,

      appliedAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(eq(jobs.recruiterId, recruiterId))
    .orderBy(desc(applications.createdAt))
    .limit(5);
};

// ============================================
// GET RECENT RECRUITER JOBS WITH APPLICANT COUNTS
// ============================================

export const getRecruiterRecentJobsWithCounts = async (recruiterId) => {
  return db
    .select({
      id: jobs.id,

      title: jobs.title,

      company: jobs.company,

      status: jobs.status,

      createdAt: jobs.createdAt,

      applicantCount: count(applications.id),
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(eq(jobs.recruiterId, recruiterId))
    .groupBy(jobs.id)
    .orderBy(desc(jobs.createdAt))
    .limit(5);
};

// ============================================
// GET RECRUITER WEEKLY APPLICATION COUNT
// ============================================

export const getRecruiterWeeklyApplicationCount = async (recruiterId) => {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  );

  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        gte(applications.createdAt, sevenDaysAgo),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER PREV-WEEK APPLICATION COUNT
// (powers the week-over-week trend indicator)
// ============================================

export const getRecruiterPrevWeeklyApplicationCount = async (recruiterId) => {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  );

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  );

  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        gte(applications.createdAt, fourteenDaysAgo),
        lte(applications.createdAt, sevenDaysAgo),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECRUITER HIRED COUNT
// ============================================

export const getRecruiterHiredCount = async (recruiterId) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        eq(applications.status, "hired"),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: COUNT ALL USERS BY ROLE
// ============================================

export const countUsersByRole = async (role) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(users)
    .where(eq(users.role, role));

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: COUNT RECRUITERS BY APPROVAL STATUS
// ============================================

export const countRecruitersByApprovalStatus = async (
  status,
) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(users)
    .where(
      and(
        eq(users.role, "recruiter"),
        eq(users.approvalStatus, status),
      ),
    );

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: COUNT INACTIVE USERS
// ============================================

export const countInactiveUsers = async () => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(users)
    .where(eq(users.isActive, false));

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: COUNT JOBS BY STATUS
// ============================================

export const countJobsByStatus = async (status) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(jobs)
    .where(eq(jobs.status, status));

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: COUNT APPLICATIONS BY STATUS
// ============================================

export const countApplicationsByStatus = async (status) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .where(eq(applications.status, status));

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN: GET RECENT RECRUITERS
// ============================================

export const getRecentRecruitersForAdmin = async (
  limit = 5,
) => {
  return db
    .select({
      id: users.id,

      fullName: users.fullName,

      email: users.email,

      approvalStatus: users.approvalStatus,

      isActive: users.isActive,

      companyName: recruiterProfiles.companyName,

      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(
      recruiterProfiles,
      eq(recruiterProfiles.userId, users.id),
    )
    .where(eq(users.role, "recruiter"))
    .orderBy(desc(users.createdAt))
    .limit(limit);
};

// ============================================
// ADMIN: GET PENDING RECRUITER APPROVALS
// ============================================

export const getPendingRecruitersForAdmin = async () => {
  return db
    .select({
      id: users.id,

      fullName: users.fullName,

      email: users.email,

      approvalStatus: users.approvalStatus,

      companyName: recruiterProfiles.companyName,

      phone: recruiterProfiles.phone,

      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(
      recruiterProfiles,
      eq(recruiterProfiles.userId, users.id),
    )
    .where(
      and(
        eq(users.role, "recruiter"),
        eq(users.approvalStatus, "pending"),
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(8);
};

// ============================================
// ADMIN: ACTIVITY FEED (NEW USERS + APPLICATIONS)
// ============================================

export const getAdminActivityFeed = async () => {
  const recentUsers = await db
    .select({
      id: users.id,

      type: users.role,

      title: users.fullName,

      timestamp: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(8);

  const recentApps = await db
    .select({
      id: applications.id,

      type: applications.status,

      title: jobs.title,

      candidateName: users.fullName,

      timestamp: applications.createdAt,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .orderBy(desc(applications.createdAt))
    .limit(8);

  const feed = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,

      type: "user",

      title:
        u.type === "recruiter"
          ? `New recruiter registered: ${u.title}`
          : `New user registered: ${u.title}`,

      timestamp: u.timestamp,
    })),

    ...recentApps.map((a) => ({
      id: `application-${a.id}`,

      type: "application",

      title: `${a.candidateName} applied for ${a.title}`,

      timestamp: a.timestamp,
    })),
  ]
    .sort(
      (x, y) =>
        new Date(y.timestamp) - new Date(x.timestamp),
    )
    .slice(0, 8);

  return feed;
};

// ============================================
// ADMIN: NEW ITEMS LAST 30 DAYS
// ============================================

const thirtyDaysAgo = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

export const countNewUsersSince = async (since) => {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, since));

  return Number(result?.count ?? 0);
};

export const countNewJobsSince = async (since) => {
  const [result] = await db
    .select({ count: count() })
    .from(jobs)
    .where(gte(jobs.createdAt, since));

  return Number(result?.count ?? 0);
};

export const countNewApplicationsSince = async (since) => {
  const [result] = await db
    .select({ count: count() })
    .from(applications)
    .where(gte(applications.createdAt, since));

  return Number(result?.count ?? 0);
};

// ============================================
// ADMIN REPORTS: TOP JOBS BY APPLICATIONS
// ============================================

export const getTopJobsByApplications = async (limit = 5) => {
  return db
    .select({
      id: jobs.id,

      title: jobs.title,

      company: jobs.company,

      status: jobs.status,

      applicantCount: count(applications.id),
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .groupBy(jobs.id)
    .orderBy(desc(count(applications.id)))
    .limit(limit);
};

// ============================================
// REPORTS: CANDIDATE APPLICATIONS IN DATE RANGE
// ============================================

export const getCandidateApplicationsInRange = async (
  candidateId,
  from,
  to,
) => {
  return db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      status: applications.status,
      appliedAt: applications.createdAt,

      position: jobs.title,
      company: jobs.company,
      location: jobs.location,
      type: jobs.type,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(applications.candidateId, candidateId),
        isNull(applications.deletedAt),
        gte(applications.createdAt, from),
        lte(applications.createdAt, to),
      ),
    )
    .orderBy(desc(applications.createdAt));
};

// ============================================
// REPORTS: RECRUITER APPLICATIONS IN DATE RANGE
// (to any of the recruiter's jobs)
// ============================================

export const getRecruiterApplicationsInRange = async (
  recruiterId,
  from,
  to,
) => {
  return db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,

      jobId: applications.jobId,

      candidateName: users.fullName,

      candidateEmail: users.email,

      position: jobs.title,

      company: jobs.company,

      status: applications.status,

      appliedAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        isNull(applications.deletedAt),
        gte(applications.createdAt, from),
        lte(applications.createdAt, to),
      ),
    )
    .orderBy(desc(applications.createdAt));
};

// ============================================
// REPORTS: RECRUITER JOBS POSTED IN DATE RANGE
// (with applicant counts scoped to the range)
// ============================================

export const getRecruiterJobsInRange = async (
  recruiterId,
  from,
  to,
) => {
  return db
    .select({
      id: jobs.id,

      title: jobs.title,

      company: jobs.company,

      status: jobs.status,

      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
        gte(jobs.createdAt, from),
        lte(jobs.createdAt, to),
      ),
    )
    .orderBy(desc(jobs.createdAt));
};

// ============================================
// ADMIN: COUNT ALL ROWS
// ============================================

export const countAllUsers = async () => {
  const [result] = await db
    .select({ count: count() })
    .from(users);

  return Number(result?.count ?? 0);
};

export const countAllJobs = async () => {
  const [result] = await db
    .select({ count: count() })
    .from(jobs);

  return Number(result?.count ?? 0);
};

export const countAllApplications = async () => {
  const [result] = await db
    .select({ count: count() })
    .from(applications);

  return Number(result?.count ?? 0);
};

export const countAllInterviews = async () => {
  const [result] = await db
    .select({ count: count() })
    .from(interviews);

  return Number(result?.count ?? 0);
};
