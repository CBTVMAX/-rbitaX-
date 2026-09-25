"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Check, Loader2, LocateFixed, MapPin, Plus, Search, Send, Trash2, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { conversationTitle, type ChatUser, type Conversation } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ChatAvatar, ConversationAvatar, GhostButton, Modal, PrimaryButton } from "./ui";

/** Accepted friendships of the signed-in person (groups, contacts and forwarding only involve friends). */
export async function loadFriends(supabase: SupabaseClient<Database>, meId: string): Promise<ChatUser[]> {
  const { data: rows } = await supabase
    .from("Friendship")
    .select("requesterId, addresseeId")
    .eq("status", "accepted")
    .or(`requesterId.eq.${meId},addresseeId.eq.${meId}`);
  const ids = (rows ?? []).map((r) => (r.requesterId === meId ? r.addresseeId : r.requesterId));
  if (!ids.length) return [];
  const { data: users } = await supabase
    .from("User")
    .select("id, name, username, avatarUrl, presence, avatarFrame, isVerified")
    .in("id", ids)
    .order("name");
  return (users ?? []) as ChatUser[];
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function useFriends(enabled: boolean) {
  const { supabase, me } = useMessenger();
  const [friends, setFriends] = useState<ChatUser[] | null>(null);
  useEffect(() => {
    if (!enabled || friends) return;
    loadFriends(supabase, me.id).then(setFriends);
  }, [enabled, friends, supabase, me.id]);
  return friends;
}

export function FriendPicker({
  friends,
  selected,
  onToggle,
  exclude = [],
  single,
}: {
  friends: ChatUser[] | null;
  selected: string[];
  onToggle: (u: ChatUser) => void;
  exclude?: string[];
  single?: boolean;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = normalize(q.trim().replace(/^@/, ""));
    return (friends ?? []).filter(
      (f) => !exclude.includes(f.id) && (!n || normalize(f.name).includes(n) || normalize(f.username).includes(n))
    );
  }, [friends, q, exclude]);

  return (
    <div>
      <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-orbit-purple/60">
        <Search className="h-4 w-4 text-white/40" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar amigos"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </label>
      <div className="mt-3 space-y-0.5">
        {friends === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/45">
            {friends.length ? "Ninguém encontrado." : "Você ainda não tem amigos no ÓrbitaX."}
          </p>
        ) : (
          list.map((f) => {
            const on = selected.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onToggle(f)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <ChatAvatar name={f.name} url={f.avatarUrl} size={42} presence={f.presence ?? "offline"} frame={f.avatarFrame} ringClass="border-space-surface" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{f.name}</span>
                  <span className="block truncate text-xs text-white/45">@{f.username}</span>
                </span>
                {!single && (
                  <span
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition",
                      on ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25"
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function PollDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (q: string, options: string[], multiple: boolean) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
      setMultiple(false);
    }
  }, [open]);
  const clean = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim().length > 0 && clean.length >= 2 && new Set(clean).size === clean.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova enquete"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton disabled={!valid} onClick={() => onSend(question.trim(), clean, multiple)}>
            <Send className="h-4 w-4" /> Enviar enquete
          </PrimaryButton>
        </>
      }
    >
      <label className="block text-xs font-medium text-white/55">Pergunta</label>
      <input
        autoFocus
        value={question}
        maxLength={200}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="O que vocês acham?"
        className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
      />
      <label className="mt-4 block text-xs font-medium text-white/55">Opções</label>
      <div className="mt-1.5 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o}
              maxLength={100}
              onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Opção ${i + 1}`}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-orbit-purple/60"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remover opção"
                className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 10 && (
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="mt-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-orbit-purple hover:bg-orbit-purple/10"
        >
          <Plus className="h-4 w-4" /> Adicionar opção
        </button>
      )}
      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
        <span className="text-sm text-white/80">Permitir mais de uma resposta</span>
        <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="h-4 w-4 accent-orbit-purple" />
      </label>
    </Modal>
  );
}

export function LocationDialog({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (p: { lat: number; lng: number; accuracy: number; label: string }) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setState("loading");
    setPos(null);
    setLabel("");
    if (!navigator.geolocation) {
      setState("error");
      setError("Seu navegador não permite compartilhar a localização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const next = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: Math.round(p.coords.accuracy) };
        setPos(next);
        setState("ready");
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=pt-BR&lat=${next.lat}&lon=${next.lng}`
          );
          const j = await r.json();
          const a = j?.address ?? {};
          const text = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean).join(", ");
          if (text) setLabel((l) => l || text);
        } catch {
          /* the coordinates are enough */
        }
      },
      (err) => {
        setState("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permita o acesso à localização nas configurações do navegador para compartilhar onde você está."
            : "Não foi possível descobrir sua localização agora. Tente de novo em um lugar aberto."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartilhar localização"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton disabled={!pos} onClick={() => pos && onSend({ ...pos, label: label.trim().slice(0, 120) })}>
            <Send className="h-4 w-4" /> Enviar localização
          </PrimaryButton>
        </>
      }
    >
      {state === "loading" && (
        <div className="flex flex-col items-center py-10 text-center">
          <LocateFixed className="h-9 w-9 animate-pulse text-orbit-cyan" />
          <p className="mt-3 text-sm text-white/60">Buscando sua localização…</p>
        </div>
      )}
      {state === "error" && <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {state === "ready" && pos && (
        <div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-snow">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-white">Sua localização atual</span>
              <span className="text-xs text-white/50">Precisão de aproximadamente {pos.accuracy} m</span>
            </span>
          </div>
          <label className="mt-4 block text-xs font-medium text-white/55">Descrição (opcional)</label>
          <input
            value={label}
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Estou aqui na praça"
            className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
          />
          <p className="mt-3 text-[11px] text-white/40">Só as pessoas desta conversa veem o local enviado.</p>
        </div>
      )}
    </Modal>
  );
}

