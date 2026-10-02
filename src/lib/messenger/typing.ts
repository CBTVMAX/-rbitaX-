"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * "Digitando…" em tempo real, sem gravar nada no banco: cada conversa tem um canal de broadcast
 * (`typing:<conversa>`), quem digita avisa a cada ~2,5 s e o aviso expira sozinho em 6 s.
 * A conversa aberta e a lista usam o mesmo canal (contagem de referências).
 */
type Client = SupabaseClient<Database>;
type Typer = { id: string; name: string; until: number };

const TTL = 6000;
const PING_EVERY = 2500;

const channels = new Map<string, { ch: RealtimeChannel; refs: number }>();
const typers = new Map<string, Map<string, Typer>>();
const listeners = new Set<() => void>();
const snapshots = new Map<string, Typer[]>();
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function emit(conversationId: string) {
  const map = typers.get(conversationId);
  snapshots.set(conversationId, map ? [...map.values()] : []);
  listeners.forEach((l) => l());
}

function prune() {
  const now = Date.now();
  let any = false;
  typers.forEach((map, conversationId) => {
    let changed = false;
    map.forEach((t, id) => {
      if (t.until <= now) {
        map.delete(id);
        changed = true;
      }
    });
    if (changed) emit(conversationId);
    if (map.size) any = true;
  });
  if (!any && pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

function acquire(supabase: Client, conversationId: string) {
  const found = channels.get(conversationId);
  if (found) {
    found.refs++;
    return found.ch;
  }
  const ch = supabase
    .channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const p = payload as { userId?: string; name?: string; typing?: boolean };
      if (!p.userId) return;
      const map = typers.get(conversationId) ?? new Map<string, Typer>();
      if (p.typing) map.set(p.userId, { id: p.userId, name: (p.name ?? "").slice(0, 60), until: Date.now() + TTL });
      else map.delete(p.userId);
      typers.set(conversationId, map);
      emit(conversationId);
      if (map.size && !pruneTimer) pruneTimer = setInterval(prune, 1000);
    })
    .subscribe();
  channels.set(conversationId, { ch, refs: 1 });
  return ch;
}

function release(supabase: Client, conversationId: string) {
  const found = channels.get(conversationId);
  if (!found) return;
  if (--found.refs > 0) return;
  channels.delete(conversationId);
  supabase.removeChannel(found.ch);
  typers.delete(conversationId);
  emit(conversationId);
}

/** Mantém abertos os canais destas conversas (a conversa aberta, as primeiras da lista). */
export function useTypingChannels(supabase: Client, conversationIds: string[]) {
  const key = conversationIds.join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    ids.forEach((id) => acquire(supabase, id));
    return () => ids.forEach((id) => release(supabase, id));
  }, [supabase, key]);
}

const EMPTY: Typer[] = [];

/** Quem está digitando nesta conversa agora (sem contar você). */
export function useTypingIn(conversationId: string, meId: string) {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshots.get(conversationId) ?? EMPTY,
    () => EMPTY
  );
  return list.filter((t) => t.id !== meId);
}

/** Texto curto para cabeçalho e lista. */
export function typingLabel(list: { name: string }[], group: boolean) {
  if (!list.length) return null;
  if (!group) return "digitando";
  const first = list[0].name.split(" ")[0] || "Alguém";
  if (list.length === 1) return `${first} está digitando`;
  if (list.length === 2) return `${first} e ${list[1].name.split(" ")[0] || "outra pessoa"} estão digitando`;
  return `${list.length} pessoas estão digitando`;
}

const lastPing = new Map<string, number>();

/** Avisa que você está digitando (com intervalo mínimo) ou que parou. */
export function sendTyping(supabase: Client, conversationId: string, me: { id: string; name: string }, typing: boolean) {
  const now = Date.now();
  if (typing && now - (lastPing.get(conversationId) ?? 0) < PING_EVERY) return;
  if (!typing && !lastPing.get(conversationId)) return;
  lastPing.set(conversationId, typing ? now : 0);
  const ch = channels.get(conversationId)?.ch ?? acquire(supabase, conversationId);
  ch.send({ type: "broadcast", event: "typing", payload: { userId: me.id, name: me.name, typing } }).catch(() => {});
}
