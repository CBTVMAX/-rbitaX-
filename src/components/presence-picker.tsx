"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE, presenceOf, type Presence } from "@/lib/presence";

const ORDER: Presence[] = ["online", "away", "busy", "offline"];

function usePresence(userId: string, initial: string | null | undefined) {
  const router = useRouter();
  const [presence, setPresence] = useState<Presence>(presenceOf(initial));

  useEffect(() => {
    setPresence(presenceOf(initial));
  }, [initial]);

  async function choose(next: Presence) {
    if (next === presence) return;
    const previous = presence;
    setPresence(next);
    const supabase = createClient();
    const { error } = await supabase.from("User").update({ presence: next }).eq("id", userId);
    if (error) {
      setPresence(previous);
      return;
    }
    router.refresh();
  }

  return { presence, choose };
}

export function PresenceDot({ value, className }: { value: string | null | undefined; className?: string }) {
  return <span className={clsx("rounded-full", PRESENCE[presenceOf(value)].dot, className)} />;
}

/** Status label that opens a dropdown to change it (or read-only for other people's profiles). */
export function PresenceStatus({
  userId,
  initial,
  editable,
  className,
}: {
  userId: string;
  initial: string | null | undefined;
  editable: boolean;
  className?: string;
}) {
  const { presence, choose } = usePresence(userId, initial);
  const [open, setOpen] = useState(false);
  const current = PRESENCE[presence];

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
          <PresenceOptions
            presence={presence}
            onChoose={(p) => {
              setOpen(false);
              choose(p);
            }}
          />
        </div>
      )}
    </div>
  );
}

function PresenceOptions({ presence, onChoose }: { presence: Presence; onChoose: (p: Presence) => void }) {
  return (
    <>
      {ORDER.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChoose(key)}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5"
        >
          <span className={clsx("h-2.5 w-2.5 rounded-full", PRESENCE[key].dot)} />
          <span className="flex-1">{key === "offline" ? "Definir como offline" : PRESENCE[key].label}</span>
          {presence === key && <Check className="h-4 w-4 text-orbit-cyan" />}
        </button>
      ))}
    </>
  );
}

/** Always-visible list of the four statuses, for menus (mobile menu, account menu). */
export function PresenceList({ userId, initial }: { userId: string; initial: string | null | undefined }) {
  const { presence, choose } = usePresence(userId, initial);
  return (
    <div>
      <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Status</p>
      <PresenceOptions presence={presence} onChoose={choose} />
    </div>
  );
}
