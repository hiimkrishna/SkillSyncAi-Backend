import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { jobs } from "./jobs.js";
import { applications } from "./applications.js";

// ============================================
// INTERVIEW STATUS
// ============================================

export const interviewStatusEnum = pgEnum("interview_status", [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
]);

// ============================================
// INTERVIEW TYPE
// ============================================

export const interviewTypeEnum = pgEnum("interview_type", [
  "online",
  "in_person",
  "phone",
]);

// ============================================
// INTERVIEWS TABLE
// ============================================

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Application this interview belongs to
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, {
      onDelete: "cascade",
    }),

  // Candidate
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => users.id),

  // Recruiter
  recruiterId: uuid("recruiter_id")
    .notNull()
    .references(() => users.id),

  // Job
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),

  // Interview information
  type: interviewTypeEnum("type").notNull(),

  status: interviewStatusEnum("status")
    .notNull()
    .default("scheduled"),

  title: text("title"),

  // Schedule
  scheduledAt: timestamp("scheduled_at", {
    withTimezone: true,
  }).notNull(),

  durationMinutes: integer("duration_minutes")
    .notNull()
    .default(60),

  // Online interview
  meetingLink: text("meeting_link"),

  // Physical interview
  location: text("location"),

  // Recruiter's notes
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});