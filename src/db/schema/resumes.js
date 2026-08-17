// src/db/schema/resumes.js

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { candidateProfiles } from "./candidate-profiles.js";

// ============================================
// RESUME PARSE STATUS
// ============================================

export const resumeParseStatusEnum = pgEnum(
  "resume_parse_status",
  [
    "pending",
    "processing",
    "completed",
    "failed",
  ]
);

// ============================================
// RESUMES TABLE
// ============================================

export const resumes = pgTable("resumes", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidateProfiles.id, {
      onDelete: "cascade",
    }),

  fileName: text("file_name").notNull(),

  fileUrl: text("file_url").notNull(),

  mimeType: text("mime_type").notNull(),

  fileSize: integer("file_size"),

  rawText: text("raw_text"),

  resumeData: jsonb("resume_data"),

  parseStatus: resumeParseStatusEnum("parse_status")
    .notNull()
    .default("pending"),

  parserVersion: text("parser_version"),

  parseError: text("parse_error"),

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