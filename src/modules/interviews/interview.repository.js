import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/index.js";

import { interviews } from "../../db/schema/interviews.js";
import { applications } from "../../db/schema/applications.js";
import { users } from "../../db/schema/users.js";
import { jobs } from "../../db/schema/jobs.js";

// ============================================
// CREATE INTERVIEW
// ============================================

export const createInterview = async (data) => {
  const [interview] = await db.insert(interviews).values(data).returning();

  return interview;
};

// ============================================
// GET RECRUITER INTERVIEWS
// WITH CANDIDATE + JOB + APPLICATION
// ============================================

export const getInterviewsByRecruiter = async (recruiterId) => {
  return await db
    .select({
      // ========================================
      // INTERVIEW
      // ========================================

      id: interviews.id,
      applicationId: interviews.applicationId,
      candidateId: interviews.candidateId,
      recruiterId: interviews.recruiterId,
      jobId: interviews.jobId,

      type: interviews.type,
      status: interviews.status,
      title: interviews.title,

      scheduledAt: interviews.scheduledAt,
      durationMinutes: interviews.durationMinutes,

      meetingLink: interviews.meetingLink,
      location: interviews.location,
      notes: interviews.notes,

      createdAt: interviews.createdAt,
      updatedAt: interviews.updatedAt,

      // ========================================
      // CANDIDATE
      // ========================================

      candidate: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },

      // ========================================
      // JOB
      // ========================================

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
      },

      // ========================================
      // APPLICATION
      // ========================================

      application: {
        id: applications.id,
        status: applications.status,
      },
    })
    .from(interviews)

    // Interview → Candidate
    .innerJoin(users, eq(interviews.candidateId, users.id))

    // Interview → Job
    .innerJoin(jobs, eq(interviews.jobId, jobs.id))

    // Interview → Application
    .innerJoin(applications, eq(interviews.applicationId, applications.id))

    // Only this recruiter's interviews
    .where(eq(interviews.recruiterId, recruiterId))

    .orderBy(desc(interviews.scheduledAt));
};

// ============================================
// GET INTERVIEW BY ID
// ============================================

export const getInterviewById = async (interviewId) => {
  const [interview] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);

  return interview || null;
};

// ============================================
// GET INTERVIEW BY ID + RECRUITER
// ============================================

export const getInterviewByIdAndRecruiter = async (
  interviewId,
  recruiterId,
) => {
  const [interview] = await db
    .select()
    .from(interviews)
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.recruiterId, recruiterId),
      ),
    )
    .limit(1);

  return interview || null;
};

// ============================================
// UPDATE INTERVIEW
// ============================================

export const updateInterview = async (interviewId, recruiterId, data) => {
  const [interview] = await db
    .update(interviews)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.recruiterId, recruiterId),
      ),
    )
    .returning();

  return interview || null;
};

// ============================================
// CANCEL INTERVIEW
// ============================================

export const cancelInterview = async (interviewId, recruiterId) => {
  const [interview] = await db
    .update(interviews)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.recruiterId, recruiterId),
      ),
    )
    .returning();

  return interview || null;
};

// ============================================
// COMPLETE INTERVIEW
// ============================================

export const completeInterview = async (interviewId, recruiterId) => {
  const [interview] = await db
    .update(interviews)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.recruiterId, recruiterId),
      ),
    )
    .returning();

  return interview || null;
};
