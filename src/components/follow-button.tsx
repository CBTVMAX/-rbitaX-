"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import { Check, Clock, Loader2, Rss, UserCheck, X } from "lucide-react";

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
  // Private accounts approve followers: until then the request shows as "Solicitado".
  const [requested, setRequested] = useState(false);
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
      setRequested(false);
    } else {
      const { data } = await supabase
        .from("Follow")
        .insert({
          id: crypto.randomUUID(),
          followerId: userId,
          followingId: targetUserId,
        })
        .select("status")
        .maybeSingle();
      setFollowing(true);
      setRequested(data?.status === "pending");
    }
    setBusy(false);
    router.refresh();
  }

  if (variant === "outline") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={requested ? "Cancelar pedido para seguir" : following ? "Deixar de seguir" : "Seguir"}
        title={requested ? "Cancelar pedido para seguir" : following ? "Deixar de seguir" : "Seguir"}
        className={clsx(
          "flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition disabled:opacity-50",
          following ? "border-white/15 bg-space-bg/40 text-white/80 hover:bg-white/5" : "border-orbit-purple/60 text-white hover:bg-orbit-purple/10",
          compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5",
          className
        )}
      >
        {requested ? <Clock className="h-4 w-4" /> : following ? <UserCheck className="h-4 w-4" /> : <Rss className="h-4 w-4" />}
        {!compact && (requested ? "Solicitado" : following ? "Seguindo" : "Seguir")}
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
      {requested ? "Solicitado" : following ? "Seguindo" : "Seguir"}
    </button>
  );
}

/** Approve or decline someone who asked to follow a private account (from the notification). */
export function FollowRequestActions({ followerId }: { followerId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    const { data, error } = await supabase.rpc("respond_follow_request", { p_follower: followerId, p_accept: accept });
    setBusy(null);
    if (error) return;
    setDone(String(data));
    router.refresh();
  }

  if (done === "accepted") return <span className="shrink-0 text-xs font-semibold text-emerald-400">Agora segue você</span>;
  if (done) return <span className="shrink-0 text-xs text-white/45">Pedido recusado</span>;

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        onClick={() => act(true)}
        disabled={!!busy}
        className="flex items-center gap-1 rounded-lg bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow disabled:opacity-60"
      >
        {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Aceitar
      </button>
      <button
        type="button"
        onClick={() => act(false)}
        disabled={!!busy}
        className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/5 disabled:opacity-60"
      >
        {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Recusar
      </button>
    </div>
  );
}
