"use client";

import { clsx } from "clsx";
import { ChatAvatar } from "@/components/messenger/ui";
import type { StoreProduct } from "@/lib/store";

export type Viewer = { name: string; avatarUrl: string | null; avatarFrame: string | null };

/** The product picture as it will look in use: frames on your own photo, wallpapers full bleed. */
export function ProductArt({ p, viewer, size = "card" }: { p: StoreProduct; viewer: Viewer; size?: "thumb" | "card" | "large" }) {
  const large = size === "large";
  if (p.kind === "wallpaper") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={large && p.meta?.full ? p.meta.full : p.image} alt="" loading="lazy" className="h-full w-full object-cover" />
    );
  }
  if (p.kind === "frame") {
    return (
      <span className="flex h-full w-full items-center justify-center">
        <ChatAvatar name={viewer.name} url={viewer.avatarUrl} size={large ? 150 : size === "thumb" ? 46 : 86} frame={p.refId} />
      </span>
    );
  }
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span aria-hidden className={clsx("absolute rounded-full bg-orbit-purple/25 blur-2xl", large ? "h-32 w-32" : "h-20 w-20")} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={large && p.kind === "sticker_pack" ? p.image.replace(/-s\.webp$/, ".webp") : p.image}
        alt=""
        loading="lazy"
        className={clsx("relative object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]", large ? "h-40 w-40" : "h-[68%] w-[68%]")}
      />
    </span>
  );
}
