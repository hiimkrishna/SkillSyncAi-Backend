ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_plan" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_period_end" timestamp with time zone;