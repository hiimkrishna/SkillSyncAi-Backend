import {
  eq,
  desc,
  count,
  and,
} from "drizzle-orm";

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
// GET CANDIDATE PROFILE
// ============================================

export const findCandidateProfileByUserId = async (
  userId
) => {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(
      eq(candidateProfiles.userId, userId)
    )
    .limit(1);

  return profile ?? null;
};

// ============================================
// GET APPLICATION COUNT
// ============================================

export const getApplicationCount = async (
  candidateId
) => {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .where(
      eq(
        applications.candidateId,
        candidateId
      )
    );

  return Number(result?.count ?? 0);
};

// ============================================
// GET RECENT APPLICATIONS
// ============================================

export const getRecentApplications = async (
  candidateId
) => {
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
    .innerJoin(
      jobs,
      eq(applications.jobId, jobs.id)
    )
    .where(
      eq(
        applications.candidateId,
        candidateId
      )
    )
    .orderBy(
      desc(applications.createdAt)
    )
    .limit(5);
};

// ============================================
// GET RECOMMENDED JOBS
// ============================================

export const getRecommendedJobs = async (
  candidateId
) => {
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

      applicationStatus:
        applications.status,
    })
    .from(jobs)
    .leftJoin(
      applications,
      and(
        eq(
          applications.jobId,
          jobs.id
        ),
        eq(
          applications.candidateId,
          candidateId
        )
      )
    )
    .where(
      eq(jobs.status, "open")
    )
    .orderBy(
      desc(jobs.createdAt)
    )
    .limit(10);
};
// ============================================
// GET INTERVIEW COUNT
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
        eq(applications.status, "interview")
      )
    );

  return Number(result?.count ?? 0);
};