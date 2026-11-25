-- rev 3.1 (FR-001): display name is required. Non-destructive: fill missing names with the public handle first.
ALTER TABLE "users" DROP CONSTRAINT "users_display_name_length";--> statement-breakpoint
UPDATE "users" SET "display_name" = "handle" WHERE "display_name" IS NULL OR btrim("display_name") = '';--> statement-breakpoint
UPDATE "users" SET "display_name" = left(btrim("display_name"), 50) WHERE char_length(btrim("display_name")) > 50;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_display_name_length" CHECK (char_length(btrim("users"."display_name")) BETWEEN 1 AND 50);
