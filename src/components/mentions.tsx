"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { AtSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Marcação de perfis e comunidades nas publicações, como no VK:
 * digite @, escolha a pessoa e o texto entra como "@usuario (Nome)". O que está entre parênteses é o
 * texto que aparece (troque por "amor", "mãe"…); o link sempre leva ao perfil do @usuario.
 */
export type MentionItem = { type: "user" | "community"; handle: string; name: string; avatar: string | null };

/** "@usuario (texto)" — mesmo padrão do VK. */
export const MENTION_LABELED = /@([A-Za-z0-9_.]{2,30}) \(([^()\n]{0,60})\)/g;

export function useMentionPicker(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, setValue: (v: string) => void) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<MentionItem[]>([]);
  const [open, setOpen] = useState(false);
  const range = useRef<{ start: number; end: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friends = useRef<MentionItem[] | null>(null);

  const loadFriends = useCallback(async () => {
    if (friends.current) return friends.current;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return (friends.current = []);
    const { data: links } = await supabase
      .from("Friendship")
      .select("requesterId, addresseeId")
      .eq("status", "accepted")
      .or(`requesterId.eq.${uid},addresseeId.eq.${uid}`)
      .order("respondedAt", { ascending: false })
      .limit(8);
    const ids = (links ?? []).map((l) => (l.requesterId === uid ? l.addresseeId : l.requesterId));
    if (!ids.length) return (friends.current = []);
    const { data: users } = await supabase.from("User").select("id, name, username, avatarUrl").in("id", ids);
    friends.current = (users ?? []).map((u) => ({ type: "user" as const, handle: u.username, name: u.name, avatar: u.avatarUrl }));
    return friends.current;
  }, [supabase]);

  const search = useCallback(
    async (q: string) => {
      if (!q) {
        setItems(await loadFriends());
        return;
      }
      const safe = q.replace(/[%,()]/g, "");
      const [u, c] = await Promise.all([
        supabase.from("User").select("id, name, username, avatarUrl").or(`username.ilike.%${safe}%,name.ilike.%${safe}%`).limit(6),
        supabase.from("Community").select("id, name, username, slug, avatarUrl").or(`username.ilike.%${safe}%,name.ilike.%${safe}%,slug.ilike.%${safe}%`).limit(3),
      ]);
      const users: MentionItem[] = (u.data ?? []).map((x) => ({ type: "user", handle: x.username, name: x.name, avatar: x.avatarUrl }));
      const comms: MentionItem[] = (c.data ?? []).map((x) => ({ type: "community", handle: x.username ?? x.slug, name: x.name, avatar: x.avatarUrl }));
      setItems([...users, ...comms].slice(0, 8));
    },
    [supabase, loadFriends]
  );

  /** Chame no onChange/onKeyUp/onClick do campo. */
  const scan = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart ?? el.value.length;
    const m = el.value.slice(0, pos).match(/(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/);
    if (!m) {
      range.current = null;
      setOpen(false);
      return;
    }
    const q = m[1];
    range.current = { start: pos - q.length - 1, end: pos };
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), q ? 180 : 0);
  }, [ref, search]);

  /** Entra "@usuario (Nome) " e deixa o Nome selecionado para trocar na hora. */
  const pick = useCallback(
    (it: MentionItem) => {
      const r = range.current;
      if (!r) return;
      const label = it.name.replace(/[()\n]/g, " ").trim().slice(0, 60) || it.handle;
      const insert = `@${it.handle} (${label}) `;
      setValue(value.slice(0, r.start) + insert + value.slice(r.end));
      range.current = null;
      setOpen(false);
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const s = r.start + it.handle.length + 3;
        el.focus();
        el.setSelectionRange(s, s + label.length);
      });
    },
    [ref, setValue, value]
  );

  /**
   * Apagar devagar, como no VK: o Backspace come o texto entre parênteses letra por letra sem quebrar a
   * marcação. Com os parênteses vazios é só digitar a palavra nova ("amor", "mãe"…), e o link continua.
   * Apagar dentro do @usuario remove a marcação inteira, para nunca virar link de outra pessoa.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Backspace" || e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return;
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      if (pos !== el.selectionEnd) return;
      for (const m of el.value.matchAll(MENTION_LABELED)) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        const handleEnd = start + 1 + m[1].length;
        const labelStart = handleEnd + 2;
        const labelEnd = end - 1;
        let next: string | null = null;
        let caret = pos;
        if (pos > start && pos <= handleEnd) {
          next = el.value.slice(0, start) + el.value.slice(end);
          caret = start;
        } else if (labelStart === labelEnd && (pos === end || pos === labelStart)) {
          next = el.value.slice(0, handleEnd) + el.value.slice(end);
          caret = handleEnd;
        } else if (pos === end) {
          next = el.value.slice(0, labelEnd - 1) + el.value.slice(labelEnd);
          caret = labelEnd - 1;
        } else if (pos === labelStart) {
          e.preventDefault();
          return;
        }
        if (next === null) continue;
        e.preventDefault();
        setValue(next);
        requestAnimationFrame(() => {
          const t = ref.current;
          if (!t) return;
          t.focus();
          t.setSelectionRange(caret, caret);
        });
        return;
      }
    },
    [ref, setValue]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { items, open: open && items.length > 0, scan, pick, onKeyDown, close: () => setOpen(false) };
}

function Face({ it }: { it: MentionItem }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-space-card text-sm text-white/70">
      {it.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        it.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** Lista de sugestões (nome à esquerda, @ à direita), como no VK. */
export function MentionPanel({ items, onPick, floating = false, above = false }: { items: MentionItem[]; onPick: (it: MentionItem) => void; floating?: boolean; above?: boolean }) {
  return (
    <div
      className={clsx(
        "overflow-hidden border-white/10 bg-space-surface",
        floating ? clsx("absolute left-0 right-0 z-30 rounded-xl border shadow-2xl", above ? "bottom-full mb-1" : "top-full mt-1") : "border-t"
      )}
    >
      <div className="max-h-64 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it.type + it.handle}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(it);
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5"
          >
            <Face it={it} />
            <span className="min-w-0 flex-1 truncate text-[15px] text-white">{it.name}</span>
            <span className="max-w-[45%] shrink-0 truncate text-sm text-white/45">
              @{it.handle}
              {it.type === "community" ? " · comunidade" : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/40">Comece a escrever o nome, o nome da comunidade ou um endereço curto</p>
    </div>
  );
}

/** Mostra como as marcações vão aparecer e como trocar o texto. */
export function MentionHint({ value, className }: { value: string; className?: string }) {
  const tags = [...value.matchAll(MENTION_LABELED)].slice(0, 6);
  if (!tags.length) return null;
  return (
    <div className={clsx("space-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55", className)}>
      {tags.map((t, i) => (
        <p key={i} className="flex items-center gap-1.5 truncate">
          <AtSign className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />
          <span className="truncate">
            {t[2].trim() ? (
              <>
                Vai aparecer <span className="font-semibold text-orbit-cyan">{t[2].trim()}</span> com link para @{t[1]}
              </>
            ) : (
              <>Escreva entre os parênteses como quer chamar @{t[1]}</>
            )}
          </span>
        </p>
      ))}
      <p className="text-[11px] text-white/40">Para trocar, apague o nome entre parênteses e escreva o que quiser (ex.: “amor”, “mãe”, “pai”).</p>
    </div>
  );
}
