import {
  createInterview,
  getInterviewsByRecruiter,
  getInterviewByIdAndRecruiter,
  updateInterview,
  cancelInterview,
  completeInterview,
} from "./interview.repository.js";

import { getApplicationById } from "../applications/application.service.js";

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

  return await createInterview({
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

  return await updateInterview(interviewId, recruiterId, updateData);
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

  return await cancelInterview(interviewId, recruiterId);
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
