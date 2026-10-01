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
  name,
  children,
}: {
  name?: string;
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
            hasFrame ? "bottom-0 left-0 h-7 w-7 md:h-8 md:w-8" : "bottom-[2%] left-[2%] h-8 w-8 md:h-9 md:w-9"
          }`}
        >
          <Camera className={hasFrame ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
      </button>
      {/* Mounted only while open: AvatarFlow seeds its step from `open` and discards pending
          files when it unmounts, so it has to start fresh on every opening. */}
      {open && (
        <AvatarFlow
          userId={userId}
          avatarUrl={avatarUrl}
          username={username}
          name={name}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
