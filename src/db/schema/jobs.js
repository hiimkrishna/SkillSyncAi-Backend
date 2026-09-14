import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const jobs = pgTable("jobs", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  recruiterId: uuid("recruiter_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  title: varchar("title", {
    length: 255,
  }).notNull(),

  company: varchar("company", {
    length: 255,
  }).notNull(),

  description: text("description").notNull(),

  location: varchar("location", {
    length: 255,
  }),

  type: varchar("type", {
    length: 50,
  }).notNull(),

  salaryMin: integer("salary_min"),

  salaryMax: integer("salary_max"),

  requirements: text("requirements"),

  // ============================================
  // ELIGIBILITY FILTERS (supervisor mods)
  // Jobs stay visible to everyone; candidates
  // below these bars cannot apply (422).
  // ============================================

  requiredSkills: jsonb("required_skills")
    .default([])
    .notNull(),

  minMatchScore: integer("min_match_score")
    .default(0)
    .notNull(),

  minExperienceYears: integer("min_experience_years")
    .default(0)
    .notNull(),

  educationRequirement: text("education_requirement"),

  minEducationGrade: real("min_education_grade"),

  status: varchar("status", {
    length: 50,
  })
    .default("open")
    .notNull(),

  applicationDeadline: timestamp("application_deadline", {
    withTimezone: true,
  }),

  deletedAt: timestamp("deleted_at", {
    withTimezone: true,
  }),

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
});