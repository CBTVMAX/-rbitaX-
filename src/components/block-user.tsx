"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Ban, Loader2, MoreHorizontal, ShieldOff, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { runFriendAction } from "@/components/friend-button";
import { useLiveCounts } from "@/components/live-activity";

/**
 * Bloquear: o banco desfaz a amizade sozinho e passa a impedir mensagens, pedidos de amizade,
 * comentários e o acesso ao conteúdo entre as duas pessoas. Aqui também deixamos de seguir.
 */
export async function blockUser(userId: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error("not_authenticated");
  const { error } = await supabase.from("Block").insert({ id: crypto.randomUUID(), blockerId: me, blockedId: userId });
  if (error && error.code !== "23505") throw error;
  await supabase.from("Follow").delete().eq("followerId", me).eq("followingId", userId);
}

export async function unblockUser(userId: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error("not_authenticated");
  const { error } = await supabase.from("Block").delete().eq("blockerId", me).eq("blockedId", userId);
  if (error) throw error;
}

/** Janela de confirmação (bloquear, desbloquear ou desfazer amizade). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="animate-pop-in w-full max-w-sm rounded-t-3xl border border-white/10 bg-space-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-white/65">{message}</div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/5 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-snow disabled:opacity-60",
              danger ? "bg-red-500 hover:bg-red-500/90" : "bg-orbit-gradient"
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type Pending = "block" | "unblock" | "unfriend" | null;

/** Estado + diálogos de bloquear/desbloquear/desfazer amizade, para qualquer menu reaproveitar. */
export function useRelationshipActions({ userId, name, onDone }: { userId: string; name: string; onDone?: (a: Exclude<Pending, null>) => void }) {
  const router = useRouter();
  const { refresh: refreshCounts } = useLiveCounts();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = name.split(" ")[0] || name;

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending === "block") await blockUser(userId);
      else if (pending === "unblock") await unblockUser(userId);
      else if (!(await runFriendAction("remove", userId))) throw new Error("remove_failed");
      const done = pending;
      setPending(null);
      onDone?.(done);
      router.refresh();
      refreshCounts();
    } catch {
      setError("Não foi possível concluir agora. Tente novamente.");
    }
    setBusy(false);
  }

  const texts = {
    block: {
      title: `Bloquear ${first}?`,
      message: (
        <ul className="list-disc space-y-1 pl-4">
          <li>{first} não poderá ver seu perfil e suas publicações, nem mandar mensagens ou pedidos de amizade.</li>
          <li>A amizade é desfeita e você deixa de seguir.</li>
          <li>{first} não é avisado(a). Você pode desbloquear quando quiser.</li>
        </ul>
      ),
      label: "Bloquear",
      danger: true,
    },
    unblock: {
      title: `Desbloquear ${first}?`,
      message: <>Vocês voltam a se ver no ÓrbitaX. A amizade não volta sozinha: se quiser, envie um novo pedido.</>,
      label: "Desbloquear",
      danger: false,
    },
    unfriend: {
      title: `Desfazer amizade com ${first}?`,
      message: <>Vocês deixam de ser amigos e o chat fica bloqueado até um novo pedido ser aceito. {first} não é avisado(a).</>,
      label: "Desfazer amizade",
      danger: true,
    },
  } as const;

  const t = pending ? texts[pending] : null;
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={t?.title ?? ""}
      message={
        <>
          {t?.message}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </>
      }
      confirmLabel={t?.label ?? ""}
      danger={t?.danger ?? true}
      busy={busy}
      onConfirm={confirm}
      onClose={() => (setPending(null), setError(null))}
    />
  );

  return { ask: setPending, dialog };
}

/** Aviso no lugar do perfil quando você bloqueou a pessoa. */
export function BlockedProfileNotice({ userId, name }: { userId: string; name: string }) {
  const { ask, dialog } = useRelationshipActions({ userId, name });
  return (
    <section className="ox-card rounded-2xl border border-white/10 bg-space-surface/90 p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-300">
        <Ban className="h-6 w-6" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-white">Você bloqueou {name}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-white/55">Vocês não veem as publicações um do outro e não podem conversar nem enviar pedidos de amizade.</p>
      <button type="button" onClick={() => ask("unblock")} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
        <ShieldOff className="h-4 w-4" /> Desbloquear
      </button>
      {dialog}
    </section>
  );
}

/** Botão compacto "Desbloquear" para listas. */
export function UnblockButton({ userId, name }: { userId: string; name: string }) {
  const { ask, dialog } = useRelationshipActions({ userId, name });
  return (
    <>
      <button type="button" onClick={() => ask("unblock")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/5">
        Desbloquear
      </button>
      {dialog}
    </>
  );
}

/** Menu "⋯" de cada amigo na lista: desfazer amizade ou bloquear. */
export function FriendRowMenu({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { ask, dialog } = useRelationshipActions({ userId, name });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item = "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-white/5";
  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Opções para ${name}`}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
          <button type="button" role="menuitem" onClick={() => (setOpen(false), ask("unfriend"))} className={clsx(item, "text-white/85")}>
            <UserMinus className="h-4 w-4" /> Desfazer amizade
          </button>
          <button type="button" role="menuitem" onClick={() => (setOpen(false), ask("block"))} className={clsx(item, "text-red-400")}>
            <Ban className="h-4 w-4" /> Bloquear
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
}
