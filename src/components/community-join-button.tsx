"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";

export function CommunityJoinButton({
  communityId,
  userId,
  initiallyMember,
}: {
  communityId: string;
  userId: string;
  initiallyMember: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [member, setMember] = useState(initiallyMember);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    if (member) {
      await supabase.from("CommunityMember").delete().eq("communityId", communityId).eq("userId", userId);
      setMember(false);
    } else {
      await supabase.from("CommunityMember").insert({
        id: crypto.randomUUID(),
        communityId,
        userId,
        role: "member",
      });
      setMember(true);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={clsx(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50",
        member ? "border border-white/15 text-white/80 hover:bg-white/5" : "bg-orbit-gradient text-white"
      )}
    >
      {member ? "Participando" : "Entrar"}
    </button>
  );
}
