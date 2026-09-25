"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Clock, Loader2, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseFriendState, type FriendState } from "@/lib/friends";


type Action = "send" | "cancel" | "accept" | "decline" | "remove";

/** Runs a friendship action in the database and returns the new state. */
export async function runFriendAction(action: Action, userId: string): Promise<FriendState | null> {
  const supabase = createClient();
  const { data, error } =
    action === "send"
      ? await supabase.rpc("send_friend_request", { target_user_id: userId })
      : action === "cancel"
        ? await supabase.rpc("cancel_friend_request", { target_user_id: userId })
        : action === "remove"
          ? await supabase.rpc("remove_friend", { other_user_id: userId })
          : await supabase.rpc("respond_friend_request", { requester_id: userId, accept: action === "accept" });
  if (error) return null;
  return parseFriendState(data as string);
}

const base =
  "flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition disabled:cursor-default disabled:opacity-60 md:h-auto";
const primary = "bg-orbit-gradient text-snow shadow-glow hover:opacity-90";
const outline = "border border-white/15 bg-space-bg/40 text-white hover:bg-white/5";

/**
 * "Adicionar amigo" on someone's profile. Sending also follows the person; the owner of the
 * profile accepts (friends, chat unlocked) or declines (the requester stays a follower).
 */
export function FriendButton({
  targetUserId,
  initialState,
  className,
}: {
  targetUserId: string;
  initialState: FriendState;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FriendState>(initialState);
  const [busy, setBusy] = useState<Action | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setState(initialState), [initialState]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  async function act(action: Action) {
    setBusy(action);
    setError(false);
    setMenuOpen(false);
    const next = await runFriendAction(action, targetUserId);
    setBusy(null);
    if (!next) {
      setError(true);
      return;
    }
    setState(next);
    router.refresh();
  }

  if (state === "self") return null;

  const spinner = <Loader2 className="h-4 w-4 animate-spin" />;

  if (state === "incoming") {
    return (
      <div className={clsx("flex gap-2", className)}>
        <button type="button" onClick={() => act("accept")} disabled={!!busy} className={clsx(base, primary, "flex-1 px-3 py-2.5 md:px-4")}>
          {busy === "accept" ? spinner : <Check className="h-4 w-4" />}
          <span className="md:hidden">Aceitar</span>
          <span className="hidden md:inline">Aceitar amizade</span>
        </button>
        <button
          type="button"
          onClick={() => act("decline")}
          disabled={!!busy}
          aria-label="Recusar pedido de amizade"
          title="Recusar"
          className={clsx(base, outline, "w-11 shrink-0 py-2.5 md:w-auto md:px-3.5")}
        >
          {busy === "decline" ? spinner : <X className="h-4 w-4" />}
          <span className="hidden md:inline">Recusar</span>
        </button>
      </div>
    );
  }

  if (state === "none") {
    return (
      <button
        type="button"
        onClick={() => act("send")}
        disabled={!!busy}
        title={error ? "Não foi possível enviar agora. Tente novamente." : undefined}
        className={clsx(base, primary, "px-3 py-2.5 md:px-5", className)}
      >
        {busy ? spinner : <UserPlus className="h-4 w-4" />} Adicionar amigo
      </button>
    );
  }

  const friends = state === "friends";
  return (
    <div ref={menuRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={!!busy}
        aria-expanded={menuOpen}
        className={clsx(base, outline, "w-full px-3 py-2.5 md:px-5")}
      >
        {busy ? spinner : friends ? <UserCheck className="h-4 w-4 text-emerald-400" /> : <Clock className="h-4 w-4 text-white/60" />}
        {friends ? "Amigos" : "Pedido enviado"}
      </button>
      {menuOpen && (
        <div className="absolute left-0 top-12 z-30 w-56 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
          <p className="px-4 py-2 text-xs text-white/50">
            {friends ? "Vocês são amigos e podem conversar pelo Messenger." : "Aguardando a pessoa aceitar seu pedido."}
          </p>
          <button
            type="button"
            onClick={() => act(friends ? "remove" : "cancel")}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5"
          >
            {friends ? <UserMinus className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {friends ? "Desfazer amizade" : "Cancelar pedido"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Compact Aceitar / Recusar pair for request lists (notifications, profile). */
export function FriendRequestActions({ requesterId }: { requesterId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [done, setDone] = useState<FriendState | null>(null);

  async function act(action: "accept" | "decline") {
    setBusy(action);
    const next = await runFriendAction(action, requesterId);
    setBusy(null);
    if (next) {
      setDone(next);
      router.refresh();
    }
  }

  if (done === "friends") return <span className="shrink-0 text-xs font-semibold text-emerald-400">Agora vocês são amigos</span>;
  if (done) return <span className="shrink-0 text-xs text-white/45">Pedido recusado</span>;

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        onClick={() => act("accept")}
        disabled={!!busy}
        className="flex items-center gap-1 rounded-lg bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow disabled:opacity-60"
      >
        {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Aceitar
      </button>
      <button
        type="button"
        onClick={() => act("decline")}
        disabled={!!busy}
        className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/5 disabled:opacity-60"
      >
        {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Recusar
      </button>
    </div>
  );
}
