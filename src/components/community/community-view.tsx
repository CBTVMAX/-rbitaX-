"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FileText,
  Film,
  Globe,
  Images,
  Info,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  MoreHorizontal,
  Music2,
  Plus,
  Settings,
  Share2,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { CommunityJoinButton } from "@/components/community-join-button";
import { useStoreToast } from "@/components/store/store-view";
import { categoryLabel } from "@/lib/community-categories";
import { accentOf, ago, categoryOf, compactNumber, rank, type Album, type Community, type CommunityPost, type Discussion, type Membership, type Role, type Viewer } from "@/lib/communities";
import { CommunityContext, useCommunity, type CommunityCtx } from "./context";
import { CommunityPostCard } from "./post-card";
import { useCreateOptions } from "./composer";
import { useCreateFlow, type Created } from "./create-flow";
import { ContentCenter, type ContentCounts, type ContentTab } from "./content-center";
import { CommunityMenu, useCommunityChat, useShareCommunity } from "./community-menu";
import { StoriesStrip } from "./stories";
import { useTimeZone } from "@/lib/use-tz";
import { DateBadge, eventLive, eventWhen, type CommunityEvent } from "./events";
import { MutedNotice } from "./subpage";
import { EmptyState, OfficialBadge, RoleBadge } from "./ui";

export type MemberPreview = { role: Role; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean } };

const TAB_IDS: ContentTab[] = ["tudo", "posts", "fotos", "videos", "clipes", "musica", "gifs", "arquivos"];

/** Round shortcuts under the header: each opens a real page of the community. */
function Highlights({ slug, counts }: { slug: string; counts: { announcements: number; discussions: number; events: number } & ContentCounts }) {
  const base = `/comunidades/${slug}`;
  const items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; tone: string }[] = [
    { href: `${base}/avisos`, label: "Avisos", icon: Megaphone, count: counts.announcements, tone: "from-amber-400 to-orbit-pink" },
    { href: `${base}/discussoes`, label: "Discussões", icon: MessagesSquare, count: counts.discussions, tone: "from-orbit-purple to-orbit-pink" },
    { href: `${base}/eventos`, label: "Eventos", icon: CalendarDays, count: counts.events, tone: "from-orbit-cyan to-orbit-blue" },
    { href: `${base}/conteudo?aba=fotos`, label: "Fotos", icon: Images, count: counts.fotos, tone: "from-emerald-400 to-orbit-cyan" },
    { href: `${base}/conteudo?aba=videos`, label: "Vídeos", icon: Film, count: (counts.videos ?? 0) + (counts.clipes ?? 0), tone: "from-red-400 to-orbit-purple" },
    { href: `${base}/conteudo?aba=musica`, label: "Música", icon: Music2, count: counts.musica, tone: "from-orbit-pink to-orbit-purple" },
    { href: `${base}/conteudo?aba=arquivos`, label: "Arquivos", icon: FileText, count: counts.arquivos, tone: "from-slate-300 to-orbit-blue" },
    { href: `${base}/momentos`, label: "Momentos", icon: Sparkles, tone: "from-orbit-cyan via-orbit-purple to-orbit-pink" },
  ];
  return (
    <nav aria-label="Destaques da comunidade" className="-mx-4 md:mx-0">
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:px-0 lg:grid lg:grid-cols-8 lg:gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl py-1 text-center lg:w-auto">
              <span className={clsx("relative flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br p-[1.5px] transition group-hover:scale-105 group-active:scale-95", it.tone)}>
                <span className="flex h-full w-full items-center justify-center rounded-[18.5px] bg-space-card/95 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                {!!it.count && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-space-bg bg-white px-1 text-[10px] font-bold tabular-nums text-space-bg">
                    {compactNumber(it.count)}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium text-white/75 group-hover:text-white">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NextEvent({ e, slug, rsvp }: { e: CommunityEvent; slug: string; rsvp: string | null }) {
  const tz = useTimeZone();
  const live = eventLive(e);
  return (
    <Link
      href={`/comunidades/${slug}/eventos/${e.id}`}
      className="flex items-center gap-3 overflow-hidden rounded-3xl border border-orbit-cyan/25 bg-[linear-gradient(120deg,rgb(34_211_238/0.12),rgb(var(--app-accent,139_92_246)/0.08)_60%,transparent)] p-3 transition hover:border-orbit-cyan/50"
    >
      <DateBadge iso={e.startsAt} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-orbit-cyan">
          {live ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> : <CalendarDays className="h-3.5 w-3.5" />}
          {live ? "Acontecendo agora" : "Próximo evento"}
        </span>
        <span className="block truncate font-semibold text-white">{e.title}</span>
        <span className="block truncate text-xs text-white/55">
          {eventWhen(e, tz)}
          {e.location && (
            <>
              {" · "}
              <MapPin className="-mt-0.5 inline h-3 w-3" /> {e.location}
            </>
          )}
        </span>
      </span>
      <span className="hidden shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white sm:block">{rsvp === "going" ? "Você vai ✓" : `${e.goingCount} vão`}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
    </Link>
  );
}

