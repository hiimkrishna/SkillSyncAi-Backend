import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";

// ============================================
// GET PUBLIC JOBS
// Candidate/public browsing
// ============================================

export const getJobs = async ({ search, location, type, status }) => {
  const conditions = [];

  // ------------------------------------------
  // Default public behavior
  // ------------------------------------------

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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobs.createdAt));
};

// ============================================
// GET SINGLE JOB
// ============================================

export const getJobById = async (jobId) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  return job ?? null;
};

// ============================================
// GET RECRUITER'S JOBS
// ============================================

export const getRecruiterJobs = async (
  recruiterId,
  { search, location, type, status } = {},
) => {
  const conditions = [eq(jobs.recruiterId, recruiterId)];

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
    .orderBy(desc(jobs.createdAt));
};

// ============================================
// GET RECRUITER JOB BY ID
// ============================================

export const getRecruiterJobById = async (jobId, recruiterId) => {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId)))
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

      status: data.status ?? "open",
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

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  updateData.updatedAt = new Date();

  // ------------------------------------------
  // Update only owner's job
  // ------------------------------------------

  const [job] = await db
    .update(jobs)
    .set(updateData)
    .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId)))
    .returning();

  return job ?? null;
};

// ============================================
// UPDATE JOB STATUS
// ============================================

export const updateJobStatus = async (jobId, recruiterId, status) => {
  const [job] = await db
    .update(jobs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId)))
    .returning();

  return job ?? null;
};

// ============================================
// DELETE JOB
// ============================================

export const deleteJob = async (jobId, recruiterId) => {
  const [job] = await db
    .delete(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId)))
    .returning({
      id: jobs.id,
    });

  return job ?? null;
};
