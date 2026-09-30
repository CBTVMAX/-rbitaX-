"use client";

import { isRectangularAvatar } from "@/lib/avatar-aspect";
import { User } from "lucide-react";

/**
 * Avatar picture. Dense lists (chat, search, admin) keep the circular crop via shape="circle" so
 * the grid does not break; the profile uses shape="auto", which honours the ratio the user picked
 * in the editor instead of forcing a center crop.
 */
export function AvatarImage({
  url,
  name,
  className,
  shape = "circle",
}: {
  url: string | null;
  name?: string;
  className?: string;
  shape?: "circle" | "auto";
}) {
  const rect = shape === "auto" && isRectangularAvatar(url);
  const radius = rect ? "rounded-2xl" : "rounded-full";
  if (!url) {
    return (
      <div className={`flex h-full w-full items-center justify-center overflow-hidden ${radius} bg-space-card`}>
        <User className="h-[78%] w-[78%] text-orbit-blue/55" />
      </div>
    );
  }
  return (
    <div className={`h-full w-full overflow-hidden ${radius} bg-space-card`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name ?? ""} className="h-full w-full object-cover" />
    </div>
  );
}
