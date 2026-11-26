CREATE TABLE "email_codes" (
	"ticket_hash" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"code_hash" text NOT NULL,
	"delivery" text NOT NULL,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_codes_purpose" CHECK ("email_codes"."purpose" IN ('signup', 'change_email', 'reset_password')),
	CONSTRAINT "email_codes_delivery" CHECK ("email_codes"."delivery" IN ('code', 'email_taken', 'google_account', 'none')),
	CONSTRAINT "email_codes_attempts" CHECK ("email_codes"."attempts" BETWEEN 0 AND 5),
	CONSTRAINT "email_codes_email_length" CHECK (char_length("email_codes"."email") <= 254)
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_one_login_method";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_google_email_length";--> statement-breakpoint
-- 005 research R9: keep existing Google e-mails (rename, not drop + add), then normalize and mark them verified.
ALTER TABLE "users" RENAME COLUMN "google_email" TO "email";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "email" = lower(btrim("email")), "email_verified_at" = "created_at" WHERE "email" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "email_codes" ADD CONSTRAINT "email_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_codes_lookup_idx" ON "email_codes" USING btree ("purpose","email");--> statement-breakpoint
CREATE INDEX "email_codes_expires_idx" ON "email_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "email_sends_email_idx" ON "email_sends" USING btree ("email","sent_at");--> statement-breakpoint
CREATE INDEX "email_sends_ip_idx" ON "email_sends" USING btree ("ip","sent_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_login_method" CHECK (("users"."username" IS NULL) = ("users"."password_hash" IS NULL) AND ("users"."username" IS NOT NULL OR "users"."google_sub" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_verified" CHECK (("users"."email" IS NULL) = ("users"."email_verified_at" IS NULL));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_length" CHECK ("users"."email" IS NULL OR char_length("users"."email") <= 254);