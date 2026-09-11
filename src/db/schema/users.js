import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "recruiter",
  "candidate",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  fullName: varchar("full_name", {
    length: 255,
  }).notNull(),

  email: varchar("email", {
    length: 255,
  })
    .notNull()
    .unique(),

  password: varchar("password", {
    length: 255,
  }).notNull(),

  role: userRoleEnum("role")
    .default("candidate")
    .notNull(),

  approvalStatus: approvalStatusEnum("approval_status")
    .default("approved")
    .notNull(),

  isActive: boolean("is_active")
    .default(true)
    .notNull(),

  stripeCustomerId: varchar("stripe_customer_id", {
    length: 255,
  }),

  stripeSubscriptionId: varchar("stripe_subscription_id", {
    length: 255,
  }),

  subscriptionPlan: varchar("subscription_plan", {
    length: 32,
  }),

  subscriptionStatus: varchar("subscription_status", {
    length: 32,
  }),

  subscriptionPeriodEnd: timestamp("subscription_period_end", {
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