import "server-only";
import { z } from "zod";
import { MAX_PHOTOS_PER_ENTRY, msg } from "@/lib/messages";

// Loose length caps here; exact limits and messages live in domain/entry-rules.ts.
const AudienceBody = z.object({
  mode: z.enum(["private", "friends", "custom"]),
  userIds: z.array(z.uuid()).max(200).optional(),
});

export const CreateEntryBody = z.object({
  title: z.string().max(1_000).nullable().optional(),
  body: z.string().max(25_000).nullable().optional(),
  eventAt: z.string().max(20).nullable().optional(),
  kind: z.enum(["journal", "quick"]).default("journal"),
  photoIds: z.array(z.uuid()).max(MAX_PHOTOS_PER_ENTRY, msg.tooManyPhotos).default([]),
  audience: AudienceBody.optional(),
});

export const UpdateEntryBody = CreateEntryBody.omit({ kind: true })
  .extend({ photoIds: z.array(z.uuid()).max(MAX_PHOTOS_PER_ENTRY, msg.tooManyPhotos).optional() })
  .partial();
