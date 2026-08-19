// src/modules/applications/application.service.js

import { and, eq, desc } from "drizzle-orm";

import { db } from "../../db/index.js";

import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { users } from "../../db/schema/users.js";

// ============================================
// APPLY TO JOB
// ============================================

export const applyToJob = async (candidateId, jobId) => {
  // ============================================
  // CHECK CANDIDATE
  // ============================================

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

  // ============================================
  // CHECK JOB
  // ============================================

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

  // ============================================
  // JOB MUST BE OPEN
  // ============================================

  if (job.status !== "open") {
    throw new Error("Job is not open for applications");
  }

  // ============================================
  // CHECK DUPLICATE APPLICATION
  // ============================================

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

  // ============================================
  // CREATE APPLICATION
  // ============================================

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
  // ============================================
  // CHECK CANDIDATE
  // ============================================

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

  // ============================================
  // GET APPLICATIONS
  // ============================================

  return db
    .select({
      id: applications.id,

      status: applications.status,

      rejectionReason: applications.rejectionReason,

      shortlistNotes: applications.shortlistNotes,

      shortlistPriority: applications.shortlistPriority,

      interviewDetails: applications.interviewDetails,

      offerDetails: applications.offerDetails,

      createdAt: applications.createdAt,

      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
      },
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt));
};

// ============================================
// GET RECRUITER APPLICATIONS
// ============================================

export const getRecruiterApplications = async (recruiterId) => {
  // ============================================
  // CHECK RECRUITER
  // ============================================

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

  // ============================================
  // GET APPLICATIONS
  // BELONGING TO RECRUITER'S JOBS
  // ============================================

  return db
    .select({
      id: applications.id,

      status: applications.status,

      rejectionReason: applications.rejectionReason,

      shortlistNotes: applications.shortlistNotes,

      shortlistPriority: applications.shortlistPriority,

      interviewDetails: applications.interviewDetails,

      offerDetails: applications.offerDetails,

      createdAt: applications.createdAt,

      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
      },

      candidate: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(eq(jobs.recruiterId, recruiterId))
    .orderBy(desc(applications.createdAt));
};

// ============================================
// GET SINGLE APPLICATION
// ============================================

export const getApplicationById = async (applicationId, userId, userRole) => {
  // ============================================
  // GET APPLICATION
  // ============================================

  const [application] = await db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,

      status: applications.status,

      rejectionReason: applications.rejectionReason,

      shortlistNotes: applications.shortlistNotes,

      shortlistPriority: applications.shortlistPriority,

      interviewDetails: applications.interviewDetails,

      offerDetails: applications.offerDetails,

      createdAt: applications.createdAt,

      updatedAt: applications.updatedAt,

      job: {
        id: jobs.id,
        recruiterId: jobs.recruiterId,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        type: jobs.type,
        status: jobs.status,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
      },

      candidate: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(applications.candidateId, users.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    return null;
  }

  // ============================================
  // CANDIDATE ACCESS
  // ============================================

  if (userRole === "candidate") {
    if (application.candidateId !== userId) {
      return null;
    }
  }

  // ============================================
  // RECRUITER ACCESS
  // ============================================

  if (userRole === "recruiter") {
    if (application.job.recruiterId !== userId) {
      return null;
    }
  }

  // ============================================
  // RETURN CLEAN RESPONSE
  // ============================================

  return {
    id: application.id,

    status: application.status,

    rejectionReason: application.rejectionReason,

    shortlistNotes: application.shortlistNotes,

    shortlistPriority: application.shortlistPriority,

    interviewDetails: application.interviewDetails,

    offerDetails: application.offerDetails,

    createdAt: application.createdAt,

    updatedAt: application.updatedAt,

    job: {
      id: application.job.id,
      title: application.job.title,
      company: application.job.company,
      location: application.job.location,
      type: application.job.type,
      status: application.job.status,
      salaryMin: application.job.salaryMin,
      salaryMax: application.job.salaryMax,
    },

    candidate: {
      id: application.candidate.id,
      fullName: application.candidate.fullName,
      email: application.candidate.email,
    },
  };
};

// ============================================
// UPDATE APPLICATION STATUS + DETAILS
// ============================================

export const updateApplicationStatus = async (
  applicationId,
  userId,
  userRole,
  {
    status,
    rejectionReason,
    shortlistNotes,
    shortlistPriority,
    interviewDetails,
    offerDetails,
  },
) => {
  // ============================================
  // ONLY RECRUITER CAN UPDATE
  // ============================================

  if (userRole !== "recruiter") {
    throw new Error("Only recruiters can update application status");
  }

  // ============================================
  // GET APPLICATION
  // ============================================

  const [application] = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    throw new Error("Application not found");
  }

  // ============================================
  // GET JOB
  // ============================================

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

  // ============================================
  // CHECK OWNERSHIP
  // ============================================

  if (job.recruiterId !== userId) {
    throw new Error("You are not authorized to update this application");
  }

  // ============================================
  // BUILD UPDATE DATA
  // ============================================

  const updateData = {
    status,
    updatedAt: new Date(),
  };

  // ============================================
  // REJECTION
  // ============================================

  if (status === "rejected") {
    updateData.rejectionReason = rejectionReason?.trim() || null;
  }

  // ============================================
  // SHORTLIST
  // ============================================

  if (status === "shortlisted") {
    updateData.shortlistNotes = shortlistNotes?.trim() || null;

    updateData.shortlistPriority = shortlistPriority || "medium";
  }

  // ============================================
  // INTERVIEW
  // ============================================

  if (status === "interview") {
    updateData.interviewDetails = interviewDetails || null;
  }

  // ============================================
  // OFFER
  // ============================================

  if (status === "offer") {
    updateData.offerDetails = offerDetails || null;
  }

  // ============================================
  // UPDATE DATABASE
  // ============================================

  const [updatedApplication] = await db
    .update(applications)
    .set(updateData)
    .where(eq(applications.id, applicationId))
    .returning();

  return updatedApplication;
};
