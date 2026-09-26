"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Bell, BellOff, Check, Clock, Loader2, Lock, LogOut, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { communityError, type Role } from "@/lib/communities";
import { Confirm, Sheet } from "@/components/community/ui";

type State = "none" | "member" | "pending" | "banned";

/**
 * Participar / Participando / Pedido enviado — everything goes through the community_* RPCs:
 * public communities let you in right away, private ones create a join request for the staff.
 */
export function CommunityJoinButton({
  communityId,
  initiallyMember,
  isPrivate = false,
  role = null,
  request = null,
  banned = false,
  notify: initialNotify = true,
  size = "sm",
  onChange,
}: {
  communityId: string;
  userId?: string;
  initiallyMember: boolean;
  isPrivate?: boolean;
  role?: Role | null;
  request?: "pending" | "rejected" | null;
  banned?: boolean;
  notify?: boolean;
  size?: "sm" | "lg";
  onChange?: (state: State) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState<State>(banned ? "banned" : initiallyMember ? "member" : request === "pending" ? "pending" : "none");
  const [notify, setNotify] = useState(initialNotify);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [askLeave, setAskLeave] = useState(false);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const set = (s: State) => {
    setState(s);
    onChange?.(s);
  };

  async function join(msg = "") {
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("community_join", { p_community: communityId, p_message: msg });
    setBusy(false);
    if (e) return setError(communityError(e.message));
    setAsking(false);
    set(data === "requested" ? "pending" : "member");
    router.refresh();
  }

  async function leave() {
    setBusy(true);
    const { error: e } = await supabase.rpc("community_leave", { p_community: communityId });
    setBusy(false);
    setAskLeave(false);
    setMenu(false);
    if (e) return setError(communityError(e.message));
    set("none");
    router.refresh();
  }

  async function cancelRequest() {
    setBusy(true);
    await supabase.rpc("community_cancel_request", { p_community: communityId });
    setBusy(false);
    setMenu(false);
    set("none");
    router.refresh();
  }

  async function toggleNotify() {
    const next = !notify;
    setNotify(next);
    const { error: e } = await supabase.rpc("community_set_notify", { p_community: communityId, p_on: next });
    if (e) setNotify(!next);
  }

  const big = size === "lg";
  const base = clsx("flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:opacity-60", big ? "h-11 px-5 text-sm" : "px-4 py-1.5 text-xs");

  if (state === "banned")
    return (
      <span className={clsx(base, "border border-red-400/30 text-red-300")}>
        <Lock className="h-3.5 w-3.5" /> Bloqueado
      </span>
    );

  return (
    <>
      {state === "member" ? (
        <button type="button" onClick={() => setMenu(true)} className={clsx(base, "border border-white/15 bg-white/[0.04] text-white/90 hover:bg-white/[0.08]")}>
          <Check className="h-4 w-4 text-emerald-400" /> Participando
        </button>
      ) : state === "pending" ? (
        <button type="button" onClick={() => setMenu(true)} className={clsx(base, "border border-amber-400/30 bg-amber-400/[0.06] text-amber-300")}>
          <Clock className="h-4 w-4" /> Pedido enviado
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (isPrivate ? setAsking(true) : join())}
          disabled={busy}
          className={clsx(base, "bg-orbit-gradient text-snow shadow-glow hover:opacity-90")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isPrivate ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isPrivate ? "Pedir para entrar" : "Participar"}
        </button>
      )}
      {error && !menu && !asking && <p className="mt-1 text-[11px] text-red-300">{error}</p>}

      <Sheet open={menu} onClose={() => setMenu(false)} title={state === "pending" ? "Pedido para entrar" : "Participação"}>
        {state === "pending" ? (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-white/65">Seu pedido está com a equipe da comunidade. Você recebe uma notificação quando ele for aprovado.</p>
            <button type="button" onClick={cancelRequest} disabled={busy} className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/85 hover:bg-white/5">
              Cancelar pedido
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <button type="button" onClick={toggleNotify} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:bg-white/[0.04]">
              {notify ? <Bell className="h-5 w-5 text-orbit-cyan" /> : <BellOff className="h-5 w-5 text-white/45" />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white">Notificações da comunidade</span>
                <span className="block text-[11px] text-white/45">{notify ? "Ativas: novos posts, discussões e anúncios" : "Desativadas"}</span>
              </span>
              <span className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", notify ? "bg-orbit-gradient" : "bg-white/15")}>
                <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", notify ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
            {role === "owner" ? (
              <p className="px-1 pt-1 text-[11px] text-white/45">Você é o proprietário. Para sair, transfira a comunidade em Gerenciar → Membros.</p>
            ) : (
              <button
                type="button"
                onClick={() => setAskLeave(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-400/20 px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-400/[0.06]"
              >
                <LogOut className="h-5 w-5" /> Sair da comunidade
              </button>
            )}
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={asking} onClose={() => setAsking(false)} title="Pedir para entrar">
        <p className="text-sm text-white/65">Esta comunidade é privada. A equipe vai analisar seu pedido.</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="Conte por que quer participar (opcional)"
          className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
        />
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <button type="button" onClick={() => join(message)} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar pedido
        </button>
      </Sheet>

      <Confirm
        open={askLeave}
        title="Sair da comunidade?"
        message={isPrivate ? "Esta comunidade é privada: para voltar, será preciso pedir para entrar de novo." : "Você pode voltar quando quiser."}
        confirmLabel="Sair"
        busy={busy}
        onConfirm={leave}
        onClose={() => setAskLeave(false)}
      />
    </>
  );
}
