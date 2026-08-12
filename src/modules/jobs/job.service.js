import { and, eq, ilike, or } from "drizzle-orm";

import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/jobs.js";

export const getJobs = async ({
  search,
  location,
  type,
  status,
}) => {
  const conditions = [];

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
        ilike(jobs.description, `%${search}%`)
      )
    );
  }

  return db
    .select()
    .from(jobs)
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined
    )
    .orderBy(jobs.createdAt);
};

export const getJobById = async (jobId) => {
  const result = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  return result[0] || null;
};

export const createJob = async (recruiterId, data) => {
  const result = await db
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

      requirements:
        data.requirements?.trim() || null,

      status: data.status || "open",
    })
    .returning();

  return result[0];
};

export const updateJob = async (
  jobId,
  recruiterId,
  data
) => {
  const result = await db
    .update(jobs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId)
      )
    )
    .returning();

  return result[0] || null;
};

export const deleteJob = async (
  jobId,
  recruiterId
) => {
  const result = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.recruiterId, recruiterId)
      )
    )
    .returning({
      id: jobs.id,
    });

  return result[0] || null;
};