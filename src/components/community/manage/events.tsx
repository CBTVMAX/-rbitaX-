"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Ban, CalendarDays, ExternalLink, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { communityError } from "@/lib/communities";
import { useCommunity } from "../context";
import { useTimeZone } from "@/lib/use-tz";
import { EVENT_COLUMNS, EventForm, eventEnded, eventWhen, type CommunityEvent } from "../events";
import { Confirm, EmptyState } from "../ui";
import { Card } from "./fields";

/** Every event of the community (upcoming and past) with quick edit, cancel and delete. */
export function EventsSection() {
  const { supabase, community, toast } = useCommunity();
  const tz = useTimeZone();
  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [form, setForm] = useState<{ event: CommunityEvent | null } | null>(null);
  const [confirm, setConfirm] = useState<{ e: CommunityEvent; action: "cancel" | "delete" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("CommunityEvent").select(EVENT_COLUMNS).eq("communityId", community.id).order("startsAt", { ascending: false }).limit(200);
    setEvents((data ?? []) as CommunityEvent[]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(e: CommunityEvent, a: "cancel" | "restore" | "delete") {
    setBusy(e.id);
    const { error } = await supabase.rpc("community_event_action", { p_event: e.id, p_action: a });
    setBusy(null);
    setConfirm(null);
    if (error) return toast(communityError(error.message), true);
    toast(a === "delete" ? "Evento excluído." : a === "cancel" ? "Evento cancelado e participantes avisados." : "Evento reativado.");
    load();
  }

  const upcoming = (events ?? []).filter((e) => !eventEnded(e) && e.status === "scheduled").reverse();
  const others = (events ?? []).filter((e) => eventEnded(e) || e.status === "cancelled");

  const row = (e: CommunityEvent) => (
    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
      <span className={clsx("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10", e.status === "cancelled" && "opacity-50")}>
        <span className="font-display text-base font-bold leading-none text-white">{new Date(e.startsAt).toLocaleDateString("pt-BR", { day: "numeric", timeZone: tz })}</span>
        <span className="text-[9px] font-bold uppercase text-orbit-cyan">{new Date(e.startsAt).toLocaleDateString("pt-BR", { month: "short", timeZone: tz }).replace(".", "")}</span>
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/comunidades/${community.slug}/eventos/${e.id}`} className="flex items-center gap-1 truncate text-sm font-semibold text-white hover:underline">
          <span className="truncate">{e.title}</span> <ExternalLink className="h-3 w-3 shrink-0 text-white/40" />
        </Link>
        <p className="truncate text-xs text-white/45">
          {e.status === "cancelled" ? "Cancelado · " : eventEnded(e) ? "Encerrado · " : ""}
          {eventWhen(e, tz)} · {e.goingCount} vão
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {busy === e.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/50" />
        ) : (
          <>
            <button type="button" onClick={() => setForm({ event: e })} aria-label={`Editar ${e.title}`} className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white">
              <Pencil className="h-4 w-4" />
            </button>
            {e.status === "scheduled" ? (
              !eventEnded(e) && (
                <button type="button" onClick={() => setConfirm({ e, action: "cancel" })} aria-label={`Cancelar ${e.title}`} className="flex h-10 w-10 items-center justify-center rounded-full text-amber-300/80 hover:bg-white/5">
                  <Ban className="h-4 w-4" />
                </button>
              )
            ) : (
              <button type="button" onClick={() => act(e, "restore")} aria-label={`Reativar ${e.title}`} className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setConfirm({ e, action: "delete" })} aria-label={`Excluir ${e.title}`} className="flex h-10 w-10 items-center justify-center rounded-full text-red-300/80 hover:bg-white/5">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card
        title="Eventos"
        desc="Membros com notificações ativas são avisados de cada novo evento; quem confirmar presença recebe lembrete 1 hora antes. Quem cria eventos é definido em Permissões."
        right={
          <button type="button" onClick={() => setForm({ event: null })} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> Novo evento
          </button>
        }
      >
        <p className="text-xs text-white/45">
          {upcoming.length} {upcoming.length === 1 ? "evento marcado" : "eventos marcados"} · {others.length} encerrados ou cancelados
        </p>
      </Card>
      {events === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nenhum evento ainda" text="Crie lives, encontros, torneios ou lançamentos com lista de presença." />
      ) : (
        <>
          {upcoming.length > 0 && <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">{upcoming.map(row)}</div>}
          {others.length > 0 && (
            <>
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Anteriores e cancelados</p>
              <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">{others.map(row)}</div>
            </>
          )}
        </>
      )}
      <EventForm open={!!form} event={form?.event ?? null} onClose={() => setForm(null)} onSaved={() => load()} />
      <Confirm
        open={!!confirm}
        busy={!!busy}
        title={confirm?.action === "delete" ? `Excluir “${confirm?.e.title}”?` : `Cancelar “${confirm?.e.title}”?`}
        message={confirm?.action === "delete" ? "O evento e a lista de presença serão apagados." : "Quem confirmou presença ou tem interesse recebe um aviso."}
        confirmLabel={confirm?.action === "delete" ? "Excluir" : "Cancelar evento"}
        onConfirm={() => confirm && act(confirm.e, confirm.action)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
