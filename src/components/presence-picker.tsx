"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE, lastSeenLabel, presenceOf, type Presence } from "@/lib/presence";
import { setSelfPresence, useUserPresence } from "@/lib/presence-live";

/**
 * Status indicators. What others see always comes from the server (live through Realtime):
 * the member picks a mode, but only a real open session makes them Online/Ausente/Ocupado.
 */

// ── The member's own mode (private: read and changed only through presence_my_mode / presence_set_mode) ──
type Mode = "auto" | "away" | "busy" | "invisible";
const MODE_OF: Record<Presence, Mode> = { online: "auto", away: "away", busy: "busy", offline: "invisible" };
const PRESENCE_OF: Record<Mode, Presence> = { auto: "online", away: "away", busy: "busy", invisible: "offline" };
const ORDER: Presence[] = ["online", "away", "busy", "offline"];

let myMode: Mode | null = null;
let loading: Promise<void> | null = null;
const modeListeners = new Set<() => void>();
const emitMode = () => modeListeners.forEach((l) => l());

function loadMode() {
  if (!loading)
    loading = Promise.resolve(createClient().rpc("presence_my_mode")).then(({ data }) => {
      const m = (data as { mode?: string } | null)?.mode;
      if (m === "auto" || m === "away" || m === "busy" || m === "invisible") {
        myMode = m;
        emitMode();
      }
    }, () => {
      loading = null;
    });
  return loading;
}

function useMyMode(userId: string) {
  useEffect(() => {
    loadMode();
  }, []);
  const mode = useSyncExternalStore(
    (cb) => (modeListeners.add(cb), () => modeListeners.delete(cb)),
    () => myMode,
    () => null
  );

  async function choose(next: Presence) {
    const wanted = MODE_OF[next];
    if (wanted === myMode) return;
    const previous = myMode;
    myMode = wanted;
    emitMode();
    const { data, error } = await createClient().rpc("presence_set_mode", { p_mode: wanted });
    if (error) {
      myMode = previous;
      emitMode();
      return;
    }
    const pub = (data as { public?: string } | null)?.public;
    if (pub) setSelfPresence(userId, pub);
  }

  return { selected: mode ? PRESENCE_OF[mode] : null, choose };
}

export function PresenceDot({ value, userId, className }: { value: string | null | undefined; userId?: string | null; className?: string }) {
  const live = useUserPresence(userId, value);
  const status = userId ? live.status : presenceOf(value);
  return <span className={clsx("rounded-full", PRESENCE[status].dot, className)} title={PRESENCE[status].label} />;
}

/** Status label; on the member's own profile it opens the menu to change it. */
export function PresenceStatus({
  userId,
  initial,
  editable = false,
  className,
}: {
  userId: string;
  initial: string | null | undefined;
  editable?: boolean;
  className?: string;
}) {
  const { status } = useUserPresence(userId, initial);
  const [open, setOpen] = useState(false);
  const current = PRESENCE[status];

  const label = (
    <>
      <span className={clsx("h-2.5 w-2.5 rounded-full", current.dot)} />
      <span className={current.text}>{current.label}</span>
    </>
  );

  if (!editable) return <p className={clsx("flex items-center gap-2 text-sm", className)}>{label}</p>;

  return (
    <div className={clsx("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Alterar status"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg text-sm transition hover:opacity-80"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-white/40" />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 w-52 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
          <PresenceOptions userId={userId} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function PresenceOptions({ userId, onDone }: { userId: string; onDone?: () => void }) {
  const { selected, choose } = useMyMode(userId);
  return (
    <>
      {ORDER.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            onDone?.();
            choose(key);
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5"
        >
          <span className={clsx("h-2.5 w-2.5 rounded-full", PRESENCE[key].dot)} />
          <span className="flex-1">{key === "offline" ? "Definir como offline" : PRESENCE[key].label}</span>
          {selected === key && <Check className="h-4 w-4 text-orbit-cyan" />}
        </button>
      ))}
    </>
  );
}

/** Always-visible list of the four statuses, for menus (mobile menu, account menu). */
export function PresenceList({ userId }: { userId: string; initial?: string | null }) {
  return (
    <div>
      <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Status</p>
      <PresenceOptions userId={userId} />
    </div>
  );
}

/** Online / Ausente / Ocupado, or "Visto por último hoje às 00:42" when offline and the person shares it. */
export function usePresenceText(userId: string | null | undefined, initial?: string | null, initialLastSeen?: string | null) {
  const live = useUserPresence(userId, initial, initialLastSeen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = PRESENCE[live.status];
  // Times are shown in the viewer's timezone, so they are only rendered in the browser.
  const text = live.status === "offline" && mounted ? lastSeenLabel(live.lastSeenAt) ?? current.label : current.label;
  return { status: live.status, text, dot: current.dot, color: current.text };
}

/** The profile photo's green dot: shown only while the person is really online. */
export function OnlineDot({ userId, initial, className }: { userId: string; initial: string | null | undefined; className?: string }) {
  const { status } = useUserPresence(userId, initial);
  return status === "online" ? <span className={className} /> : null;
}
