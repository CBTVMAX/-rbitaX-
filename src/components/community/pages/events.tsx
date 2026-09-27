"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Ban,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/post-card";
import { useTimeZone } from "@/lib/use-tz";
import { can, communityError, isEditorOrAdmin, rank } from "@/lib/communities";
import { useCommunity } from "../context";
import { CalendarButton, DateBadge, EventCard, EventForm, eventEnded, eventLive, eventWhen, type CommunityEvent } from "../events";
import { RichText } from "../rich-text";
import { MutedNotice, SubpageFrame } from "../subpage";
import { Confirm, EmptyState, Sheet } from "../ui";

type Tab = "proximos" | "anteriores" | "meus";

export function EventsView({ canSee, events, rsvps }: { canSee: boolean; events: CommunityEvent[]; rsvps: Record<string, "going" | "interested"> }) {
  const { community, viewer, role, membership } = useCommunity();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("proximos");
  const [creating, setCreating] = useState(false);
  const canCreate = !!viewer && can(community, role, "event") && !membership?.muted;

  const upcoming = useMemo(() => events.filter((e) => e.status === "scheduled" && !eventEnded(e)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [events]);
  const past = useMemo(() => events.filter((e) => e.status === "cancelled" || eventEnded(e)).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)), [events]);
  const mine = useMemo(() => events.filter((e) => rsvps[e.id]).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [events, rsvps]);
  const list = tab === "proximos" ? upcoming : tab === "anteriores" ? past : mine;

  return (
    <SubpageFrame
      title="Eventos"
      icon="📅"
      wide
      canSee={canSee}
      action={
        canCreate && canSee ? (
          <button type="button" onClick={() => setCreating(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo evento</span>
            <span className="sm:hidden">Criar</span>
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <MutedNotice />
        <div className="flex gap-1 rounded-2xl border border-white/[0.08] bg-space-card/60 p-1">
          {(
            [
              ["proximos", "Próximos", upcoming.length],
              ["anteriores", "Anteriores", past.length],
              ["meus", "Meus eventos", mine.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx("flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition", tab === id ? "bg-orbit-gradient text-snow" : "text-white/60 hover:text-white")}
            >
              {label} {n > 0 && <span className="text-[11px] opacity-70">{n}</span>}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title={tab === "proximos" ? "Nenhum evento marcado" : tab === "anteriores" ? "Nenhum evento anterior" : "Você ainda não confirmou presença"}
            text={tab === "proximos" ? "Lives, encontros, torneios e lançamentos aparecem aqui com data, local e lista de presença." : undefined}
            action={
              canCreate && tab === "proximos" ? (
                <button type="button" onClick={() => setCreating(true)} className="rounded-full bg-orbit-gradient px-5 py-2.5 text-xs font-semibold text-snow">
                  Criar evento
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <EventCard key={e.id} e={e} slug={community.slug} rsvp={rsvps[e.id] ?? null} />
            ))}
          </div>
        )}
      </div>
      <EventForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/comunidades/${community.slug}/eventos/${id}`)} />
    </SubpageFrame>
  );
}

type Person = { status: "going" | "interested"; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null } };

export function EventDetailView({
  event: initial,
  people: initialPeople,
  mine: initialMine,
  organizer,
}: {
  event: CommunityEvent;
  people: Person[];
  mine: "going" | "interested" | null;
  organizer: { name: string; username: string; avatarUrl: string | null } | null;
}) {
  const { supabase, community, viewer, role, toast } = useCommunity();
  const router = useRouter();
  const tz = useTimeZone();
  const [e, setE] = useState(initial);
  useEffect(() => setE(initial), [initial]);
  const [mine, setMine] = useState(initialMine);
  const [people, setPeople] = useState(initialPeople);
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const member = rank(role) >= 1;
  const manager = !!viewer && (e.createdById === viewer.id || isEditorOrAdmin(role));
  const ended = eventEnded(e);
  const live = eventLive(e);
  const full = !!e.maxParticipants && e.goingCount >= e.maxParticipants && mine !== "going";
  const going = people.filter((p) => p.status === "going");
  const interested = people.filter((p) => p.status === "interested");
  const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";

  async function rsvp(status: "going" | "interested" | null) {
    if (!viewer) return router.push("/entrar");
    setBusy(status ?? "none");
    const { data, error } = await supabase.rpc("community_event_rsvp", { p_event: e.id, p_status: status });
    setBusy(null);
    if (error) return toast(/not_member/.test(error.message) ? "Participe da comunidade para confirmar presença." : communityError(error.message), true);
    const r = data as { going: number; interested: number; status: string | null };
    setMine(status);
    setE((x) => ({ ...x, goingCount: r.going, interestedCount: r.interested }));
    setPeople((l) => {
      const rest = l.filter((p) => p.user.id !== viewer.id);
      return status ? [{ status, createdAt: new Date().toISOString(), user: { id: viewer.id, name: viewer.name, username: viewer.username, avatarUrl: viewer.avatarUrl } }, ...rest] : rest;
    });
    toast(status === "going" ? "Presença confirmada! Você recebe um lembrete 1 hora antes." : status === "interested" ? "Marcado como interessado." : "Resposta removida.");
  }

  async function action(a: "cancel" | "restore" | "delete") {
    setBusy(a);
    const { error } = await supabase.rpc("community_event_action", { p_event: e.id, p_action: a });
    setBusy(null);
    setConfirm(null);
    setMenu(false);
    if (error) return toast(communityError(error.message), true);
    if (a === "delete") {
      toast("Evento excluído.");
      return router.push(`/comunidades/${community.slug}/eventos`);
    }
    setE((x) => ({ ...x, status: a === "cancel" ? "cancelled" : "scheduled" }));
    toast(a === "cancel" ? "Evento cancelado. Quem confirmou presença foi avisado." : "Evento reativado.");
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: e.title, text: eventWhen(e, tz), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link do evento copiado.");
      }
    } catch {
      /* closed */
    }
  }

  const status =
    e.status === "cancelled" ? (
      <span className="rounded-full bg-red-500/85 px-3 py-1 text-xs font-bold text-snow">Cancelado</span>
    ) : live ? (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-snow">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Acontecendo agora
      </span>
    ) : ended ? (
      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white/80">Encerrado</span>
    ) : null;

  const rsvpButtons =
    e.status === "cancelled" || ended ? null : !viewer ? (
      <Link href="/entrar" className="flex h-12 items-center justify-center rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow">
        Entre para confirmar presença
      </Link>
    ) : !member ? (
      <Link href={`/comunidades/${community.slug}`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow">
        <UserPlus className="h-4 w-4" /> Participe da comunidade para ir
      </Link>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => rsvp(mine === "going" ? null : "going")}
          disabled={!!busy || full}
          className={clsx(
            "flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition disabled:opacity-60",
            mine === "going" ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "bg-orbit-gradient text-snow shadow-glow"
          )}
        >
          {busy === "going" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {mine === "going" ? "Você vai" : full ? "Esgotado" : "Vou"}
        </button>
        <button
          type="button"
          onClick={() => rsvp(mine === "interested" ? null : "interested")}
          disabled={!!busy}
          className={clsx(
            "flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition disabled:opacity-60",
            mine === "interested" ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/15 text-white/85 hover:bg-white/5"
          )}
        >
          {busy === "interested" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className={clsx("h-4 w-4", mine === "interested" && "fill-current")} />} Tenho interesse
        </button>
      </div>
    );

  return (
    <SubpageFrame
      title="Evento"
      icon="📅"
      action={
        <div className="flex gap-1.5">
          <button type="button" onClick={share} aria-label="Compartilhar evento" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/80 hover:bg-white/5">
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          {manager && (
            <button type="button" onClick={() => setMenu(true)} aria-label="Gerenciar evento" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/80 hover:bg-white/5">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        </div>
      }
    >
      <article className="overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80">
        <div className="relative h-44 bg-[linear-gradient(135deg,rgb(var(--app-accent,139_92_246)/0.55),#0b0d1a_80%)] sm:h-60">
          {e.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-space-card via-space-card/10 to-transparent" />
          <div className="absolute right-3 top-3">{status}</div>
          <DateBadge iso={e.startsAt} className="absolute bottom-3 left-4 h-16 w-16" />
        </div>
        <div className="space-y-4 p-4 md:p-6">
          <h2 className="break-words font-display text-2xl font-bold leading-tight text-white">{e.title}</h2>
          <ul className="space-y-2 text-sm text-white/75">
            <li className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-orbit-cyan" /> {eventWhen(e, tz)}
            </li>
            {(e.location || e.locationUrl) && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orbit-pink" />
                <span className="min-w-0">
                  {e.location || "Local"}
                  {e.locationUrl && (
                    <a href={e.locationUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="ml-2 inline-flex items-center gap-1 font-semibold text-orbit-cyan">
                      Abrir <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </li>
            )}
            <li className="flex items-start gap-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-orbit-purple" />
              {e.goingCount} {e.goingCount === 1 ? "pessoa vai" : "pessoas vão"}
              {e.interestedCount > 0 && ` · ${e.interestedCount} interessada${e.interestedCount === 1 ? "" : "s"}`}
              {e.maxParticipants && ` · ${Math.max(0, e.maxParticipants - e.goingCount)} de ${e.maxParticipants} vagas`}
            </li>
          </ul>
          <MutedNotice />
          {rsvpButtons}
          {!ended && e.status !== "cancelled" && <CalendarButton e={e} className="h-11 w-full" />}
          {e.description && <RichText text={e.description} className="whitespace-pre-wrap break-words border-t border-white/[0.06] pt-4 text-[15px] leading-relaxed text-white/85" />}
          {organizer && (
            <Link href={`/perfil/${organizer.username}`} className="flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
              <Avatar name={organizer.name} url={organizer.avatarUrl} size={36} />
              <span className="text-sm text-white/70">
                Organizado por <strong className="font-semibold text-white">{organizer.name}</strong>
              </span>
            </Link>
          )}
        </div>
      </article>

      <section className="mt-4 rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
        <h3 className="text-sm font-semibold text-white">Participantes · {e.goingCount}</h3>
        {going.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">Ninguém confirmou ainda.</p>
        ) : (
          <div className="mt-3 space-y-1">
            {(showAll ? going : going.slice(0, 8)).map((p) => (
              <Link key={p.user.id} href={`/perfil/${p.user.username}`} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-1 hover:bg-white/[0.03]">
                <Avatar name={p.user.name} url={p.user.avatarUrl} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{p.user.name}</span>
                {p.user.id === e.createdById && <span className="rounded-full bg-orbit-purple/15 px-2 py-0.5 text-[10px] font-semibold text-orbit-purple">Organizador</span>}
              </Link>
            ))}
            {going.length > 8 && !showAll && (
              <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-2xl py-2 text-xs font-semibold text-orbit-cyan">
                Ver todos os {going.length}
              </button>
            )}
          </div>
        )}
        {interested.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-white">Interessados · {interested.length}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interested.slice(0, 30).map((p) => (
                <Link key={p.user.id} href={`/perfil/${p.user.username}`} title={p.user.name}>
                  <Avatar name={p.user.name} url={p.user.avatarUrl} size={34} />
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Gerenciar evento">
        <div className="space-y-1 pt-1">
          <button type="button" onClick={() => (setMenu(false), setEditing(true))} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-white hover:bg-white/[0.05]">
            <Pencil className="h-5 w-5" /> Editar evento
          </button>
          {e.status === "scheduled" ? (
            <button type="button" onClick={() => (setMenu(false), setConfirm("cancel"))} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-amber-300 hover:bg-white/[0.05]">
              <Ban className="h-5 w-5" /> Cancelar evento
            </button>
          ) : (
            <button type="button" onClick={() => action("restore")} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-white hover:bg-white/[0.05]">
              <RotateCcw className="h-5 w-5" /> Reativar evento
            </button>
          )}
          <button type="button" onClick={() => (setMenu(false), setConfirm("delete"))} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-red-300 hover:bg-white/[0.05]">
            <Trash2 className="h-5 w-5" /> Excluir evento
          </button>
        </div>
      </Sheet>
      <EventForm open={editing} event={e} onClose={() => setEditing(false)} onSaved={() => router.refresh()} />
      <Confirm
        open={!!confirm}
        busy={!!busy}
        title={confirm === "delete" ? "Excluir este evento?" : "Cancelar este evento?"}
        message={confirm === "delete" ? "O evento e a lista de presença serão apagados. Não dá para desfazer." : "Quem confirmou presença ou demonstrou interesse recebe um aviso. Você pode reativar depois."}
        confirmLabel={confirm === "delete" ? "Excluir" : "Cancelar evento"}
        onConfirm={() => confirm && action(confirm)}
        onClose={() => setConfirm(null)}
      />
    </SubpageFrame>
  );
}
