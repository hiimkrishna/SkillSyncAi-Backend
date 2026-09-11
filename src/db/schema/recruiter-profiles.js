import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const recruiterProfiles = pgTable("recruiter_profiles", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  jobTitle: varchar("job_title", {
    length: 255,
  }),

  companyName: varchar("company_name", {
    length: 255,
  }),

  phone: varchar("phone", {
    length: 50,
  }),

  bio: text("bio"),

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