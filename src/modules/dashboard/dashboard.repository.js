import { eq, desc, count, and } from "drizzle-orm";

import { db } from "../../db/index.js";

import { users } from "../../db/schema/users.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { jobs } from "../../db/schema/jobs.js";
import { applications } from "../../db/schema/applications.js";

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
    .where(eq(users.id, userId))
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
    .where(eq(applications.candidateId, candidateId));

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
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt))
    .limit(5);
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
      ),
    )
    .where(eq(jobs.status, "open"))
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
