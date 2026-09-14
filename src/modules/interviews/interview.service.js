import {
  createInterview,
  getInterviewsByRecruiter,
  getInterviewsByCandidate,
  getInterviewByIdAndRecruiter,
  getInterviewByIdAndCandidate,
  updateInterview,
  cancelInterview,
  completeInterview,
  saveRescheduleRequest,
  applyRescheduleDecision,
  supersedeOlderInterviews,
  findInterviewsDueReminder,
  markReminderSent,
  getInterviewParties,
} from "./interview.repository.js";

import { getApplicationById } from "../applications/application.service.js";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";
import { applications } from "../../db/schema/applications.js";
import { and, eq, inArray } from "drizzle-orm";

import {
  sendInterviewScheduledEmail,
  sendInterviewUpdatedEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
  sendRescheduleRequestEmail,
  sendRescheduleDecisionEmail,
} from "../../utils/email.js";

// Emails must never break the API response.
const safeSendEmail = async (promise) => {
  try {
    return await promise;
  } catch (error) {
    console.error("[email] send failed:", error.message);
    return { delivered: false, reason: error.message };
  }
};

// Keep the application in step with the interview: once an interview
// exists for an application, the application is at the "interview"
// stage — never left behind on pending/screening/shortlisted.
// Terminal stages (rejected/offer/hired) are never overwritten.
const syncApplicationToInterviewStage = async (applicationId) => {
  try {
    await db
      .update(applications)
      .set({ status: "interview", updatedAt: new Date() })
      .where(
        and(
          eq(applications.id, applicationId),
          inArray(applications.status, [
            "pending",
            "screening",
            "shortlisted",
          ]),
        ),
      );
  } catch (error) {
    console.error("[interviews] status sync failed:", error.message);
  }
};

// ============================================
// SCHEDULE INTERVIEW
// ============================================

