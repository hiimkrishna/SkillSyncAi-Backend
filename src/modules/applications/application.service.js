import { and, eq, desc, inArray, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";

import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { users } from "../../db/schema/users.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { resumes } from "../../db/schema/resumes.js";
import { interviews } from "../../db/schema/interviews.js";
import {
  checkEligibility,
  findJobWithFilters,
  estimateExperienceYears,
  bestEducationGrade,
} from "../jobs/job.eligibility.service.js";
import { scoreJob } from "../jobs/job.match.service.js";

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

  // ------------------------------------------
  // Minimum-requirement gate (supervisor mods):
  // the job stays visible, but NOBODY below the bar may apply.
  // The platform floor (match score 80+) always applies; a job's
  // own filters can only tighten further.
  // ------------------------------------------

  const fullJob = await findJobWithFilters(jobId);

  if (fullJob) {
    const eligibility = await checkEligibility(candidateId, fullJob);

    if (!eligibility.eligible) {
      const error = new Error(
        `You do not meet this job's minimum requirements: ${eligibility.reasons.join("; ")}`,
      );
      error.statusCode = 422;
      error.details = eligibility;
      throw error;
    }
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

  const withInterviews = await attachLatestInterviews(
    candidateId,
    results,
  );

  return withInterviews.map((application) => ({
    ...application,

    jobTitle: application.job?.title || "",

    companyName: application.job?.company || "",
  }));
};

// Attach the latest live interview (if any) to each of the
// candidate's applications so one page can show both.
const attachLatestInterviews = async (candidateId, rows) => {
  if (!rows.length) return rows;

  const interviewRows = await db
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
      rescheduleRequest: interviews.rescheduleRequest,
      rescheduleStatus: interviews.rescheduleStatus,
    })
    .from(interviews)
    .where(
      and(
        eq(interviews.candidateId, candidateId),
        isNull(interviews.deletedAt),
      ),
    )
    .orderBy(desc(interviews.scheduledAt));

  const latestByApplication = new Map();
  for (const interview of interviewRows) {
    const current = latestByApplication.get(interview.applicationId);
    // Prefer a live interview over a finished one.
    const live = ["scheduled", "rescheduled"].includes(interview.status);
    if (!current || (live && !["scheduled", "rescheduled"].includes(current.status))) {
      latestByApplication.set(interview.applicationId, interview);
    }
  }

  return rows.map((row) => ({
    ...row,
    interview: latestByApplication.get(row.id) ?? null,
  }));
};

// ============================================
// GET RECRUITER APPLICATIONS
// ============================================

// Snapshot helpers for applicant filtering (profile data already
// enriched onto each row by attachCandidateDetails).
const rowSkillKeys = (row) => {
  const skills = row?.candidate?.skills;
  if (!Array.isArray(skills)) return [];
  const keys = [];
  for (const item of skills) {
    const raw = typeof item === "string" ? item : (item?.name ?? "");
    const cleaned = String(raw).trim().toLowerCase();
    if (cleaned) keys.push(cleaned);
  }
  return keys;
};

const rowToSnapshot = (row) => ({
  skills: rowSkillKeys(row).map((key) => ({ key, original: key })),
  headline: row?.candidate?.headline || "",
  bio: row?.candidate?.bio || "",
  location: row?.candidate?.location || "",
  experience: Array.isArray(row?.candidate?.experience)
    ? row.candidate.experience
    : [],
});

const parseSkillsFilter = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[,;|]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
};

export const getRecruiterApplications = async (recruiterId, filters = {}) => {
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

  let detailed = await attachCandidateDetails(enriched);

  // ------------------------------------------
  // Applicant filters (supervisor mod #4)
  // ------------------------------------------

  const {
    jobId: filterJobId,
    status: filterStatus,
    skills: filterSkills,
    education: filterEducation,
    minGrade: filterMinGrade,
    minExperience: filterMinExperience,
    minScore: filterMinScore,
  } = filters;

  if (filterJobId) {
    detailed = detailed.filter((row) => row.jobId === filterJobId);
  }

  if (filterStatus) {
    detailed = detailed.filter((row) => row.status === filterStatus);
  }

  const wantedSkills = parseSkillsFilter(filterSkills);
  if (wantedSkills.length > 0) {
    detailed = detailed.filter((row) => {
      const keys = rowSkillKeys(row);
      return wantedSkills.every((wanted) =>
        keys.some((k) => k.includes(wanted) || wanted.includes(k)),
      );
    });
  }

  if (filterEducation && String(filterEducation).trim()) {
    const keyword = String(filterEducation).trim().toLowerCase();
    detailed = detailed.filter((row) =>
      JSON.stringify(row?.candidate?.education ?? [])
        .toLowerCase()
        .includes(keyword),
    );
  }

  if (filterMinGrade !== undefined && filterMinGrade !== null && filterMinGrade !== "") {
    const minGrade = Number(filterMinGrade);
    if (Number.isFinite(minGrade)) {
      detailed = detailed.filter((row) => {
        const best = bestEducationGrade(row?.candidate?.education);
        return best !== null && best >= minGrade;
      });
    }
  }

  if (
    filterMinExperience !== undefined &&
    filterMinExperience !== null &&
    filterMinExperience !== ""
  ) {
    const minExp = Number(filterMinExperience);
    if (Number.isFinite(minExp) && minExp > 0) {
      detailed = detailed.filter(
        (row) =>
          estimateExperienceYears(row?.candidate?.experience) >= minExp,
      );
    }
  }

  if (
    filterMinScore !== undefined &&
    filterMinScore !== null &&
    filterMinScore !== ""
  ) {
    const minScore = Number(filterMinScore);
    if (Number.isFinite(minScore) && minScore > 0) {
      detailed = detailed
        .map((row) => {
          const { matchScore } = scoreJob(rowToSnapshot(row), {
            title: row?.job?.title ?? "",
            description: "",
            requirements: wantedSkills.join(", "),
          });
          return { ...row, matchScore };
        })
        .filter((row) => row.matchScore >= minScore);
    }
  }

  return detailed;
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
