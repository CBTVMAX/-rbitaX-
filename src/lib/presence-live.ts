"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { presenceOf, type Presence } from "@/lib/presence";

/**
 * Live presence of other people, read from the server-computed "UserPresence" table
 * and kept current through Supabase Realtime (one channel per browser tab, only real
 * status changes are broadcast). Components call useUserPresence(id, serverValue).
 */
export type LivePresence = { status: Presence; lastSeenAt: string | null };

type Entry = LivePresence & { at: number };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const tracked = new Set<string>();
const pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let channel: RealtimeChannel | null = null;
let subscribedOnce = false;
let mine: { id: string; status: Presence } | null = null;

const emit = () => listeners.forEach((l) => l());

function put(id: string, status: Presence, lastSeenAt: string | null) {
  const prev = entries.get(id);
  if (prev && prev.status === status && prev.lastSeenAt === lastSeenAt) {
    prev.at = Date.now();
    return;
  }
  entries.set(id, { status, lastSeenAt, at: Date.now() });
  emit();
}

async function flush() {
  flushTimer = null;
  const ids = Array.from(pending);
  pending.clear();
  const supabase = createClient();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data } = await supabase.from("UserPresence").select("userId, status, lastSeenAt").in("userId", chunk);
    const seen = new Set<string>();
    (data ?? []).forEach((r) => {
      seen.add(r.userId);
      put(r.userId, presenceOf(r.status), r.lastSeenAt);
    });
    chunk.filter((id) => !seen.has(id)).forEach((id) => put(id, "offline", entries.get(id)?.lastSeenAt ?? null));
  }
}

function request(ids: string[], force = false) {
  ids.forEach((id) => {
    const e = entries.get(id);
    if (force || !e || Date.now() - e.at > 60_000) pending.add(id);
  });
  if (pending.size && !flushTimer) flushTimer = setTimeout(flush, 40);
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  const supabase = createClient();
  channel = supabase
    .channel("user-presence")
    .on("postgres_changes", { event: "*", schema: "public", table: "UserPresence" }, (payload) => {
      const row = (payload.new ?? {}) as { userId?: string; status?: string; lastSeenAt?: string | null };
      if (row.userId) put(row.userId, presenceOf(row.status), row.lastSeenAt ?? null);
    })
    .subscribe((state) => {
      // After a reconnection, anything missed while disconnected is fetched once.
      if (state === "SUBSCRIBED") {
        if (subscribedOnce) request(Array.from(tracked), true);
        subscribedOnce = true;
      }
    });
  window.addEventListener("online", () => request(Array.from(tracked), true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") request(Array.from(tracked));
  });
}

/** Seeds a value rendered by the server, without overriding a fresher live one. */
function seed(id: string, status: string | null | undefined, lastSeenAt: string | null | undefined) {
  if (typeof window === "undefined") return; // the server keeps no shared state between requests
  if (!entries.has(id)) entries.set(id, { status: presenceOf(status), lastSeenAt: lastSeenAt ?? null, at: 0 });
}

/** The heartbeat reports the signed-in member's own real status (even in "Aparecer offline"). */
export function setSelfPresence(id: string, status: string) {
  const next = presenceOf(status);
  if (mine?.id === id && mine.status === next) return;
  mine = { id, status: next };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const OFFLINE: LivePresence = { status: "offline", lastSeenAt: null };

export function useUserPresence(userId: string | null | undefined, initial?: string | null, initialLastSeen?: string | null): LivePresence {
  if (userId) seed(userId, initial, initialLastSeen);
  useEffect(() => {
    if (!userId) return;
    ensureChannel();
    tracked.add(userId);
    request([userId]);
  }, [userId]);
  const entry = useSyncExternalStore(
    subscribe,
    () => (userId ? entries.get(userId) : undefined),
    () => undefined
  );
  const isSelf = useSyncExternalStore(
    subscribe,
    () => (userId && mine?.id === userId ? mine.status : null),
    () => null
  );
  if (!userId) return OFFLINE;
  if (isSelf) return { status: isSelf, lastSeenAt: entry?.lastSeenAt ?? null };
  return entry ? { status: entry.status, lastSeenAt: entry.lastSeenAt } : { status: presenceOf(initial), lastSeenAt: initialLastSeen ?? null };
}

/** How many of these people are online right now (group chats). */
export function useOnlineCount(ids: string[]) {
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) return;
    ensureChannel();
    ids.forEach((id) => tracked.add(id));
    request(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useSyncExternalStore(
    subscribe,
    () => ids.filter((id) => (mine?.id === id ? mine.status : entries.get(id)?.status) === "online").length,
    () => 0
  );
}
