import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const resumes = pgTable("resumes", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  fileName: varchar("file_name", {
    length: 255,
  }).notNull(),

  fileUrl: varchar("file_url", {
    length: 500,
  }).notNull(),

  fileType: varchar("file_type", {
    length: 100,
  }).notNull(),

  fileSize: integer("file_size"),

  isActive: boolean("is_active")
    .default(true)
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