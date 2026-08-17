ALTER TABLE "resumes" ADD COLUMN "resume_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "file_url";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "file_type";--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "file_size";