ALTER TABLE "resumes" ALTER COLUMN "file_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "file_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "mime_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "resume_data" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "resumes" ALTER COLUMN "resume_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" DROP COLUMN "is_active";