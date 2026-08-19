import { and, eq, desc } from "drizzle-orm";

import { db } from "../../db/index.js";

import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { users } from "../../db/schema/users.js";

// ============================================
// APPLY TO JOB
// ============================================

export const applyToJob = async (candidateId, jobId) => {
  const [candidate] = await db
    .select({
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!candidate) {
    const error = new Error("Candidate not found");
    error.statusCode = 404;
    throw error;
  }

  if (candidate.role !== "candidate") {
    const error = new Error("User is not a candidate");
    error.statusCode = 403;
    throw error;
  }

  const [job] = await db
    .select({
      id: jobs.id,
      recruiterId: jobs.recruiterId,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      type: jobs.type,
      status: jobs.status,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== "open") {
    const error = new Error("Job is not open for applications");
    error.statusCode = 400;
    throw error;
  }

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
    const error = new Error("Already applied to this job");
    error.statusCode = 409;
    throw error;
  }

  const [application] = await db
    .insert(applications)
    .values({
      candidateId,
      jobId,
      status: "pending",
    })
    .returning();

  return {
    ...application,

    candidate: {
      id: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
    },

    candidateName: candidate.fullName,
    candidateEmail: candidate.email,

    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      status: job.status,
    },

    jobTitle: job.title,
  };
};

// ============================================
// GET MY APPLICATIONS
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
    const error = new Error("Candidate not found");
    error.statusCode = 404;
    throw error;
  }

  if (candidate.role !== "candidate") {
    const error = new Error("User is not a candidate");
    error.statusCode = 403;
    throw error;
  }

  const results = await db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,
      jobId: applications.jobId,

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

  return results.map((application) => ({
    ...application,

    jobTitle: application.job?.title || "",

    companyName: application.job?.company || "",
  }));
};

// ============================================
// GET RECRUITER APPLICATIONS
// ============================================

export const getRecruiterApplications = async (recruiterId) => {
  console.log("RECRUITER ID:", recruiterId);
  const [recruiter] = await db
    .select({
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, recruiterId))
    .limit(1);

  if (!recruiter) {
    const error = new Error("Recruiter not found");
    error.statusCode = 404;
    throw error;
  }

  if (recruiter.role !== "recruiter") {
    const error = new Error("User is not a recruiter");
    error.statusCode = 403;
    throw error;
  }

  const results = await db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,
      jobId: applications.jobId,

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
    .where(eq(jobs.recruiterId, recruiterId))
    .orderBy(desc(applications.createdAt));

  return results.map((application) => ({
    ...application,

    candidateName: application.candidate?.fullName || "",

    candidateEmail: application.candidate?.email || "",

    jobTitle: application.job?.title || "",

    companyName: application.job?.company || "",
  }));
};

// ============================================
// GET SINGLE APPLICATION
// ============================================

export const getApplicationById = async (applicationId, userId, userRole) => {
  const [application] = await db
    .select({
      id: applications.id,

      candidateId: applications.candidateId,
      jobId: applications.jobId,

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

  if (userRole === "candidate") {
    if (application.candidateId !== userId) {
      return null;
    }
  }

  if (userRole === "recruiter") {
    if (application.job.recruiterId !== userId) {
      return null;
    }
  }

  return {
    ...application,

    candidateName: application.candidate?.fullName || "",

    candidateEmail: application.candidate?.email || "",

    jobTitle: application.job?.title || "",

    companyName: application.job?.company || "",
  };
};

// ============================================
// UPDATE APPLICATION STATUS
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
  if (userRole !== "recruiter") {
    const error = new Error("Only recruiters can update application status");

    error.statusCode = 403;

    throw error;
  }

  const [application] = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  const [job] = await db
    .select({
      id: jobs.id,
      recruiterId: jobs.recruiterId,
    })
    .from(jobs)
    .where(eq(jobs.id, application.jobId))
    .limit(1);

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.recruiterId !== userId) {
    const error = new Error(
      "You are not authorized to update this application",
    );

    error.statusCode = 403;

    throw error;
  }

  const updateData = {
    status,
    updatedAt: new Date(),
  };

  if (status === "rejected") {
    updateData.rejectionReason = rejectionReason?.trim() || null;
  }

  if (status === "shortlisted") {
    updateData.shortlistNotes = shortlistNotes?.trim() || null;

    updateData.shortlistPriority = shortlistPriority || "medium";
  }

  if (status === "interview") {
    updateData.interviewDetails = interviewDetails || null;
  }

  if (status === "offer") {
    updateData.offerDetails = offerDetails || null;
  }

  const [updatedApplication] = await db
    .update(applications)
    .set(updateData)
    .where(eq(applications.id, applicationId))
    .returning();

  return updatedApplication;
};
