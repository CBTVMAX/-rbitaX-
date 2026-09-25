export const PRESENCE = {
  online: { label: "Online", dot: "bg-emerald-400", text: "text-emerald-400" },
  away: { label: "Ausente", dot: "bg-amber-400", text: "text-amber-400" },
  busy: { label: "Ocupado", dot: "bg-red-500", text: "text-red-400" },
  offline: { label: "Offline", dot: "bg-white/30", text: "text-white/50" },
} as const;

export type Presence = keyof typeof PRESENCE;

export function presenceOf(value: string | null | undefined): Presence {
  return value && value in PRESENCE ? (value as Presence) : "online";
}
