"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE, lastSeenLabel, presenceOf } from "@/lib/presence";
import { useUserPresence } from "@/lib/presence-live";

/**
 * Status indicators. The value always comes from the server-computed presence (live through
 * Realtime); `value` is only the server-rendered starting point. Nobody picks "Online" by hand.
 */
export function PresenceDot({ value, userId, className }: { value: string | null | undefined; userId?: string | null; className?: string }) {
  const live = useUserPresence(userId, value);
  const status = userId ? live.status : presenceOf(value);
  return <span className={clsx("rounded-full", PRESENCE[status].dot, className)} title={PRESENCE[status].label} />;
}

/** "🟢 Online" / "🟡 Ausente" / "⚫ Offline" label (profile header, Messenger header). */
export function PresenceStatus({
  userId,
  initial,
  className,
}: {
  userId: string;
  initial: string | null | undefined;
  /** Kept for existing callers; the status is no longer chosen by hand. */
  editable?: boolean;
  className?: string;
}) {
  const { status } = useUserPresence(userId, initial);
  const current = PRESENCE[status];
  return (
    <p className={clsx("flex items-center gap-2 text-sm", className)}>
      <span className={clsx("h-2.5 w-2.5 rounded-full", current.dot)} />
      <span className={current.text}>{current.label}</span>
    </p>
  );
}

/** Online / Ausente, or "Visto por último hoje às 00:42" when offline and the person shares it. */
export function usePresenceText(userId: string | null | undefined, initial?: string | null, initialLastSeen?: string | null) {
  const live = useUserPresence(userId, initial, initialLastSeen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = PRESENCE[live.status];
  // Times are shown in the viewer's timezone, so they are only rendered in the browser.
  const text = live.status === "offline" && mounted ? lastSeenLabel(live.lastSeenAt) ?? current.label : current.label;
  return { status: live.status, text, dot: current.dot, color: current.text };
}

/**
 * Menu section (account menu, mobile menu): the member's real status and the privacy choice
 * "Aparecer offline", which hides the status and "visto por último" from everyone.
 */
export function PresenceList({ userId, initial, showPresence = true }: { userId: string; initial: string | null | undefined; showPresence?: boolean }) {
  const { status } = useUserPresence(userId, initial);
  const [visible, setVisible] = useState(showPresence);
  const [busy, setBusy] = useState(false);
  useEffect(() => setVisible(showPresence), [showPresence]);

  async function choose(next: boolean) {
    if (next === visible || busy) return;
    setBusy(true);
    setVisible(next);
    const { error } = await createClient().rpc("presence_set_visibility", { p_show: next });
    if (error) setVisible(!next);
    setBusy(false);
  }

  const options: { value: boolean; label: string; dot: string }[] = [
    { value: true, label: "Mostrar meu status", dot: PRESENCE[status].dot },
    { value: false, label: "Aparecer offline", dot: PRESENCE.offline.dot },
  ];

  return (
    <div>
      <p className="flex items-center gap-2 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
        Status
        <span className={clsx("ml-auto flex items-center gap-1.5 normal-case tracking-normal", PRESENCE[status].text)}>
          <span className={clsx("h-2 w-2 rounded-full", PRESENCE[status].dot)} /> {PRESENCE[status].label}
        </span>
      </p>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => choose(o.value)}
          disabled={busy}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5"
        >
          <span className={clsx("h-2.5 w-2.5 rounded-full", o.dot)} />
          <span className="flex-1">{o.label}</span>
          {visible === o.value && <Check className="h-4 w-4 text-orbit-cyan" />}
        </button>
      ))}
    </div>
  );
}

/** The profile photo's green dot: shown only while the person is really online. */
export function OnlineDot({ userId, initial, className }: { userId: string; initial: string | null | undefined; className?: string }) {
  const { status } = useUserPresence(userId, initial);
  return status === "online" ? <span className={className} /> : null;
}
