"use client";

import { useEffect, useState } from "react";

/**
 * Group and community chats: photos and videos are harder to copy out of the page.
 * No long-press / right-click "save", no dragging, no printing, and media is blurred
 * while the app is in the background (app switcher previews, screen overlays).
 * A browser cannot block operating-system screenshots, so this is a deterrent, not a lock.
 */
export function useMediaGuard(active: boolean) {
  const [concealed, setConcealed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const update = () => setConcealed(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pagehide", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pagehide", update);
      setConcealed(false);
    };
  }, [active]);

  const onContextMenu = (e: React.MouseEvent) => {
    if (!active) return;
    const el = e.target as HTMLElement;
    if (el.closest("img, video, picture, canvas")) e.preventDefault();
  };

  const className = active ? (concealed ? "chat-guard chat-guard-concealed" : "chat-guard") : undefined;
  return { className, onContextMenu, active };
}
