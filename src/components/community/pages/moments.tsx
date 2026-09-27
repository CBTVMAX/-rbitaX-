"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, Loader2, MapPin, MessagesSquare, Play, Sparkles, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { ago, categoryOf, TAG_LABEL, type PostTag } from "@/lib/communities";
import { dayKey, useTimeZone } from "@/lib/use-tz";
import { useCommunity } from "../context";
import { eventWhen } from "../events";
import { SubpageFrame } from "../subpage";
import { EmptyState } from "../ui";

export type Moment = {
  kind: "photo" | "video" | "announcement" | "article" | "event" | "discussion" | "album" | "members" | "story";
  id: string;
  at: string;
  title?: string | null;
  text?: string | null;
  image?: string | null;
  href: string;
  mediaCount?: number;
  startsAt?: string;
  location?: string;
  going?: number;
  cancelled?: boolean;
  category?: string;
  replies?: number;
  count?: number;
  people?: { id: string; name: string; avatarUrl: string | null }[] | null;
  type?: string;
  asCommunity?: boolean;
  actor?: { id: string; name: string; username: string; avatarUrl: string | null } | null;
};

const KIND: Record<Moment["kind"], { label: string; emoji: string; tone: string }> = {
  photo: { label: "Fotos", emoji: "📷", tone: "text-emerald-300" },
  video: { label: "Vídeo", emoji: "🎥", tone: "text-red-300" },
  announcement: { label: "Aviso", emoji: "📣", tone: "text-amber-300" },
  article: { label: "Artigo", emoji: "📰", tone: "text-orbit-cyan" },
  event: { label: "Evento", emoji: "📅", tone: "text-orbit-cyan" },
  discussion: { label: "Discussão", emoji: "💬", tone: "text-orbit-purple" },
  album: { label: "Álbum", emoji: "🗂️", tone: "text-emerald-300" },
  members: { label: "Novos membros", emoji: "👋", tone: "text-orbit-pink" },
  story: { label: "História", emoji: "⭕", tone: "text-orbit-pink" },
};

const FILTERS: { id: string; label: string; kinds: Moment["kind"][] | null }[] = [
  { id: "tudo", label: "Tudo", kinds: null },
  { id: "midia", label: "Fotos e vídeos", kinds: ["photo", "video", "album", "story"] },
  { id: "eventos", label: "Eventos", kinds: ["event"] },
  { id: "avisos", label: "Avisos e artigos", kinds: ["announcement", "article"] },
  { id: "discussoes", label: "Discussões", kinds: ["discussion"] },
  { id: "membros", label: "Membros", kinds: ["members"] },
];

function dayLabel(iso: string, tz: string) {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(`${dayKey(x, tz)}T00:00:00Z`).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: tz }).replace(/^./, (c) => c.toUpperCase());
  const sameYear = dayKey(d, tz).slice(0, 4) === dayKey(today, tz).slice(0, 4);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: sameYear ? undefined : "numeric", timeZone: tz });
}

