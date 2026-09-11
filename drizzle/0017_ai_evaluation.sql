ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ai_evaluation" jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ai_evaluated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ai_evaluation_version" varchar(20);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "interview_questions" jsonb;
