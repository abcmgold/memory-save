import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "../http/auth";
import { getAppTimeZone } from "../env";
import { nowLocal } from "../domain/clock";
import { defaultAudience } from "../domain/audience";
import type { AudienceInput, UserRef } from "@/lib/types";
import type { SessionUser } from "./sessions";
import { countIncomingRequests, listFriends } from "./friends";

/** Shared server-side data for pages under (app): signed-in user, local "now", friends, default audience. */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Origin of the current request (x-forwarded-* on Vercel), for building shareable links. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}

export function localNow(): string {
  return nowLocal(getAppTimeZone());
}

export async function composeContext(user: SessionUser): Promise<{ friends: UserRef[]; defaultAudience: AudienceInput }> {
  const friends = await listFriends(user.id);
  return {
    friends,
    // FR-027: first time private; afterwards the last choice minus people who are no longer friends
    defaultAudience: defaultAudience(user.lastAudience, friends.map((f) => f.id)),
  };
}

/** Invitation badge count, shared by the bottom nav and the camera header within one request. */
export const incomingCount = cache((userId: string) => countIncomingRequests(userId));