function MomentCard({ m, community, tz }: { m: Moment; community: { name: string; avatarUrl: string | null }; tz: string }) {
  const k = KIND[m.kind];
  const who = m.kind === "story" && m.asCommunity ? { name: community.name, avatarUrl: community.avatarUrl } : m.actor;
  const tag = m.kind === "announcement" && m.title && m.title in TAG_LABEL ? TAG_LABEL[m.title as PostTag] : null;
  const title = m.kind === "announcement" ? tag?.label ?? "Aviso" : m.title;
  return (
    <Link
      href={m.href}
      className="group mb-3 block break-inside-avoid overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80 transition hover:-translate-y-0.5 hover:border-orbit-purple/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
    >
      {m.image && (
        <span className={clsx("relative block overflow-hidden bg-black", m.kind === "story" ? "aspect-[9/12]" : "aspect-[4/3]")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          {m.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                <Play className="h-5 w-5 fill-white" />
              </span>
            </span>
          )}
          {!!m.mediaCount && m.mediaCount > 1 && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">+{m.mediaCount - 1}</span>}
        </span>
      )}
      <span className="block p-3.5">
        <span className={clsx("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide", k.tone)}>
          <span aria-hidden>{tag?.emoji ?? k.emoji}</span> {m.kind === "discussion" ? categoryOf(m.category).label : k.label}
          {m.cancelled && <span className="rounded-full bg-red-500/20 px-1.5 text-red-300">cancelado</span>}
        </span>
        {m.kind === "members" ? (
          <>
            <span className="mt-2 flex -space-x-2">
              {(m.people ?? []).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-space-card">
                  <Avatar name={p.name} url={p.avatarUrl} size={34} />
                </span>
              ))}
            </span>
            <span className="mt-2 block text-sm font-semibold text-white">
              {m.count === 1 ? `${m.people?.[0]?.name ?? "Uma pessoa"} entrou na comunidade` : `${m.count} novos membros entraram`}
            </span>
          </>
        ) : (
          <>
            {title && <span className="mt-1 line-clamp-2 block font-semibold leading-snug text-white">{title}</span>}
            {m.text && <span className={clsx("mt-1 block text-sm text-white/65", m.image ? "line-clamp-2" : "line-clamp-4")}>{m.text}</span>}
            {m.kind === "event" && m.startsAt && (
              <span className="mt-2 block space-y-0.5 text-xs text-white/55">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-orbit-cyan" /> {eventWhen({ startsAt: m.startsAt, endsAt: null }, tz)}
                </span>
                {m.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-orbit-pink" /> {m.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {m.going ?? 0} {(m.going ?? 0) === 1 ? "vai" : "vão"}
                </span>
              </span>
            )}
            {m.kind === "discussion" && (
              <span className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
                <MessagesSquare className="h-3.5 w-3.5" /> {m.replies ?? 0} {m.replies === 1 ? "resposta" : "respostas"}
              </span>
            )}
          </>
        )}
        {who && (
          <span className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
            <Avatar name={who.name} url={who.avatarUrl} size={24} />
            <span className="min-w-0 flex-1 truncate text-xs text-white/60">{who.name}</span>
            <span className="shrink-0 text-[11px] text-white/35">{ago(m.at)}</span>
          </span>
        )}
      </span>
    </Link>
  );
}

export function MomentsView({ canSee, initial }: { canSee: boolean; initial: Moment[] }) {
  const { supabase, community } = useCommunity();
  const tz = useTimeZone();
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < 30);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("tudo");

  async function more() {
    if (loading || !items.length) return;
    setLoading(true);
    const { data } = await supabase.rpc("community_moments", { p_community: community.id, p_before: items[items.length - 1].at, p_limit: 30 });
    setLoading(false);
    const next = ((data ?? []) as unknown as Moment[]).filter((m) => !items.some((x) => x.kind === m.kind && x.id === m.id));
    setItems([...items, ...next]);
    if (next.length < 30) setDone(true);
  }

  const kinds = FILTERS.find((f) => f.id === filter)?.kinds;
  const shown = useMemo(() => (kinds ? items.filter((m) => kinds.includes(m.kind)) : items), [items, kinds]);
  const days = useMemo(() => {
    const map = new Map<string, Moment[]>();
    shown.forEach((m) => {
      const k = dayLabel(m.at, tz);
      map.set(k, [...(map.get(k) ?? []), m]);
    });
    return Array.from(map.entries());
  }, [shown, tz]);

  return (
    <SubpageFrame title="Momentos" icon="✨" wide canSee={canSee}>
      <div className="space-y-4">
        <p className="text-sm text-white/55">Tudo o que aconteceu em {community.name}: fotos, vídeos, eventos, avisos, discussões e quem chegou.</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", filter === f.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              {f.label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Nada por aqui ainda" text="Conforme a comunidade publica fotos, eventos e avisos, os momentos aparecem nesta linha do tempo." />
        ) : (
          days.map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                <span className="h-px flex-1 bg-white/[0.08]" /> {day} <span className="h-px flex-1 bg-white/[0.08]" />
              </h2>
              <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
                {list.map((m) => (
                  <MomentCard key={`${m.kind}-${m.id}`} m={m} community={community} tz={tz} />
                ))}
              </div>
            </section>
          ))
        )}
        {!done && (
          <button type="button" onClick={more} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Ver momentos anteriores
          </button>
        )}
      </div>
    </SubpageFrame>
  );
}
