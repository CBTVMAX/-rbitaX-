/**
 * Presence is computed by the database from each open tab's heartbeat
 * (see /api/presence/heartbeat and the presence_* functions):
 *   online  — a tab is visible and was used in the last 5 minutes
 *   away    — a tab is open but hidden, unfocused or idle (or the member chose "Ausente")
 *   busy    — the member chose "Ocupado" and has a live session
 *   offline — no heartbeat for ~90 seconds (closed, logged out, no internet, device off)
 */
export const PRESENCE = {
  online: { label: "Online", dot: "bg-emerald-400", text: "text-emerald-400" },
  away: { label: "Ausente", dot: "bg-amber-400", text: "text-amber-400" },
  busy: { label: "Ocupado", dot: "bg-red-500", text: "text-red-400" },
  offline: { label: "Offline", dot: "bg-white/30", text: "text-white/50" },
} as const;

export type Presence = keyof typeof PRESENCE;

/** Anything unknown (old manual values, missing data) is Offline — never assume someone is online. */
export function presenceOf(value: string | null | undefined): Presence {
  return value === "online" || value === "away" || value === "busy" ? value : "offline";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "Visto por último hoje às 00:42" / "ontem às 21:10" / "em 12/09 às 08:05" / "em 12/09/2025". */
export function lastSeenLabel(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  if (d.getTime() >= startOfToday) return `Visto por último hoje às ${time}`;
  if (d.getTime() >= startOfToday - day) return `Visto por último ontem às ${time}`;
  if (d.getFullYear() === now.getFullYear()) return `Visto por último em ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${time}`;
  return `Visto por último em ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
