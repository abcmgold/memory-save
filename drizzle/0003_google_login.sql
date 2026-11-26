-- 002-google-login: Google accounts (no username/password) + pending sign-ups. Non-destructive: only relaxes NOT NULL
-- and adds columns/table/constraints that every existing (username + password) row already satisfies.
CREATE TABLE "pending_google_signups" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"google_sub" text NOT NULL,
	"google_email" text NOT NULL,
	"suggested_name" text NOT NULL,
	"next" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_email" text;--> statement-breakpoint
CREATE INDEX "pending_google_signups_expires_idx" ON "pending_google_signups" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_one_login_method" CHECK (("users"."username" IS NOT NULL AND "users"."password_hash" IS NOT NULL AND "users"."google_sub" IS NULL) OR ("users"."google_sub" IS NOT NULL AND "users"."username" IS NULL AND "users"."password_hash" IS NULL));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_email_length" CHECK ("users"."google_email" IS NULL OR char_length("users"."google_email") <= 320);