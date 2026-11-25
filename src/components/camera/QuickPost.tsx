"use client";

import { useState } from "react";
import type { AudienceInput, UserRef } from "@/lib/types";
import { CameraView } from "./CameraView";
import { ReviewStep } from "./ReviewStep";

function localStamp(timeZone: string): string {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()))
    p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Camera → review → post (US2). The capture time becomes the entry's event time. */
export function QuickPost({
  header,
  friends,
  defaultAudience,
  timeZone,
}: {
  header: React.ReactNode;
  friends: UserRef[];
  defaultAudience: AudienceInput;
  timeZone: string;
}) {
  const [shot, setShot] = useState<{ blob: Blob; at: string } | null>(null);

  if (shot) {
    return (
      <ReviewStep
        photo={shot.blob}
        takenAt={shot.at}
        friends={friends}
        defaultAudience={defaultAudience}
        onRetake={() => setShot(null)}
      />
    );
  }
  return (
    <>
      {header}
      <CameraView onCapture={(blob) => setShot({ blob, at: localStamp(timeZone) })} />
    </>
  );
}
