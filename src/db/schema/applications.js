import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const applications = pgTable(
  "applications",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

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

    status: varchar("status", {
      length: 50,
    })
      .default("pending")
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
  },

  (table) => ({
    candidateJobUnique: unique().on(
      table.candidateId,
      table.jobId
    ),
  })
);