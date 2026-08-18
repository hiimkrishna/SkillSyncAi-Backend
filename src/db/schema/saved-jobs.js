import {
  pgTable,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { jobs } from "./jobs.js";

export const savedJobs = pgTable(
  "saved_jobs",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userJobUnique: unique(
      "saved_jobs_user_job_unique"
    ).on(table.userId, table.jobId),
  })
);