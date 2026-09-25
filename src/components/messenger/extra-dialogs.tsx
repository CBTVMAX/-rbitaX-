"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Bookmark, FileUp, Gift, Link2, Loader2, Paperclip, Send, X } from "lucide-react";
import { CoinAmount, CoinIcon, formatCoins } from "@/components/coins";
import { ensureSavedId, saveFilesToSaved, saveNoteToSaved } from "@/lib/messenger/saved";
import type { Conversation, Member } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ChatAvatar, GhostButton, Modal, PrimaryButton } from "./ui";

type GiftProduct = { id: string; name: string; description: string; image: string; priceCoins: number };

/** Virtual gifts: the price and the recipient are checked again by the database (send_gift). */
export function GiftDialog({
  open,
  onClose,
  c,
  members,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  c: Conversation;
  members: Member[];
  onSent: () => void;
}) {
  const { supabase, me, toast } = useMessenger();
  const [gifts, setGifts] = useState<GiftProduct[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const others = members.filter((m) => m.id !== me.id);

  useEffect(() => {
    if (!open) return;
    setPick(null);
    setNote("");
    setError(null);
    setTo(c.isGroup ? null : c.otherUser?.id ?? null);
    supabase
      .from("StoreProduct")
      .select("id, name, description, image, priceCoins")
      .eq("kind", "gift")
      .order("sortOrder")
      .then(({ data }) => setGifts((data ?? []) as GiftProduct[]));
    supabase.rpc("my_coin_balance").then(({ data }) => setBalance(typeof data === "number" ? data : 0));
  }, [open, supabase, c.isGroup, c.otherUser?.id]);

  const chosen = gifts?.find((g) => g.id === pick) ?? null;
  const short = !!chosen && balance !== null && chosen.priceCoins > balance;

  async function send() {
    if (!chosen || !to) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("send_gift", {
      p_conversation_id: c.id,
      p_product_id: chosen.id,
      p_recipient_id: to,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (e) {
      setError(
        /insufficient_coins/.test(e.message)
          ? "Saldo de Órbita Coins insuficiente para este presente."
          : /rate_limited/.test(e.message)
            ? "Muitos presentes em pouco tempo. Tente de novo mais tarde."
            : "Não foi possível enviar o presente agora."
      );
      return;
    }
    toast(`Presente enviado: ${chosen.name} 🎁`);
    onSent();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-chat" /> Enviar presente
        </span>
      }
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton onClick={send} disabled={!chosen || !to || busy || short}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {chosen ? (chosen.priceCoins ? `Enviar por ${formatCoins(chosen.priceCoins)}` : "Enviar grátis") : "Enviar"}
          </PrimaryButton>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
        <span className="text-xs text-white/60">Seu saldo</span>
        {balance === null ? <Loader2 className="h-4 w-4 animate-spin text-white/40" /> : <CoinAmount value={balance} className="text-sm text-amber-500" />}
      </div>

      {gifts === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {gifts.map((g) => {
            const on = pick === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setPick(g.id)}
                aria-pressed={on}
                className={clsx(
                  "flex flex-col items-center rounded-2xl border px-1 pb-2 pt-2.5 transition",
                  on ? "border-chat/70 bg-chat/15 shadow-[0_0_18px_rgb(var(--chat-accent,139_92_246)/0.25)]" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt="" loading="lazy" className="h-14 w-14 object-contain" />
                <span className="mt-1 text-[13px] font-semibold text-white">{g.name}</span>
                <span className={clsx("mt-0.5 text-[11px] font-semibold", g.priceCoins ? "text-amber-500" : "text-emerald-400")}>
                  {g.priceCoins ? (
                    <span className="inline-flex items-center gap-1">
                      <CoinIcon className="h-3 w-3" />
                      {formatCoins(g.priceCoins)}
                    </span>
                  ) : (
                    "Grátis"
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {c.isGroup && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Para quem?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {others.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTo(m.id)}
                aria-pressed={to === m.id}
                className={clsx(
                  "flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl border p-1.5 text-[11px] transition",
                  to === m.id ? "border-chat/70 bg-chat/15 text-white" : "border-transparent text-white/60 hover:text-white"
                )}
              >
                <ChatAvatar name={m.name} url={m.avatarUrl} size={40} frame={m.avatarFrame} />
                <span className="w-full truncate">{m.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Mensagem (opcional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 80))}
          placeholder="Escreva algo carinhoso…"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-chat/60"
        />
      </label>

      {(short || error) && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error ?? "Saldo de Órbita Coins insuficiente para este presente."}{" "}
          <Link href="/loja" className="font-semibold underline">
            Abrir a loja
          </Link>
        </p>
      )}
    </Modal>
  );
}

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "+" → Link: paste an address, optionally with a comment; it is sent as a normal message. */
export function LinkDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (text: string) => void }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const valid = normalizeUrl(url);
  useEffect(() => {
    if (open) {
      setUrl("");
      setText("");
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-chat" /> Compartilhar link
        </span>
      }
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton disabled={!valid} onClick={() => valid && onSend(text.trim() ? `${text.trim()}\n${valid}` : valid)}>
            <Send className="h-4 w-4" /> Enviar
          </PrimaryButton>
        </>
      }
    >
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        inputMode="url"
        placeholder="https://"
        aria-label="Endereço do link"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-chat/60"
      />
      {url && !valid && <p className="mt-1.5 text-xs text-red-300">Confira o endereço do link.</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 1000))}
        rows={2}
        placeholder="Comentário (opcional)"
        aria-label="Comentário"
        className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-chat/60"
      />
    </Modal>
  );
}

/** "+" → Salvar nos meus salvos: a note and/or files go straight to "Salvos", without sending here. */
export function SaveToSavedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase, me, toast, savedId, reloadConversations } = useMessenger();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setFiles([]);
    }
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      const id = savedId ?? (await ensureSavedId(supabase));
      if (note.trim()) await saveNoteToSaved(supabase, id, me.id, note);
      const ok = files.length ? await saveFilesToSaved(supabase, id, me.id, files) : 0;
      if (ok < files.length) toast("Alguns arquivos não puderam ser salvos (limite de 50 MB).", "error");
      else toast("Guardado nos seus Salvos.");
      reloadConversations();
      onClose();
    } catch {
      toast("Não foi possível salvar agora.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-chat" /> Salvar nos meus salvos
        </span>
      }
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton onClick={save} disabled={busy || (!note.trim() && !files.length)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />} Salvar
          </PrimaryButton>
        </>
      }
    >
      <p className="mb-3 text-xs text-white/50">Fica só no seu espaço pessoal. Ninguém mais vê.</p>
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 4000))}
        rows={3}
        placeholder="Escreva uma nota, cole um link…"
        aria-label="Nota"
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-chat/60"
      />
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          setFiles((prev) => [...prev, ...list].slice(0, 10));
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-2.5 text-sm font-medium text-white/75 transition hover:border-chat/60 hover:text-white"
      >
        <FileUp className="h-4 w-4" /> Adicionar fotos, vídeos ou arquivos
      </button>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5 text-xs text-white/75">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-white/40" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remover ${f.name}`} className="text-white/45 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
