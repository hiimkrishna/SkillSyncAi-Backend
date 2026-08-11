import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  phone: varchar("phone", {
    length: 50,
  }),

  location: varchar("location", {
    length: 255,
  }),

  headline: varchar("headline", {
    length: 255,
  }),

  bio: text("bio"),

  skills: jsonb("skills")
    .default([])
    .notNull(),

  education: jsonb("education")
    .default([])
    .notNull(),

  experience: jsonb("experience")
    .default([])
    .notNull(),

  certifications: jsonb("certifications")
    .default([])
    .notNull(),

  portfolio: jsonb("portfolio")
    .default([])
    .notNull(),

  socialLinks: jsonb("social_links")
    .default({})
    .notNull(),

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