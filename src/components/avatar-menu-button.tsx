"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { AvatarFlow } from "@/components/avatar-flow";

/**
 * Wraps the whole avatar so tapping the picture opens the photo menu, with the camera badge as a
 * visible hint. The open state has to live in a client component, so the profile stays a Server
 * Component and hands its rendered avatar over as children.
 */
export function AvatarMenu({
  userId,
  avatarUrl,
  username,
  hasFrame,
  children,
}: {
  userId: string;
  avatarUrl: string | null;
  username: string;
  hasFrame: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Opções da foto"
        className="group relative block h-full w-full cursor-pointer align-top"
      >
        {children}
        <span
          aria-hidden
          className={`absolute z-10 flex items-center justify-center rounded-full border-2 border-pa bg-space-bg/90 text-white shadow-glow transition group-hover:bg-space-card ${
            hasFrame ? "bottom-0 right-0 h-8 w-8 md:h-10 md:w-10" : "bottom-[3%] right-[3%] h-10 w-10 md:h-12 md:w-12"
          }`}
        >
          <Camera className={hasFrame ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5"} />
        </span>
      </button>
      {/* Mounted only while open: AvatarFlow seeds its step from `open` and discards pending
          files when it unmounts, so it has to start fresh on every opening. */}
      {open && (
        <AvatarFlow
          userId={userId}
          avatarUrl={avatarUrl}
          username={username}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
