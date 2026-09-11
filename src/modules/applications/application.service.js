import { and, eq, desc, inArray, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";

import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { users } from "../../db/schema/users.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { resumes } from "../../db/schema/resumes.js";

// ============================================
// ATTACH CANDIDATE PROFILE + RESUME
// (for recruiter review screens)
// ============================================

const attachCandidateDetails = async (rows) => {
  if (!rows.length) {
    return rows;
  }

  const candidateIds = [
    ...new Set(rows.map((row) => row.candidateId)),
  ];

  const profiles = await db
    .select({
      userId: candidateProfiles.userId,

      phone: candidateProfiles.phone,

      location: candidateProfiles.location,

      headline: candidateProfiles.headline,

      bio: candidateProfiles.bio,

      skills: candidateProfiles.skills,

      experience: candidateProfiles.experience,

      education: candidateProfiles.education,

      certifications: candidateProfiles.certifications,
    })
    .from(candidateProfiles)
    .where(inArray(candidateProfiles.userId, candidateIds));

  const profileMap = new Map(
    profiles.map((profile) => [profile.userId, profile]),
  );

  const resumeRows = await db
    .select({
      id: resumes.id,

      candidateId: resumes.candidateId,

      fileName: resumes.fileName,

      fileUrl: resumes.fileUrl,

      createdAt: resumes.createdAt,
    })
    .from(resumes)
    .where(inArray(resumes.candidateId, candidateIds))
    .orderBy(desc(resumes.createdAt));

  const resumeMap = new Map();

  for (const resume of resumeRows) {
    if (!resumeMap.has(resume.candidateId)) {
      resumeMap.set(resume.candidateId, {
        fileName: resume.fileName,

        url: resume.fileUrl,

        uploadedAt: resume.createdAt,
      });
    }
  }

  return rows.map((row) => ({
    ...row,

    candidate: {
      ...(row.candidate ?? {}),

      ...(profileMap.get(row.candidateId) ?? {}),
    },

    resume: resumeMap.get(row.candidateId) ?? null,
  }));
};

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
      applicationDeadline: jobs.applicationDeadline,
    })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
    .limit(1);

  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  // Auto-off: deadline passed → treat as closed
  if (job.applicationDeadline) {
    const deadlineMs = new Date(job.applicationDeadline).getTime();
    if (!Number.isNaN(deadlineMs) && deadlineMs < Date.now()) {
      const error = new Error("Application deadline has passed");
      error.statusCode = 410;
      throw error;
    }
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
        isNull(applications.deletedAt),
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

      aiEvaluation: applications.aiEvaluation,

      aiEvaluatedAt: applications.aiEvaluatedAt,

      interviewQuestions: applications.interviewQuestions,

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
        applicationDeadline: jobs.applicationDeadline,
      },
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

      aiEvaluation: applications.aiEvaluation,

      aiEvaluatedAt: applications.aiEvaluatedAt,

      interviewQuestions: applications.interviewQuestions,

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
        applicationDeadline: jobs.applicationDeadline,
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
    .where(
      and(
        eq(jobs.recruiterId, recruiterId),
        isNull(applications.deletedAt),
        isNull(jobs.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .orderBy(desc(applications.createdAt));

  const enriched = results.map((application) => ({
    ...application,

    candidateName: application.candidate?.fullName || "",

    candidateEmail: application.candidate?.email || "",

    jobTitle: application.job?.title || "",

    companyName: application.job?.company || "",
  }));

  return attachCandidateDetails(enriched);
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

      aiEvaluation: applications.aiEvaluation,

      aiEvaluatedAt: applications.aiEvaluatedAt,

      interviewQuestions: applications.interviewQuestions,

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
        applicationDeadline: jobs.applicationDeadline,
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
    .where(
      and(
        eq(applications.id, applicationId),
        isNull(applications.deletedAt),
        isNull(jobs.deletedAt),
      ),
    )
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

  const enriched = [
    {
      ...application,

      candidateName: application.candidate?.fullName || "",

      candidateEmail: application.candidate?.email || "",

      jobTitle: application.job?.title || "",

      companyName: application.job?.company || "",
    },
  ];

  const [result] = await attachCandidateDetails(enriched);

  return result;
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
