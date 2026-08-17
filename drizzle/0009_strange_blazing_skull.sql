CREATE TYPE "public"."resume_parse_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "resumes" DROP CONSTRAINT "resumes_candidate_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "raw_text" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "parse_status" "resume_parse_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "parser_version" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "parse_error" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidate_id_candidate_profiles_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE cascade ON UPDATE no action;