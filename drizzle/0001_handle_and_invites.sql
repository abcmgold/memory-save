-- rev 3 (FR-037..FR-039): public handle + invite-link token.
-- Non-destructive for existing accounts (constitution V): add nullable, backfill, then enforce.
ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token" text;--> statement-breakpoint
UPDATE "users" u SET "handle" = 'ban.' || lpad(n.rn::text, 6, '0')
  FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn FROM "users") n
  WHERE u."id" = n."id" AND u."handle" IS NULL;--> statement-breakpoint
UPDATE "users" SET "invite_token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE "invite_token" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "invite_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invite_token_unique" UNIQUE("invite_token");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_format" CHECK ("handle" ~ '^[a-z0-9]+(\.[a-z0-9]+)*\.[0-9]{4,6}$' AND char_length("handle") <= 32);
