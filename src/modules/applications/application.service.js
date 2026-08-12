// src/modules/applications/application.service.js

import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { users } from "../../db/schema/users.js";

// ============================================
// APPLY TO JOB
// ============================================

export const applyToJob = async (candidateId, jobId) => {
  // 1. Check candidate
  const [candidate] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  if (candidate.role !== "candidate") {
    throw new Error("User is not a candidate");
  }

  // 2. Check job
  const [job] = await db
    .select({
      id: jobs.id,
      status: jobs.status,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  // 3. Job must be open
  if (job.status !== "open") {
    throw new Error("Job is not open for applications");
  }

  // 4. Check duplicate application
  const [existingApplication] = await db
    .select({
      id: applications.id,
    })
    .from(applications)
    .where(
      and(
        eq(applications.candidateId, candidateId),
        eq(applications.jobId, jobId),
      ),
    )
    .limit(1);

  if (existingApplication) {
    throw new Error("Already applied to this job");
  }

  // 5. Create application
  const [application] = await db
    .insert(applications)
    .values({
      candidateId,
      jobId,
      status: "pending",
    })
    .returning();

  return application;
};

// ============================================
// GET MY APPLICATIONS - CANDIDATE
// ============================================

export const getMyApplications = async (candidateId) => {
  const [candidate] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  if (candidate.role !== "candidate") {
    throw new Error("User is not a candidate");
  }

  return db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
      },
    })
    .from(applications)
    .innerJoin(
      jobs,
      eq(applications.jobId, jobs.id),
    )
    .where(eq(applications.candidateId, candidateId))
    .orderBy(applications.createdAt);
};

// ============================================
// GET RECRUITER APPLICATIONS
// ============================================

export const getRecruiterApplications = async (recruiterId) => {
  // Check recruiter
  const [recruiter] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, recruiterId))
    .limit(1);

  if (!recruiter) {
    throw new Error("Recruiter not found");
  }

  if (recruiter.role !== "recruiter") {
    throw new Error("User is not a recruiter");
  }

  // Get applications belonging to recruiter's jobs
  return db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
      },

      candidate: {
        id: users.id,
        email: users.email,
      },
    })
    .from(applications)
    .innerJoin(
      jobs,
      eq(applications.jobId, jobs.id),
    )
    .innerJoin(
      users,
      eq(applications.candidateId, users.id),
    )
    .where(eq(jobs.recruiterId, recruiterId))
    .orderBy(applications.createdAt);
};

// ============================================
// GET SINGLE APPLICATION
// ============================================

export const getApplicationById = async (
  applicationId,
  userId,
  userRole,
) => {
  const [application] = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
      },

      candidate: {
        id: users.id,
        email: users.email,
      },
    })
    .from(applications)
    .innerJoin(
      jobs,
      eq(applications.jobId, jobs.id),
    )
    .innerJoin(
      users,
      eq(applications.candidateId, users.id),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    return null;
  }

  // Candidate can only see their own application
  if (userRole === "candidate") {
    if (application.candidate.id !== userId) {
      return null;
    }
  }

  // Recruiter can only see applications for their jobs
  if (userRole === "recruiter") {
    const [job] = await db
      .select({
        recruiterId: jobs.recruiterId,
      })
      .from(jobs)
      .where(eq(jobs.id, application.job.id))
      .limit(1);

    if (!job || job.recruiterId !== userId) {
      return null;
    }
  }

  return application;
};

// ============================================
// UPDATE APPLICATION STATUS
// ============================================

export const updateApplicationStatus = async (
  applicationId,
  userId,
  userRole,
  status,
) => {
  // Get application
  const [application] = await db
    .select({
      id: applications.id,
      candidateId: applications.candidateId,
      jobId: applications.jobId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    throw new Error("Application not found");
  }

  // ==========================================
  // RECRUITER
  // ==========================================

  if (userRole === "recruiter") {
    const [job] = await db
      .select({
        id: jobs.id,
        recruiterId: jobs.recruiterId,
      })
      .from(jobs)
      .where(eq(jobs.id, application.jobId))
      .limit(1);

    if (!job) {
      throw new Error("Job not found");
    }

    if (job.recruiterId !== userId) {
      throw new Error(
        "You are not authorized to update this application",
      );
    }
  }

  // ==========================================
  // CANDIDATE
  // ==========================================

  if (userRole === "candidate") {
    if (application.candidateId !== userId) {
      throw new Error(
        "You are not authorized to update this application",
      );
    }
  }

  // ==========================================
  // UPDATE
  // ==========================================

  const [updatedApplication] = await db
    .update(applications)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning();

  return updatedApplication;
};