export function CommunityView(props: {
  community: Community;
  viewer: Viewer;
  membership: Membership;
  canSee: boolean;
  initialTab: string;
  pinned: CommunityPost[];
  posts: CommunityPost[];
  focus: CommunityPost | null;
  discussions: Discussion[];
  albums: Album[];
  members: MemberPreview[];
  counts: ContentCounts & { discussions: number; announcements: number; events: number };
  nextEvent: { event: CommunityEvent; rsvp: string | null } | null;
  staffBadges: { pending: number; requests: number; reports: number };
}) {
  const { community, viewer, membership, canSee } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [role, setRole] = useState<Role | null>(membership.role);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pinned, setPinned] = useState(props.pinned);
  const [menu, setMenu] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [fab, setFab] = useState(false);
  const accent = accentOf(community.accentColor);
  const base = `/comunidades/${community.slug}`;

  useEffect(() => setPinned(props.pinned), [props.pinned]);
  useEffect(() => {
    const onScroll = () => setFab(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctx: CommunityCtx = useMemo(
    () => ({ community, viewer, role, setRole, membership, supabase, toast, refresh: () => (setRefreshKey((k) => k + 1), router.refresh()) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community, viewer, role, membership, supabase]
  );

  const staff = rank(role) >= 2;
  const badgeTotal = props.staffBadges.pending + props.staffBadges.requests + props.staffBadges.reports;
  const initialTab = (TAB_IDS.includes(props.initialTab as ContentTab) ? props.initialTab : "tudo") as ContentTab;

  return (
    <CommunityContext.Provider value={ctx}>
      <div style={{ ["--app-accent" as string]: accent.rgb }}>
        <Hub
          {...props}
          initialTab={initialTab}
          staff={staff}
          badgeTotal={badgeTotal}
          pinned={pinned}
          setPinned={setPinned}
          refreshKey={refreshKey}
          bump={() => (setRefreshKey((k) => k + 1), router.refresh())}
          openMenu={() => setMenu(true)}
          descOpen={descOpen}
          setDescOpen={setDescOpen}
          fab={fab}
          base={base}
        />
        <CommunityMenu open={menu} onClose={() => setMenu(false)} membership={membership} onLeft={() => setRole(null)} />
        {node}
      </div>
    </CommunityContext.Provider>
  );
}

type HubProps = Parameters<typeof CommunityView>[0] & {
  initialTab: ContentTab;
  staff: boolean;
  badgeTotal: number;
  setPinned: (f: (l: CommunityPost[]) => CommunityPost[]) => void;
  refreshKey: number;
  bump: () => void;
  openMenu: () => void;
  descOpen: boolean;
  setDescOpen: (f: (v: boolean) => boolean) => void;
  fab: boolean;
  base: string;
};

/** Inside the context so the hooks (create options, chat, share) see the community. */
function Hub(p: HubProps) {
  const { community, viewer, membership, canSee, staff, base } = p;
  const router = useRouter();
  const { role, setRole, toast } = useCommunity();
  const share = useShareCommunity();
  const chat = useCommunityChat();
  const options = useCreateOptions();
  const canCreate = options.length > 0 && canSee;
  const accent = accentOf(community.accentColor);
  const tz = useTimeZone();

  function onCreated(r: Created) {
    if (r.status === "pending") toast("Enviado! A moderação vai revisar antes de aparecer.");
    if (r.kind === "discussion" && r.status === "visible") return router.push(`${base}/discussoes/${r.id}`);
    if (r.kind === "event") return router.push(`${base}/eventos/${r.id}`);
    if (r.kind === "story") return;
    p.bump();
  }
  const flow = useCreateFlow({ albums: p.albums, onCreated });

  const iconBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:bg-white/[0.08]";
  const actions = (
    <>
      {viewer ? (
        <CommunityJoinButton
          communityId={community.id}
          initiallyMember={!!membership.role}
          isPrivate={community.isPrivate}
          role={role}
          request={membership.request}
          banned={membership.banned}
          notify={membership.notify}
          size="lg"
          onChange={(s) => setRole?.(s === "member" ? role ?? "member" : null)}
        />
      ) : (
        <Link href="/entrar" className="flex h-11 items-center rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow">
          Entrar para participar
        </Link>
      )}
      {canCreate && (
        <button type="button" onClick={flow.openMenu} className="flex h-11 items-center gap-1.5 rounded-full border border-orbit-purple/40 bg-orbit-purple/10 px-4 text-sm font-semibold text-white transition hover:bg-orbit-purple/20">
          <Plus className="h-4 w-4" /> Criar
        </button>
      )}
      {viewer && rank(role) < 3 && !membership.banned && (
        <button type="button" onClick={chat.open} disabled={chat.busy} className="flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
          {chat.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />} Mensagem
        </button>
      )}
      {staff && (
        <Link href={`${base}/gerenciar`} className="relative flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
          <Settings className="h-4 w-4" /> Gerenciar
          {p.badgeTotal > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orbit-pink px-1 text-[10px] font-bold text-snow">{p.badgeTotal}</span>}
        </Link>
      )}
      <button type="button" onClick={share} aria-label="Compartilhar comunidade" className={iconBtn}>
        <Share2 className="h-[18px] w-[18px]" />
      </button>
      <button type="button" onClick={p.openMenu} aria-label="Mais opções" className={iconBtn}>
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </>
  );

  const header = (
    <div className="relative">
      <div
        className="relative h-36 overflow-hidden sm:h-48 md:h-56 md:rounded-b-[32px] lg:mx-6 lg:mt-4 lg:rounded-[32px]"
        style={{ background: `linear-gradient(135deg, ${accent.from}, rgb(${accent.rgb}) 55%, ${accent.to})` }}
      >
        {community.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.35),transparent_55%)]" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-space-bg via-transparent to-transparent" />
        <Link href="/comunidades" aria-label="Voltar para comunidades" className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-10">
        <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
          <span className="relative shrink-0 rounded-[26px] p-[3px] shadow-[0_0_28px_rgb(var(--app-accent,139_92_246)/0.45)]" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[23px] bg-space-card text-2xl font-bold text-white sm:h-24 sm:w-24">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                community.name.slice(0, 1).toUpperCase()
              )}
            </span>
          </span>
          <div className="hidden min-w-0 flex-1 pb-1 md:block">
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-[22px] font-bold leading-tight text-white sm:text-2xl md:text-3xl">
            <span className="min-w-0 break-words">{community.name}</span>
            {community.isOfficial && <OfficialBadge />}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
            <span>@{community.username}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              {community.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {community.isPrivate ? "Privada" : "Pública"}
            </span>
            {community.category && (
              <>
                <span aria-hidden>·</span>
                <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60">{categoryLabel(community.category)}</span>
              </>
            )}
          </p>
          <Link href={`${base}/membros`} className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white">
            <Users className="h-4 w-4 text-orbit-cyan" /> <strong className="font-semibold text-white">{compactNumber(community.memberCount)}</strong> {community.memberCount === 1 ? "membro" : "membros"}
            {role && <RoleBadge role={role} className="ml-1" />}
          </Link>
          {community.description && (
            <div className="mt-2 max-w-2xl">
              <p className={clsx("whitespace-pre-wrap text-sm leading-relaxed text-white/70", !p.descOpen && "line-clamp-3")}>{community.description}</p>
              <div className="mt-0.5 flex gap-3">
                {community.description.length > 160 && (
                  <button type="button" onClick={() => p.setDescOpen((v) => !v)} className="text-xs font-semibold text-orbit-cyan">
                    {p.descOpen ? "Mostrar menos" : "Ler mais"}
                  </button>
                )}
                <Link href={`${base}/sobre`} className="text-xs font-semibold text-white/55 hover:text-white">
                  Sobre a comunidade
                </Link>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">{actions}</div>
        </div>
      </div>
    </div>
  );

  const composerPrompt = canCreate && viewer && (
    <button type="button" onClick={flow.openMenu} className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.08] bg-space-card/80 p-3 text-left transition hover:border-orbit-purple/40">
      <Avatar name={viewer.name} url={viewer.avatarUrl} size={40} />
      <span className="flex min-h-[44px] flex-1 items-center rounded-2xl border border-white/10 bg-space-bg/60 px-4 text-sm text-white/40">Compartilhe algo com a comunidade…</span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow">
        <Plus className="h-5 w-5" />
      </span>
    </button>
  );

  const staffMembers = p.members.filter((m) => m.role !== "member").sort((a, b) => rank(b.role) - rank(a.role));

  const sidebar = (
    <aside className="hidden space-y-3 lg:block">
      {staff && (
        <Link href={`${base}/gerenciar`} className="block rounded-3xl border border-orbit-purple/30 bg-[linear-gradient(135deg,rgb(var(--app-accent,139_92_246)/0.18),transparent_70%)] p-4 transition hover:border-orbit-purple/60">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Settings className="h-4 w-4" /> Gerenciar comunidade
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Pendentes", p.staffBadges.pending],
                ["Pedidos", p.staffBadges.requests],
                ["Denúncias", p.staffBadges.reports],
              ] as const
            ).map(([l, v]) => (
              <span key={l} className="rounded-2xl bg-black/20 py-2">
                <span className={clsx("block font-display text-lg font-bold", v > 0 ? "text-orbit-pink" : "text-white")}>{v}</span>
                <span className="block text-[10px] uppercase tracking-wide text-white/45">{l}</span>
              </span>
            ))}
          </div>
        </Link>
      )}
      <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Sobre</h2>
          <Link href={`${base}/sobre`} className="text-xs font-semibold text-orbit-cyan">
            Ver tudo
          </Link>
        </div>
        {community.description && <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-white/65">{community.description}</p>}
        <ul className="mt-3 space-y-2 text-xs text-white/55">
          <li className="flex items-center gap-2">
            {community.isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {community.isPrivate ? "Privada · só membros veem o conteúdo" : "Pública · qualquer pessoa pode ver e participar"}
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Criada em {new Date(community.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: tz })}
          </li>
        </ul>
      </section>
      {canSee && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Membros · {compactNumber(community.memberCount)}</h2>
            <Link href={`${base}/membros`} className="text-xs font-semibold text-orbit-cyan">
              Ver todos
            </Link>
          </div>
          {staffMembers.length > 0 && (
            <div className="mt-3 space-y-2">
              {staffMembers.slice(0, 4).map((m) => (
                <Link key={m.user.id} href={`/perfil/${m.user.username}`} className="flex items-center gap-2.5">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{m.user.name}</span>
                  <RoleBadge role={m.role} />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.members
              .filter((m) => m.role === "member")
              .slice(0, 16)
              .map((m) => (
                <Link key={m.user.id} href={`/perfil/${m.user.username}`} title={m.user.name}>
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={34} />
                </Link>
              ))}
          </div>
        </section>
      )}
      {canSee && p.discussions.length > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Discussões ativas</h2>
            <Link href={`${base}/discussoes`} className="text-xs font-semibold text-orbit-cyan">
              Ver todas
            </Link>
          </div>
          <ul className="space-y-1">
            {p.discussions.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link href={`${base}/discussoes/${d.id}`} className="block rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
                  <span className="line-clamp-2 text-sm text-white/85">
                    {categoryOf(d.category).emoji} {d.title}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {d.replyCount} {d.replyCount === 1 ? "resposta" : "respostas"} · {ago(d.lastActivityAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {community.links.length > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Links</h2>
          <ul className="space-y-1">
            {community.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-white/80 hover:bg-white/[0.04] hover:text-white">
                  <Link2 className="h-4 w-4 shrink-0 text-orbit-cyan" /> <span className="truncate">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );

  return (
    <>
      {header}
      <div className="mx-auto mt-3 max-w-6xl space-y-3 px-4 md:px-6 lg:px-10">
        <MutedNotice />
        {staff && p.badgeTotal > 0 && (
          <Link href={`${base}/gerenciar?secao=moderacao`} className="flex items-center gap-2 rounded-2xl border border-orbit-pink/30 bg-orbit-pink/[0.06] px-3 py-2.5 text-xs text-white/85 lg:hidden">
            <ShieldAlert className="h-4 w-4 text-orbit-pink" />
            {[
              p.staffBadges.pending && `${p.staffBadges.pending} aguardando aprovação`,
              p.staffBadges.requests && `${p.staffBadges.requests} ${p.staffBadges.requests === 1 ? "pedido" : "pedidos"} para entrar`,
              p.staffBadges.reports && `${p.staffBadges.reports} ${p.staffBadges.reports === 1 ? "denúncia" : "denúncias"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            <ChevronRight className="ml-auto h-4 w-4" />
          </Link>
        )}
        {canSee && <StoriesStrip canSee={canSee} />}
        {canSee && <Highlights slug={community.slug} counts={p.counts} />}
      </div>
      <div className="mx-auto mt-4 max-w-6xl px-4 pb-10 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:px-10">
        <div className="min-w-0 space-y-4">
          {!canSee ? (
            <EmptyState
              icon={<Lock className="h-6 w-6" />}
              title={membership.banned ? "Você não tem acesso a esta comunidade" : "Comunidade privada"}
              text={membership.banned ? "A moderação bloqueou sua participação." : "Somente membros aprovados veem as publicações, fotos e discussões. Peça para entrar e aguarde a aprovação."}
              action={
                <Link href={`${base}/sobre`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/80">
                  <Info className="h-4 w-4" /> Sobre a comunidade
                </Link>
              }
            />
          ) : (
            <>
              {p.nextEvent && <NextEvent e={p.nextEvent.event} rsvp={p.nextEvent.rsvp} slug={community.slug} />}
              {p.focus && !p.pinned.some((x) => x.id === p.focus!.id) && <CommunityPostCard post={p.focus} highlight />}
              {p.pinned.map((x) => (
                <CommunityPostCard
                  key={x.id}
                  post={x}
                  highlight={x.id === p.focus?.id}
                  onChanged={(n) => p.setPinned((l) => (n.isPinned ? l.map((y) => (y.id === n.id ? n : y)) : l.filter((y) => y.id !== n.id)))}
                  onDeleted={(id) => p.setPinned((l) => l.filter((y) => y.id !== id))}
                />
              ))}
              <ContentCenter
                initialTab={p.initialTab}
                initialItems={p.posts}
                albums={p.albums}
                counts={p.counts}
                refreshKey={p.refreshKey}
                focusId={p.focus?.id}
                onCompose={flow.start}
                header={composerPrompt}
              />
            </>
          )}
        </div>
        {sidebar}
      </div>

      {canCreate && p.fab && (
        <button
          type="button"
          onClick={flow.openMenu}
          aria-label="Criar"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-[0_10px_30px_rgb(var(--app-accent,139_92_246)/0.55)] animate-pop-in transition active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
      {flow.element}
    </>
  );
}
