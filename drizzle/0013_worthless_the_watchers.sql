ALTER TABLE "applications" ADD COLUMN "shortlist_notes" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "shortlist_priority" varchar(20);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "interview_details" jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "offer_details" jsonb;