export const scheduleInterview = async (recruiterId, data) => {
  const {
    applicationId,
    type,
    title,
    scheduledAt,
    durationMinutes,
    meetingLink,
    location,
    notes,
  } = data;

  // --------------------------------------------
  // REQUIRED FIELDS
  // --------------------------------------------

  if (!applicationId || !type || !scheduledAt) {
    const error = new Error("applicationId, type and scheduledAt are required");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // GET APPLICATION
  // --------------------------------------------

  const application = await getApplicationById(
    applicationId,
    recruiterId,
    "recruiter",
  );

  if (!application) {
    const error = new Error("Application not found or you are not authorized");

    error.statusCode = 404;

    throw error;
  }

  // --------------------------------------------
  // GET RELATED IDs FROM APPLICATION
  // --------------------------------------------

  const candidateId = application.candidateId;

  const jobId = application.jobId;

  // --------------------------------------------
  // VALIDATE INTERVIEW TYPE
  // --------------------------------------------

  const allowedTypes = ["online", "in_person", "phone"];

  if (!allowedTypes.includes(type)) {
    const error = new Error("Invalid interview type");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // VALIDATE DATE
  // --------------------------------------------

  const interviewDate = new Date(scheduledAt);

  if (Number.isNaN(interviewDate.getTime())) {
    const error = new Error("Invalid scheduledAt");

    error.statusCode = 400;

    throw error;
  }

  if (interviewDate <= new Date()) {
    const error = new Error("Interview must be scheduled for a future date");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // VALIDATE AGAINST JOB DEADLINE
  // Interview must be after application deadline
  // --------------------------------------------

  const jobDeadline = application.job?.applicationDeadline;

  if (jobDeadline) {
    const deadlineDate = new Date(jobDeadline);

    if (!Number.isNaN(deadlineDate.getTime()) && interviewDate <= deadlineDate) {
      const error = new Error(
        `Interview must be scheduled after the application deadline (${deadlineDate.toLocaleDateString()})`,
      );

      error.statusCode = 400;

      throw error;
    }
  }

  // --------------------------------------------
  // VALIDATE DURATION
  // --------------------------------------------

  const duration = durationMinutes ?? 60;

  if (!Number.isInteger(duration) || duration <= 0) {
    const error = new Error("durationMinutes must be a positive integer");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // ONLINE INTERVIEW
  // --------------------------------------------

  if (type === "online" && !meetingLink) {
    const error = new Error("Meeting link is required for online interviews");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // IN-PERSON INTERVIEW
  // --------------------------------------------

  if (type === "in_person" && !location) {
    const error = new Error("Location is required for in-person interviews");

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------
  // CREATE INTERVIEW
  // --------------------------------------------

  const interview = await createInterview({
    applicationId,

    candidateId,

    recruiterId,

    jobId,

    type,

    status: "scheduled",

    title: title?.trim() || "Interview",

    scheduledAt: interviewDate,

    durationMinutes: duration,

    meetingLink: meetingLink?.trim() || null,

    location: location?.trim() || null,

    notes: notes?.trim() || null,
  });

  // One live interview per application: retire any older ones so
  // only the latest ever shows up.
  await supersedeOlderInterviews(applicationId, interview.id);

  // The application leaves pending/screening/shortlisted behind —
  // it is now at the interview stage.
  await syncApplicationToInterviewStage(applicationId);

  // Notify the candidate by email (supervisor mod #2).
  const { candidate, job } = await getInterviewParties(interview);

  const email = await safeSendEmail(
    sendInterviewScheduledEmail({
      to: candidate?.email,
      candidateName: candidate?.fullName,
      jobTitle: job?.title ?? application.job?.title,
      company: job?.company ?? application.job?.company,
      scheduledAt: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      type: interview.type,
      meetingLink: interview.meetingLink,
      location: interview.location,
      notes: interview.notes,
    }),
  );

  return { ...interview, email };
};

// ============================================
// GET RECRUITER INTERVIEWS
// ============================================

export const getRecruiterInterviews = async (recruiterId) => {
  return await getInterviewsByRecruiter(recruiterId);
};

// ============================================
// GET SINGLE INTERVIEW
// ============================================

export const getRecruiterInterviewById = async (interviewId, recruiterId) => {
  const interview = await getInterviewByIdAndRecruiter(
    interviewId,
    recruiterId,
  );

  if (!interview) {
    const error = new Error("Interview not found");

    error.statusCode = 404;

    throw error;
  }

  return interview;
};

// ============================================
// RESCHEDULE / UPDATE
// ============================================

export const rescheduleInterview = async (interviewId, recruiterId, data) => {
  const interview = await getInterviewByIdAndRecruiter(
    interviewId,
    recruiterId,
  );

  if (!interview) {
    const error = new Error("Interview not found");

    error.statusCode = 404;

    throw error;
  }

  if (interview.status === "cancelled") {
    const error = new Error("Cancelled interview cannot be rescheduled");

    error.statusCode = 400;

    throw error;
  }

  if (interview.status === "completed") {
    const error = new Error("Completed interview cannot be rescheduled");

    error.statusCode = 400;

    throw error;
  }

  const updateData = {};

  // ------------------------------------------
  // DATE
  // ------------------------------------------

  if (data.scheduledAt) {
    const newDate = new Date(data.scheduledAt);

    if (Number.isNaN(newDate.getTime())) {
      const error = new Error("Invalid scheduledAt");

      error.statusCode = 400;

      throw error;
    }

    if (newDate <= new Date()) {
      const error = new Error("Interview must be scheduled for a future date");

      error.statusCode = 400;

      throw error;
    }

    // Validate against job deadline
    const [job] = await db
      .select({ applicationDeadline: jobs.applicationDeadline })
      .from(jobs)
      .where(eq(jobs.id, interview.jobId))
      .limit(1);

    if (job?.applicationDeadline) {
      const deadlineDate = new Date(job.applicationDeadline);
      if (!Number.isNaN(deadlineDate.getTime()) && newDate <= deadlineDate) {
        const error = new Error(
          `Interview must be scheduled after the application deadline (${deadlineDate.toLocaleDateString()})`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    updateData.scheduledAt = newDate;
  }

  // ------------------------------------------
  // DURATION
  // ------------------------------------------

  if (data.durationMinutes !== undefined) {
    if (!Number.isInteger(data.durationMinutes) || data.durationMinutes <= 0) {
      const error = new Error("durationMinutes must be a positive integer");

      error.statusCode = 400;

      throw error;
    }

    updateData.durationMinutes = data.durationMinutes;
  }

  // ------------------------------------------
  // TYPE
  // ------------------------------------------

  if (data.type) {
    const allowedTypes = ["online", "in_person", "phone"];

    if (!allowedTypes.includes(data.type)) {
      const error = new Error("Invalid interview type");

      error.statusCode = 400;

      throw error;
    }

    updateData.type = data.type;
  }

  // ------------------------------------------
  // OPTIONAL FIELDS
  // ------------------------------------------

  if (data.title !== undefined) {
    updateData.title = data.title?.trim() || null;
  }

  if (data.meetingLink !== undefined) {
    updateData.meetingLink = data.meetingLink?.trim() || null;
  }

  if (data.location !== undefined) {
    updateData.location = data.location?.trim() || null;
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes?.trim() || null;
  }

  // ------------------------------------------
  // FINAL TYPE VALIDATION
  // ------------------------------------------

  const finalType = updateData.type ?? interview.type;

  const finalMeetingLink = updateData.meetingLink ?? interview.meetingLink;

  const finalLocation = updateData.location ?? interview.location;

  if (finalType === "online" && !finalMeetingLink) {
    const error = new Error("Meeting link is required for online interviews");

    error.statusCode = 400;

    throw error;
  }

  if (finalType === "in_person" && !finalLocation) {
    const error = new Error("Location is required for in-person interviews");

    error.statusCode = 400;

    throw error;
  }

  updateData.status = "rescheduled";

  // A new slot clears any previous 24h reminder + pending request state.
  updateData.reminderSentAt = null;
  updateData.rescheduleRequest = null;
  updateData.rescheduleStatus = "none";

  const updated = await updateInterview(interviewId, recruiterId, updateData);

  const { candidate, job } = await getInterviewParties(updated);

  const email = await safeSendEmail(
    sendInterviewUpdatedEmail({
      to: candidate?.email,
      candidateName: candidate?.fullName,
      jobTitle: job?.title,
      company: job?.company,
      scheduledAt: updated.scheduledAt,
      durationMinutes: updated.durationMinutes,
      type: updated.type,
      meetingLink: updated.meetingLink,
      location: updated.location,
      notes: updated.notes,
    }),
  );

  return { ...updated, email };
};

// ============================================
// CANCEL INTERVIEW
// ============================================

export const cancelRecruiterInterview = async (interviewId, recruiterId) => {
  const interview = await getInterviewByIdAndRecruiter(
    interviewId,
    recruiterId,
  );

  if (!interview) {
    const error = new Error("Interview not found");

    error.statusCode = 404;

    throw error;
  }

  if (interview.status === "completed") {
    const error = new Error("Completed interview cannot be cancelled");

    error.statusCode = 400;

    throw error;
  }

  if (interview.status === "cancelled") {
    const error = new Error("Interview is already cancelled");

    error.statusCode = 400;

    throw error;
  }

  const cancelled = await cancelInterview(interviewId, recruiterId);

  const { candidate, job } = await getInterviewParties(cancelled);

  const email = await safeSendEmail(
    sendInterviewCancelledEmail({
      to: candidate?.email,
      candidateName: candidate?.fullName,
      jobTitle: job?.title,
      company: job?.company,
    }),
  );

  return { ...cancelled, email };
};

// ============================================
// COMPLETE INTERVIEW
// ============================================

export const completeRecruiterInterview = async (interviewId, recruiterId) => {
  const interview = await getInterviewByIdAndRecruiter(
    interviewId,
    recruiterId,
  );

  if (!interview) {
    const error = new Error("Interview not found");

    error.statusCode = 404;

    throw error;
  }

  if (interview.status === "cancelled") {
    const error = new Error("Cancelled interview cannot be completed");

    error.statusCode = 400;

    throw error;
  }

  if (interview.status === "completed") {
    const error = new Error("Interview is already completed");

    error.statusCode = 400;

    throw error;
  }

  return await completeInterview(interviewId, recruiterId);
};

// ============================================
// CANDIDATE: MY INTERVIEWS (calendar)
// ============================================

export const getCandidateInterviews = async (candidateId) =>
  await getInterviewsByCandidate(candidateId);

// ============================================
// CANDIDATE: REQUEST RESCHEDULING
// POST /api/interviews/:id/reschedule-request
// ============================================

const ALLOWED_INTERVIEW_TYPES = ["online", "in_person", "phone"];

export const requestRescheduleAsCandidate = async (
  interviewId,
  candidateId,
  { proposedAt, reason, type, meetingLink, location },
) => {
  const interview = await getInterviewByIdAndCandidate(
    interviewId,
    candidateId,
  );

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["scheduled", "rescheduled"].includes(interview.status)) {
    const error = new Error(
      `Cannot request rescheduling for a ${interview.status} interview`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (!proposedAt) {
    const error = new Error("proposedAt is required");
    error.statusCode = 400;
    throw error;
  }

  const proposedDate = new Date(proposedAt);
  if (Number.isNaN(proposedDate.getTime())) {
    const error = new Error("Invalid proposedAt");
    error.statusCode = 400;
    throw error;
  }
  if (proposedDate <= new Date()) {
    const error = new Error("Proposed slot must be in the future");
    error.statusCode = 400;
    throw error;
  }

  // Optional mode change (e.g. candidate asks for virtual instead
  // of in-person, or vice versa).
  if (type !== undefined && type !== null && type !== "") {
    if (!ALLOWED_INTERVIEW_TYPES.includes(type)) {
      const error = new Error("Invalid interview type");
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await saveRescheduleRequest(interviewId, candidateId, {
    proposedAt: proposedDate,
    reason,
    type: type || undefined,
    meetingLink,
    location,
  });

  const { candidate, recruiter, job } = await getInterviewParties(updated);

  const proposedType = updated.rescheduleRequest?.type ?? null;
  const modeChange =
    proposedType && proposedType !== updated.type
      ? ` (wants ${proposedType === "online" ? "virtual" : proposedType.replace("_", " ")} instead of ${updated.type === "online" ? "virtual" : String(updated.type).replace("_", " ")})`
      : "";

  const email = await safeSendEmail(
    sendRescheduleRequestEmail({
      to: recruiter?.email,
      recruiterName: recruiter?.fullName,
      candidateName: candidate?.fullName,
      jobTitle: job?.title,
      currentAt: updated.scheduledAt,
      proposedAt: proposedDate,
      reason: `${reason?.trim() || "No reason given"}${modeChange}`,
    }),
  );

  return { ...updated, email };
};

// ============================================
// RECRUITER: RESPOND TO RESCHEDULE REQUEST
// PATCH /api/interviews/:id/reschedule-respond
// ============================================

export const respondToRescheduleRequest = async (
  interviewId,
  recruiterId,
  { decision, scheduledAt, type, meetingLink, location },
) => {
  const interview = await getInterviewByIdAndRecruiter(
    interviewId,
    recruiterId,
  );

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  if (interview.rescheduleStatus !== "pending") {
    const error = new Error("No pending reschedule request for this interview");
    error.statusCode = 400;
    throw error;
  }

  if (!["approved", "declined"].includes(decision)) {
    const error = new Error("decision must be 'approved' or 'declined'");
    error.statusCode = 400;
    throw error;
  }

  // Default to the candidate's proposed slot when approving.
  const newSlotRaw =
    scheduledAt ?? interview.rescheduleRequest?.proposedAt ?? null;

  let newSlot = null;
  if (decision === "approved") {
    if (!newSlotRaw) {
      const error = new Error(
        "scheduledAt is required to approve the request",
      );
      error.statusCode = 400;
      throw error;
    }
    newSlot = new Date(newSlotRaw);
    if (Number.isNaN(newSlot.getTime())) {
      const error = new Error("Invalid scheduledAt");
      error.statusCode = 400;
      throw error;
    }
    if (newSlot <= new Date()) {
      const error = new Error("Interview must be scheduled for a future date");
      error.statusCode = 400;
      throw error;
    }
  }

  // Resolve the final mode: explicit recruiter override wins, then
  // the candidate's proposal, then the current interview settings.
  // This lets both sides switch in-person ↔ virtual while rescheduling.
  const requested = interview.rescheduleRequest ?? {};
  const finalType =
    type || requested.type || interview.type;
  const finalMeetingLink =
    meetingLink !== undefined
      ? meetingLink?.trim() || null
      : (requested.meetingLink ?? interview.meetingLink);
  const finalLocation =
    location !== undefined
      ? location?.trim() || null
      : (requested.location ?? interview.location);

  if (decision === "approved") {
    if (!ALLOWED_INTERVIEW_TYPES.includes(finalType)) {
      const error = new Error("Invalid interview type");
      error.statusCode = 400;
      throw error;
    }
    if (finalType === "online" && !finalMeetingLink) {
      const error = new Error(
        "A meeting link is required to approve a virtual interview — provide one with your approval",
      );
      error.statusCode = 400;
      throw error;
    }
    if (finalType === "in_person" && !finalLocation) {
      const error = new Error(
        "A location is required to approve an in-person interview — provide one with your approval",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await applyRescheduleDecision(interviewId, recruiterId, {
    decision,
    scheduledAt: newSlot,
    ...(decision === "approved"
      ? {
          type: finalType,
          meetingLink: finalMeetingLink,
          location: finalLocation,
        }
      : {}),
  });

  if (decision === "approved") {
    await syncApplicationToInterviewStage(interview.id);
  }

  const { candidate, job } = await getInterviewParties(updated);

  const email = await safeSendEmail(
    sendRescheduleDecisionEmail({
      to: candidate?.email,
      candidateName: candidate?.fullName,
      jobTitle: job?.title,
      company: job?.company,
      decision,
      scheduledAt: updated.scheduledAt,
      durationMinutes: updated.durationMinutes,
      type: updated.type,
      meetingLink: updated.meetingLink,
      location: updated.location,
    }),
  );

  return { ...updated, email };
};

// ============================================
// AUTOMATIC 24H REMINDER SWEEP
// Runs on an interval from server.js; sends one
// reminder email per interview ~24h before start.
// ============================================

export const runInterviewReminderSweep = async () => {
  const due = await findInterviewsDueReminder();
  let sent = 0;

  for (const item of due) {
    const result = await safeSendEmail(
      sendInterviewReminderEmail({
        to: item.candidate?.email,
        candidateName: item.candidate?.fullName,
        jobTitle: item.job?.title,
        company: item.job?.company,
        scheduledAt: item.scheduledAt,
        durationMinutes: item.durationMinutes,
        type: item.type,
        meetingLink: item.meetingLink,
        location: item.location,
      }),
    );

    // Mark sent regardless of SMTP availability so the sweep never
    // spams; dev-mode deliveries are console-logged by the mailer.
    await markReminderSent(item.id);
    if (result?.delivered) sent += 1;
  }

  return { checked: due.length, reminded: sent };
};
