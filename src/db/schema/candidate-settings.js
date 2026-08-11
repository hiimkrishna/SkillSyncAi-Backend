import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const candidateSettings = pgTable(
  "candidate_settings",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

      userId: uuid("user_id")
  .notNull()
  .unique()
  .references(() => users.id, {
    onDelete: "cascade",
  }),

security: jsonb("security")
  .notNull()
  .default({
    twoFactor: false,
  }),

notifications: jsonb("notifications")
  .notNull()
  .default({
    email: true,
    push: true,
  }),

appearance: jsonb("appearance")
  .notNull()
  .default({
    theme: "system",
  }),

preferences: jsonb("preferences")
  .notNull()
  .default({
    location: "",
  }),

connectedAccounts: jsonb("connected_accounts")
  .notNull()
  .default([]),

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

}
);
