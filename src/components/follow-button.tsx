"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";

export function FollowButton({
  targetUserId,
  initiallyFollowing,
}: {
  targetUserId: string;
  initiallyFollowing: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    if (following) {
      await supabase.from("Follow").delete().eq("followerId", user.id).eq("followingId", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("Follow").insert({
        id: crypto.randomUUID(),
        followerId: user.id,
        followingId: targetUserId,
      });
      setFollowing(true);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={clsx(
        "rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50",
        following
          ? "border border-white/15 text-white/80 hover:bg-white/5"
          : "bg-orbit-gradient text-white shadow-glow hover:opacity-90"
      )}
    >
      {following ? "Seguindo" : "Seguir"}
    </button>
  );
}
