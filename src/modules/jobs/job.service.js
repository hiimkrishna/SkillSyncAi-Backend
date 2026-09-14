import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";
import { normalizeRequiredSkills } from "./job.eligibility.service.js";

const sanitizeFilters = (data) => {
  const filters = {};

  if (data.requiredSkills !== undefined) {
    filters.requiredSkills = normalizeRequiredSkills(data.requiredSkills);
  }

  if (data.minMatchScore !== undefined) {
    const score = Number(data.minMatchScore);
    filters.minMatchScore = Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : 0;
  }

  if (data.minExperienceYears !== undefined) {
    const years = Number(data.minExperienceYears);
    filters.minExperienceYears = Number.isFinite(years)
      ? Math.max(0, Math.min(50, Math.round(years)))
      : 0;
  }

  if (data.educationRequirement !== undefined) {
    const text =
      typeof data.educationRequirement === "string"
        ? data.educationRequirement.trim()
        : "";
    filters.educationRequirement = text || null;
  }

  if (data.minEducationGrade !== undefined) {
    const grade = Number(data.minEducationGrade);
    filters.minEducationGrade =
      data.minEducationGrade === null || data.minEducationGrade === ""
        ? null
        : Number.isFinite(grade) && grade >= 0
          ? grade
          : null;
  }

  return filters;
};

// ============================================
// EDIT WINDOW - 2 days after creation
// ============================================

const EDIT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours

const assertEditWindow = (job) => {
  if (!job?.createdAt) return;

  const createdAtMs = new Date(job.createdAt).getTime();

  if (Number.isNaN(createdAtMs)) return;

  const age = Date.now() - createdAtMs;

  if (age > EDIT_WINDOW_MS) {
    const error = new Error(
      "Job can only be edited within 2 days of posting",
    );

    error.statusCode = 403;

    throw error;
  }
};

const parseDeadline = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  // Accept both date (YYYY-MM-DD) and date-time
  // For date-only, treat as end of that day (23:59:59)
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = new Date(`${value}T23:59:59.999Z`);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid application deadline");
    error.statusCode = 400;
    throw error;
  }

  return date;
};

export const isDeadlinePassed = (job) => {
  if (!job?.applicationDeadline) return false;
  return new Date(job.applicationDeadline).getTime() < Date.now();
};

// ============================================
// GET PUBLIC JOBS
// Candidate/public browsing
// ============================================

export const getJobs = async ({ search, location, type, status }) => {
  const conditions = [isNull(jobs.deletedAt), eq(jobs.status, "open")];

  // ------------------------------------------
  // Default public behavior
  // ------------------------------------------

  if (status && status !== "open") {
    conditions.push(eq(jobs.status, status));
  }

  if (location && location !== "All") {
    conditions.push(eq(jobs.location, location));
  }

  if (type && type !== "All") {
    conditions.push(eq(jobs.type, type));
  }

  if (search) {
    conditions.push(
      or(
        ilike(jobs.title, `%${search}%`),
        ilike(jobs.company, `%${search}%`),
        ilike(jobs.description, `%${search}%`),
      ),
    );
  }

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(50);
};

// ============================================
// GET SINGLE JOB
// ============================================

export const getJobById = async (jobId) => {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.status, "open"),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  return job ?? null;
};

// ============================================
// GET RECRUITER'S JOBS
// ============================================

export const getRecruiterJobs = async (
  recruiterId,
  { search, location, type, status } = {},
) => {
  const conditions = [eq(jobs.recruiterId, recruiterId), isNull(jobs.deletedAt)];

  if (status) {
    conditions.push(eq(jobs.status, status));
  }

  if (location && location !== "All") {
    conditions.push(eq(jobs.location, location));
  }

  if (type && type !== "All") {
    conditions.push(eq(jobs.type, type));
  }

  if (search) {
    conditions.push(
      or(
        ilike(jobs.title, `%${search}%`),
        ilike(jobs.company, `%${search}%`),
        ilike(jobs.description, `%${search}%`),
      ),
    );
  }

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(50);
};

