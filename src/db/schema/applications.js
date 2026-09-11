// src/db/schema/applications.js

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const applications = pgTable(
  "applications",
  {
    // ============================================
    // ID
    // ============================================

    id: uuid("id").defaultRandom().primaryKey(),

    // ============================================
    // RELATIONSHIPS
    // ============================================

    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, {
        onDelete: "cascade",
      }),

    // ============================================
    // APPLICATION STATUS
    // ============================================

    status: varchar("status", {
      length: 50,
    })
      .default("pending")
      .notNull(),

    // ============================================
    // REJECTION
    // ============================================

    rejectionReason: text("rejection_reason"),

    // ============================================
    // SHORTLIST
    // ============================================

    shortlistNotes: text("shortlist_notes"),

    shortlistPriority: varchar("shortlist_priority", {
      length: 20,
    }),

    // ============================================
    // INTERVIEW
    // ============================================

    interviewDetails: jsonb("interview_details"),

    // ============================================
    // OFFER
    // ============================================

    offerDetails: jsonb("offer_details"),

    // ============================================
    // AI EVALUATION (CLAUDE §17)
    // ============================================

    aiEvaluation: jsonb("ai_evaluation"),

    aiEvaluatedAt: timestamp("ai_evaluated_at", {
      withTimezone: true,
    }),

    aiEvaluationVersion: varchar("ai_evaluation_version", {
      length: 20,
    }),

    interviewQuestions: jsonb("interview_questions"),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    // ============================================
    // TIMESTAMPS
    // ============================================

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },

  (table) => ({
    // ============================================
    // PREVENT DUPLICATE APPLICATION
    // ============================================

    candidateJobUnique: unique().on(table.candidateId, table.jobId),
  }),
);
