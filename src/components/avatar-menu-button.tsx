"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { AvatarFlow } from "@/components/avatar-flow";

/**
 * Client wrapper around the avatar camera button. The button opens the photo menu, so the open
 * state has to live here — the profile itself stays a Server Component.
 */
export function AvatarMenuButton({
  userId,
  avatarUrl,
  username,
  hasFrame,
}: {
  userId: string;
  avatarUrl: string | null;
  username: string;
  hasFrame: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Opções da foto"
        className={`absolute z-10 flex items-center justify-center rounded-full border-2 border-pa bg-space-bg/90 text-white shadow-glow transition hover:bg-space-card ${
          hasFrame ? "bottom-0 right-0 h-8 w-8 md:h-10 md:w-10" : "bottom-[3%] right-[3%] h-10 w-10 md:h-12 md:w-12"
        }`}
      >
        <Camera className={hasFrame ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5"} />
      </button>
      <AvatarFlow
        userId={userId}
        avatarUrl={avatarUrl}
        username={username}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
