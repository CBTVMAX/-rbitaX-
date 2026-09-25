"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import { Rss, UserCheck } from "lucide-react";

export function FollowButton({
  targetUserId,
  initiallyFollowing = false,
  currentUserId,
  className,
  variant = "default",
  compact = false,
}: {
  targetUserId: string;
  initiallyFollowing?: boolean;
  /** "outline": secondary button next to "Adicionar amigo" on profiles. */
  variant?: "default" | "outline";
  compact?: boolean;
  /** Pass when the caller already knows the viewer's auth state (e.g. guest pages). */
  currentUserId?: string | null;
  className?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  if (currentUserId === null) {
    return (
      <Link
        href="/entrar"
        className={clsx(
          "inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5",
          className
        )}
      >
        Seguir
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const userId = currentUserId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      setBusy(false);
      return;
    }

    if (following) {
      await supabase.from("Follow").delete().eq("followerId", userId).eq("followingId", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("Follow").insert({
        id: crypto.randomUUID(),
        followerId: userId,
        followingId: targetUserId,
      });
      setFollowing(true);
    }
    setBusy(false);
    router.refresh();
  }

  if (variant === "outline") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={following ? "Deixar de seguir" : "Seguir"}
        title={following ? "Deixar de seguir" : "Seguir"}
        className={clsx(
          "flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition disabled:opacity-50",
          following ? "border-white/15 bg-space-bg/40 text-white/80 hover:bg-white/5" : "border-orbit-purple/60 text-white hover:bg-orbit-purple/10",
          compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5",
          className
        )}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <Rss className="h-4 w-4" />}
        {!compact && (following ? "Seguindo" : "Seguir")}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={clsx(
        "rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50",
        following
          ? "border border-white/15 text-white/80 hover:bg-white/5"
          : "bg-orbit-gradient text-snow shadow-glow hover:opacity-90",
        className
      )}
    >
      {following ? "Seguindo" : "Seguir"}
    </button>
  );
}
