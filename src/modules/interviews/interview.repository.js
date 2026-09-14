import { and, desc, eq, gt, isNull, lte, inArray, ne } from "drizzle-orm";

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
        applicationDeadline: jobs.applicationDeadline,
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

    // Only this recruiter's interviews (exclude soft-deleted)
    .where(
      and(
        eq(interviews.recruiterId, recruiterId),
        isNull(interviews.deletedAt),
        isNull(jobs.deletedAt),
      ),
    )

    .orderBy(desc(interviews.scheduledAt));
};

// ============================================
// GET CANDIDATE INTERVIEWS (calendar)
// WITH JOB + RECRUITER INFO
// ============================================

export const getInterviewsByCandidate = async (candidateId) => {
  return await db
    .select({
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

      rescheduleRequest: interviews.rescheduleRequest,
      rescheduleStatus: interviews.rescheduleStatus,

      createdAt: interviews.createdAt,
      updatedAt: interviews.updatedAt,

      recruiter: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        applicationDeadline: jobs.applicationDeadline,
      },

      application: {
        id: applications.id,
        status: applications.status,
      },
    })
    .from(interviews)
    .innerJoin(users, eq(interviews.recruiterId, users.id))
    .innerJoin(jobs, eq(interviews.jobId, jobs.id))
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .where(
      and(
        eq(interviews.candidateId, candidateId),
        isNull(interviews.deletedAt),
        isNull(jobs.deletedAt),
      ),
    )
    .orderBy(desc(interviews.scheduledAt));
};

// ============================================
// GET INTERVIEW BY ID + CANDIDATE
// ============================================

export const getInterviewByIdAndCandidate = async (
  interviewId,
  candidateId,
) => {
  const [interview] = await db
    .select()
    .from(interviews)
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.candidateId, candidateId),
        isNull(interviews.deletedAt),
      ),
    )
    .limit(1);

  return interview || null;
};

// ============================================
// CANDIDATE RESCHEDULE REQUEST
// ============================================

export const saveRescheduleRequest = async (
  interviewId,
  candidateId,
  { proposedAt, reason, type, meetingLink, location },
) => {
  const [interview] = await db
    .update(interviews)
    .set({
      rescheduleRequest: {
        proposedAt: new Date(proposedAt).toISOString(),
        reason: reason?.trim() || null,
        requestedAt: new Date().toISOString(),
        // Optional mode change requested by the candidate
        // (e.g. switch in-person ↔ virtual).
        ...(type ? { type } : {}),
        ...(meetingLink !== undefined ? { meetingLink: meetingLink?.trim() || null } : {}),
        ...(location !== undefined ? { location: location?.trim() || null } : {}),
      },
      rescheduleStatus: "pending",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.candidateId, candidateId),
        isNull(interviews.deletedAt),
      ),
    )
    .returning();

  return interview || null;
};

// ============================================
// RECRUITER RESCHEDULE RESPONSE
// ============================================

export const applyRescheduleDecision = async (
  interviewId,
  recruiterId,
  { decision, scheduledAt, type, meetingLink, location },
) => {
  const patch =
    decision === "approved"
      ? {
          scheduledAt: new Date(scheduledAt),
          status: "rescheduled",
          rescheduleRequest: null,
          rescheduleStatus: "approved",
          reminderSentAt: null,
          ...(type ? { type } : {}),
          ...(meetingLink !== undefined ? { meetingLink } : {}),
          ...(location !== undefined ? { location } : {}),
        }
      : {
          rescheduleStatus: "declined",
        };

  const [interview] = await db
    .update(interviews)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(interviews.id, interviewId),
        eq(interviews.recruiterId, recruiterId),
        isNull(interviews.deletedAt),
      ),
    )
    .returning();

  return interview || null;
};

// ============================================
// INTERVIEWS DUE A 24H REMINDER
// scheduled within the next 24h, never reminded
// ============================================

export const findInterviewsDueReminder = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return await db
    .select({
      id: interviews.id,
      scheduledAt: interviews.scheduledAt,
      durationMinutes: interviews.durationMinutes,
      type: interviews.type,
      meetingLink: interviews.meetingLink,
      location: interviews.location,
      candidate: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      job: {
        title: jobs.title,
        company: jobs.company,
      },
    })
    .from(interviews)
    .innerJoin(users, eq(interviews.candidateId, users.id))
    .innerJoin(jobs, eq(interviews.jobId, jobs.id))
    .where(
      and(
        inArray(interviews.status, ["scheduled", "rescheduled"]),
        gt(interviews.scheduledAt, now),
        lte(interviews.scheduledAt, in24h),
        isNull(interviews.reminderSentAt),
        isNull(interviews.deletedAt),
      ),
    );
};

export const markReminderSent = async (interviewId) => {
  await db
    .update(interviews)
    .set({ reminderSentAt: new Date(), updatedAt: new Date() })
    .where(eq(interviews.id, interviewId));
};

// ============================================
// INTERVIEW PARTIES (for emails)
// ============================================

export const getInterviewParties = async (interview) => {
  const [candidate] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, interview.candidateId))
    .limit(1);

  const [recruiter] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, interview.recruiterId))
    .limit(1);

  const [job] = await db
    .select({ title: jobs.title, company: jobs.company })
    .from(jobs)
    .where(eq(jobs.id, interview.jobId))
    .limit(1);

  return { candidate, recruiter, job };
};

// ============================================
// SUPERSEDE OLDER INTERVIEWS
// One live interview per application: when a new one is scheduled,
// older rows are retired (cancelled + soft-deleted) so only the
// latest ever shows up.
// ============================================

export const supersedeOlderInterviews = async (applicationId, keepId) => {
  const conditions = [
    eq(interviews.applicationId, applicationId),
    isNull(interviews.deletedAt),
  ];

  if (keepId) {
    conditions.push(ne(interviews.id, keepId));
  }

  const retired = await db
    .update(interviews)
    .set({
      status: "cancelled",
      rescheduleRequest: null,
      rescheduleStatus: "none",
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning({ id: interviews.id });

  return retired.length;
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
