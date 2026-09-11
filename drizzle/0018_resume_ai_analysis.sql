ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "ai_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "ai_analyzed_at" timestamp with time zone;