export function ContactDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (u: ChatUser) => void }) {
  const friends = useFriends(open);
  return (
    <Modal open={open} onClose={onClose} title="Compartilhar contato">
      <FriendPicker friends={friends} selected={[]} single onToggle={(u) => onSend(u)} />
    </Modal>
  );
}

export function ForwardDialog({
  open,
  onClose,
  onForward,
  currentId,
}: {
  open: boolean;
  onClose: () => void;
  onForward: (ids: string[]) => Promise<void>;
  currentId: string | null;
}) {
  const { conversations } = useMessenger();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setSelected([]);
      setQ("");
    }
  }, [open]);
  const list = conversations.filter(
    (c) => c.sendStatus === "ok" && !c.isSaved && (!q || normalize(conversationTitle(c)).includes(normalize(q)))
  );
  const toggle = (c: Conversation) =>
    setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : s.length >= 10 ? s : [...s, c.id]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encaminhar para…"
      footer={
        <PrimaryButton
          disabled={!selected.length || busy}
          onClick={async () => {
            setBusy(true);
            await onForward(selected);
            setBusy(false);
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar{selected.length > 1 ? ` (${selected.length})` : ""}
        </PrimaryButton>
      }
    >
      <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-orbit-purple/60">
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar conversa"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </label>
      <div className="mt-3 space-y-0.5">
        {list.length === 0 && <p className="py-8 text-center text-sm text-white/45">Nenhuma conversa disponível.</p>}
        {list.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
            >
              <ConversationAvatar c={c} size={42} ringClass="border-space-surface" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {conversationTitle(c)}
                  {c.id === currentId && <span className="ml-1.5 text-xs text-white/40">(esta conversa)</span>}
                </span>
                <span className="block truncate text-xs text-white/45">
                  {c.isGroup ? `${c.memberCount} membros` : `@${c.otherUser?.username ?? ""}`}
                </span>
              </span>
              <span
                className={clsx(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition",
                  on ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25"
                )}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function AddMembersDialog({
  open,
  onClose,
  existing,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  existing: string[];
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const friends = useFriends(open);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orbit-cyan" /> Adicionar pessoas
        </span>
      }
      footer={
        <PrimaryButton
          disabled={!selected.length || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd(selected);
            setBusy(false);
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar{selected.length ? ` (${selected.length})` : ""}
        </PrimaryButton>
      }
    >
      <FriendPicker
        friends={friends}
        selected={selected}
        exclude={existing}
        onToggle={(u) => setSelected((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))}
      />
    </Modal>
  );
}
