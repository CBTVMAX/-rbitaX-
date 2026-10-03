"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Check, Link2, Loader2, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import { normalize } from "@/lib/music";

type Person = { id: string; name: string; username: string; avatarUrl: string | null };
const MAX = 10;

function Face({ p, size = 42 }: { p: { name: string; avatarUrl: string | null }; size?: number }) {
  return p.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white/70" style={{ width: size, height: size }}>
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Compartilhar um perfil só dentro do Órbita X: o perfil chega como cartão no Messenger dos amigos
 * escolhidos. Nada vai para outros apps; o link copiado só abre para quem tem conta.
 */
export function ShareProfileSheet({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [me, setMe] = useState<string | null>(null);
  const [target, setTarget] = useState<Person | null>(null);
  const [friends, setFriends] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ("");
    setNote("");
    setResult(null);
    if (friends) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMe(uid);
      const [{ data: profile }, { data: links }] = await Promise.all([
        supabase.from("User").select("id, name, username, avatarUrl").eq("id", profileId).maybeSingle(),
        uid
          ? supabase.from("Friendship").select("requesterId, addresseeId").eq("status", "accepted").or(`requesterId.eq.${uid},addresseeId.eq.${uid}`).limit(1000)
          : Promise.resolve({ data: [] as { requesterId: string; addresseeId: string }[] }),
      ]);
      setTarget((profile as Person | null) ?? null);
      const ids = (links ?? []).map((l) => (l.requesterId === uid ? l.addresseeId : l.requesterId)).filter((id) => id !== profileId);
      if (!ids.length) return setFriends([]);
      const { data: users } = await supabase.from("User").select("id, name, username, avatarUrl").in("id", ids.slice(0, 1000));
      setFriends(((users ?? []) as Person[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    })();
  }, [open, friends, supabase, profileId]);

  const list = useMemo(() => {
    const n = normalize(q.trim());
    return (friends ?? []).filter((f) => !n || normalize(`${f.name} ${f.username}`).includes(n));
  }, [friends, q]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX ? s : [...s, id]));

  async function send() {
    if (!me || !target || !selected.length) return;
    setBusy(true);
    let ok = 0;
    for (const friendId of selected) {
      const { data: conversationId } = await supabase.rpc("get_or_create_dm", { other_user_id: friendId });
      if (typeof conversationId !== "string") continue;
      const { error } = await supabase.from("Message").insert({
        id: crypto.randomUUID(),
        conversationId,
        senderId: me,
        content: "",
        type: "contact",
        attachments: [] as never,
        meta: { userId: target.id, name: target.name, username: target.username, avatarUrl: target.avatarUrl, avatarFrame: null } as never,
      });
      if (error) continue;
      ok++;
      const text = note.trim();
      if (text) {
        await supabase.from("Message").insert({ id: crypto.randomUUID(), conversationId, senderId: me, content: text.slice(0, 1000), type: "text", attachments: [] as never, meta: {} as never });
      }
    }
    setBusy(false);
    if (ok === selected.length) {
      setResult({ text: ok === 1 ? "Perfil enviado no Messenger." : `Perfil enviado para ${ok} amigos no Messenger.` });
      setTimeout(onClose, 1300);
    } else if (ok > 0) setResult({ text: `Enviado para ${ok} de ${selected.length}. Algumas conversas não aceitam mensagens.`, error: true });
    else setResult({ text: "Não foi possível enviar agora. Tente de novo.", error: true });
  }

  async function copyLink() {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/perfil/${target.username}`);
      setResult({ text: "Link copiado. Ele só abre para quem tem conta no Órbita X." });
    } catch {
      setResult({ text: "Não foi possível copiar o link.", error: true });
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Compartilhar perfil"
      footer={
        <div className="space-y-2">
          {selected.length > 0 && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="Escreva uma mensagem (opcional)"
              className="w-full rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-orbit-purple/70"
            />
          )}
          <button
            type="button"
            onClick={send}
            disabled={busy || !selected.length || !target}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {selected.length > 1 ? `Enviar para ${selected.length} amigos` : "Enviar no Messenger"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 pb-1">
        {target && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <Face p={target} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{target.name}</span>
              <span className="block truncate text-xs text-white/45">@{target.username}</span>
            </span>
            <button type="button" onClick={copyLink} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/5">
              <Link2 className="h-3.5 w-3.5" /> Copiar link
            </button>
          </div>
        )}
        {result && <p className={clsx("rounded-xl px-3 py-2 text-xs", result.error ? "bg-amber-500/10 text-amber-200" : "bg-emerald-500/10 text-emerald-300")}>{result.text}</p>}
        <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-orbit-purple/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar amigos" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
        </label>
        <div className="max-h-[45vh] space-y-0.5 overflow-y-auto">
          {friends === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">{friends.length ? "Ninguém encontrado." : "Você ainda não tem amigos no Órbita X."}</p>
          ) : (
            list.map((f) => {
              const on = selected.includes(f.id);
              return (
                <button key={f.id} type="button" onClick={() => toggle(f.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]">
                  <Face p={f} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{f.name}</span>
                    <span className="block truncate text-xs text-white/45">@{f.username}</span>
                  </span>
                  <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full border-2 transition", on ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25")}>
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-white/40">O perfil só pode ser compartilhado com quem tem conta no Órbita X.</p>
      </div>
    </Sheet>
  );
}
