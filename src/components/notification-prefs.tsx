"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, CircleCheck, Loader2, ShieldCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import {
  COMMUNITY_LEVEL_LABEL,
  LEVEL_LABEL,
  NOTIFY_GROUPS,
  type CommunityNotify,
  type NotificationPrefsState,
  type NotifyKey,
  type NotifyLevel,
} from "@/lib/notification-prefs";

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">{title}</h2>
      {hint && <p className="-mt-1 mb-2 px-1 text-xs text-white/45">{hint}</p>}
      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">{children}</div>
    </section>
  );
}

function Options<T extends string>({ value, options, label, busy, onPick }: { value: T; options: T[]; label: (v: T) => string; busy: boolean; onPick: (v: T) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          disabled={busy}
          onClick={() => onPick(o)}
          aria-pressed={value === o}
          className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-sm text-white transition last:border-b-0 hover:bg-white/5 disabled:opacity-60"
        >
          <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", value === o ? "border-transparent bg-orbit-gradient" : "border-white/25")}>
            {value === o && <span className="h-2 w-2 rounded-full bg-snow" />}
          </span>
          <span className="flex-1">{label(o)}</span>
          {busy && value === o && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
        </button>
      ))}
    </div>
  );
}

export function NotificationPrefs({ initial }: { initial: NotificationPrefsState }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState(initial);
  const [editing, setEditing] = useState<{ key: NotifyKey; label: string; levels: NotifyLevel[] } | null>(null);
  const [community, setCommunity] = useState<CommunityNotify | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function done() {
    setError(null);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }

  async function pick(level: NotifyLevel) {
    if (!editing) return;
    setBusy(true);
    const { data, error: err } = await supabase.rpc("set_notification_pref", { p_key: editing.key, p_level: level });
    setBusy(false);
    if (err || !data) return setError("Não foi possível salvar agora. Tente de novo.");
    setState(data as unknown as NotificationPrefsState);
    setEditing(null);
    done();
  }

  async function pickCommunity(level: CommunityNotify["level"]) {
    if (!community) return;
    setBusy(true);
    const { error: err } = await supabase.rpc("community_set_notify_level", { p_community: community.id, p_level: level });
    setBusy(false);
    if (err) return setError("Não foi possível salvar agora. Tente de novo.");
    setState((s) => ({ ...s, communities: s.communities.map((c) => (c.id === community.id ? { ...c, level } : c)) }));
    setCommunity(null);
    done();
  }

  return (
    <div className="space-y-6">
      <div className="pointer-events-none sticky top-16 z-20 -mb-4 flex h-0 justify-end md:top-20">
        <span
          aria-live="polite"
          className={clsx(
            "flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-space-surface/95 px-3 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur transition-opacity duration-300",
            saved ? "opacity-100" : "opacity-0"
          )}
        >
          <CircleCheck className="h-4 w-4" /> Alterações salvas
        </span>
      </div>
      {error && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{error}</p>}

      {NOTIFY_GROUPS.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.items.map((it) => {
            const level = state.prefs[it.key] ?? "all";
            return (
              <button key={it.key} type="button" onClick={() => setEditing(it)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white">{it.label}</span>
                  {it.hint && <span className="mt-0.5 block text-xs text-white/45">{it.hint}</span>}
                </span>
                <span className={clsx("shrink-0 text-sm font-medium", level === "off" ? "text-white/40" : "text-orbit-cyan")}>
                  {it.levels.length === 2 && level === "all" ? "Ativado" : LEVEL_LABEL[level]}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </button>
            );
          })}
        </Group>
      ))}

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-surface/80 px-4 py-3.5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white">Segurança da conta</span>
          <span className="mt-0.5 block text-xs text-white/45">Entradas novas, troca de senha e verificação. Sempre ativadas, para sua proteção.</span>
        </span>
      </div>

      <Group title="Por comunidade" hint="Escolha de quais comunidades você quer receber avisos de novas publicações.">
        {state.communities.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4 text-sm text-white/50">
            <UsersRound className="h-5 w-5" /> Você ainda não participa de comunidades.{" "}
            <Link href="/comunidades" className="font-medium text-pa hover:underline">
              Explorar
            </Link>
          </div>
        ) : (
          state.communities.map((c) => (
            <button key={c.id} type="button" onClick={() => setCommunity(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-space-card text-white/60">
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <UsersRound className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">{c.name}</span>
              <span className={clsx("shrink-0 text-sm font-medium", c.level === "off" ? "text-white/40" : "text-orbit-cyan")}>{COMMUNITY_LEVEL_LABEL[c.level]}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
            </button>
          ))
        )}
      </Group>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.label}>
        {editing && (
          <div className="space-y-2 pb-1">
            <Options
              value={state.prefs[editing.key] ?? "all"}
              options={editing.levels}
              busy={busy}
              label={(v) => (editing.levels.length === 2 && v === "all" ? "Ativado" : LEVEL_LABEL[v])}
              onPick={pick}
            />
            {editing.levels.includes("friends") && <p className="px-1 text-xs text-white/45">“Apenas amigos”: você só é avisado quando quem fez a ação é seu amigo.</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!community} onClose={() => setCommunity(null)} title={community?.name}>
        {community && (
          <Options value={community.level} options={["all", "announcements", "off"] as CommunityNotify["level"][]} busy={busy} label={(v) => COMMUNITY_LEVEL_LABEL[v]} onPick={pickCommunity} />
        )}
      </Sheet>
    </div>
  );
}