// ============================================
// GET RECRUITER JOB BY ID
// ============================================

export const getRecruiterJobById = async (jobId, recruiterId) => {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  return job ?? null;
};

// ============================================
// CREATE JOB
// ============================================

export const createJob = async (recruiterId, data) => {
  // ------------------------------------------
  // Salary validation
  // ------------------------------------------

  if (
    data.salaryMin != null &&
    data.salaryMax != null &&
    data.salaryMax < data.salaryMin
  ) {
    const error = new Error(
      "Maximum salary cannot be less than minimum salary",
    );

    error.statusCode = 400;

    throw error;
  }

  // ------------------------------------------
  // Deadline parsing
  // ------------------------------------------

  const deadline = parseDeadline(data.applicationDeadline);

  // ------------------------------------------
  // Create
  // ------------------------------------------

  const [job] = await db
    .insert(jobs)
    .values({
      recruiterId,

      title: data.title.trim(),

      company: data.company.trim(),

      description: data.description.trim(),

      location: data.location?.trim() || null,

      type: data.type,

      salaryMin: data.salaryMin ?? null,

      salaryMax: data.salaryMax ?? null,

      requirements: data.requirements?.trim() || null,

      ...sanitizeFilters(data),

      status: data.status ?? "open",

      applicationDeadline: deadline,
    })
    .returning();

  return job;
};

// ============================================
// UPDATE JOB
// ============================================

export const updateJob = async (jobId, recruiterId, data) => {
  // ------------------------------------------
  // Salary validation
  // ------------------------------------------

  if (
    data.salaryMin != null &&
    data.salaryMax != null &&
    data.salaryMax < data.salaryMin
  ) {
    const error = new Error(
      "Maximum salary cannot be less than minimum salary",
    );

    error.statusCode = 400;

    throw error;
  }

  // ------------------------------------------
  // Fetch existing job + enforce 2-day window + ownership
  // ------------------------------------------

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!existingJob) {
    return null;
  }

  assertEditWindow(existingJob);

  // ------------------------------------------
  // Build safe update object
  // ------------------------------------------

  const updateData = {};

  if (data.title !== undefined) {
    updateData.title = data.title.trim();
  }

  if (data.company !== undefined) {
    updateData.company = data.company.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim();
  }

  if (data.location !== undefined) {
    updateData.location = data.location?.trim() || null;
  }

  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  if (data.salaryMin !== undefined) {
    updateData.salaryMin = data.salaryMin;
  }

  if (data.salaryMax !== undefined) {
    updateData.salaryMax = data.salaryMax;
  }

  if (data.requirements !== undefined) {
    updateData.requirements = data.requirements?.trim() || null;
  }

  Object.assign(updateData, sanitizeFilters(data));

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.applicationDeadline !== undefined) {
    updateData.applicationDeadline = parseDeadline(data.applicationDeadline);
  }

  updateData.updatedAt = new Date();

  // ------------------------------------------
  // Update only owner's job
  // ------------------------------------------

  const [job] = await db
    .update(jobs)
    .set(updateData)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .returning();

  return job ?? null;
};

// ============================================
// UPDATE JOB STATUS
// ============================================

export const updateJobStatus = async (jobId, recruiterId, status) => {
  // ------------------------------------------
  // Enforce 2-day edit window + ownership
  // ------------------------------------------

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!existingJob) {
    return null;
  }

  assertEditWindow(existingJob);

  const [job] = await db
    .update(jobs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .returning();

  return job ?? null;
};

// ============================================
// DELETE JOB (soft)
// ============================================

export const deleteJob = async (jobId, recruiterId) => {
  const [job] = await db
    .update(jobs)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId),
        isNull(jobs.deletedAt),
      ),
    )
    .returning({
      id: jobs.id,
    });

  return job ?? null;
};

export const restoreJob = async (jobId, recruiterId) => {
  const [job] = await db
    .update(jobs)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId)))
    .returning();

  return job ?? null;
};
