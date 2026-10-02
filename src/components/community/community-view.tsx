"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rememberCommunityVisit } from "@/lib/recent-communities";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  AlignLeft,
  ArrowLeft,
  AtSign,
  FileText,
  Images,
  Megaphone,
  Sparkles,
  CalendarDays,
  ChevronRight,
  Globe,
  Info,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Settings,
  Share2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { CommunityJoinButton } from "@/components/community-join-button";
import { useStoreToast } from "@/components/store/store-view";
import { categoryLabel } from "@/lib/community-categories";
import { accentOf, ago, can, categoryOf, compactNumber, rank, type Album, type Community, type CommunityPost, type Discussion, type Membership, type Role, type Viewer } from "@/lib/communities";
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
import type { CommunityContact } from "@/lib/community-contacts";
import { EmptyState, OfficialBadge, RoleBadge, Sheet } from "./ui";

export type MemberPreview = { role: Role; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean } };

const TAB_IDS: ContentTab[] = ["tudo", "posts", "fotos", "videos", "clipes", "musica", "gifs", "arquivos"];

/** Abas da comunidade no estilo VK: Início, Discussões, Avisos… numa barra rolável, cada uma abre a página. */
function Highlights({ slug, counts, isRpg, staff, sheets }: { slug: string; counts: { announcements: number; discussions: number; events: number } & ContentCounts; isRpg?: boolean; staff?: boolean; sheets?: boolean }) {
  const base = `/comunidades/${slug}`;
  const items: { href: string; label: string; count?: number }[] = [
    { href: base, label: "Início" },
    { href: `${base}/discussoes`, label: "Discussões", count: counts.discussions },
    { href: `${base}/avisos`, label: "Avisos", count: counts.announcements },
    ...(sheets || staff ? [{ href: `${base}/fichas`, label: "Fichas" }] : []),
    ...(isRpg ? [{ href: `${base}/personagens`, label: "Personagens" }] : []),
    { href: `${base}/eventos`, label: "Eventos", count: counts.events },
    { href: `${base}/chats`, label: "Bate-papos" },
    { href: `${base}/momentos`, label: "Momentos" },
    { href: `${base}/membros`, label: "Membros" },
    { href: `${base}/sobre`, label: "Sobre" },
    { href: `${base}/assuntos`, label: "Assuntos" },
  ];
  return (
    <nav aria-label="Seções da comunidade" className="flex items-center gap-1 rounded-3xl border border-white/[0.08] bg-space-card/70 p-2">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
        {items.map((it, i) => (
          <Link
            key={it.href}
            href={it.href}
            className={clsx(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-[15px] font-medium transition",
              i === 0 ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
            )}
          >
            {it.label}
            {!!it.count && <span className="text-xs text-white/40">{compactNumber(it.count)}</span>}
          </Link>
        ))}
      </div>
      {staff && (
        <Link href={`${base}/gerenciar?secao=abas`} aria-label="Configurar abas" title="Configurar abas" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-l border-white/10 text-white/60 hover:text-white">
          <Settings className="h-5 w-5" />
        </Link>
      )}
    </nav>
  );
}

/** Quadros clicáveis com capa (os links da comunidade), como "INSCRIÇÃO MEMBROS" e "REGRAS" no VK. */
function MenuTiles({ community, staff, base, discussions }: { community: Community; staff: boolean; base: string; discussions: Discussion[] }) {
  // Como no VK: os atalhos configurados e, em seguida, os tópicos de discussão (fixados primeiro),
  // cada um como um quadro com capa. Uma discussão já usada num atalho não se repete.
  const links = community.links ?? [];
  const linked = new Set(links.map((l) => l.url.split("/discussoes/")[1]?.split(/[?#]/)[0]).filter(Boolean));
  const items: { label: string; url: string; image?: string | null; path?: string }[] = [
    ...links,
    ...discussions
      .filter((d) => !linked.has(d.id))
      .map((d) => ({ label: d.title, url: "", image: d.imageUrl, path: `${base}/discussoes/${d.id}` })),
  ].slice(0, 12);
  // A origem só é conhecida no navegador: até lá todos viram <a>, evitando diferença entre servidor e cliente.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  if (!items.length && !staff) return null;
  const sameSite = (url: string) => {
    try {
      const u = new URL(url);
      return origin && u.origin === origin ? u.pathname + u.search + u.hash : null;
    } catch {
      return null;
    }
  };
  // Só mostramos imagens do próprio armazenamento do ÓrbitaX.
  const safeImage = (src?: string | null) => (src && /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//.test(src) ? src : null);
  const tile = "w-[168px] shrink-0 md:w-[188px]";
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
        {staff && (
          <Link href={`${base}/gerenciar?secao=geral#links`} className={tile}>
            <span className="flex aspect-[2/1] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white">
              <Settings className="h-7 w-7" />
            </span>
            <span className="mt-1.5 block truncate text-center text-[13px] text-white/75">{links.length ? "Configurar" : "Adicionar atalhos"}</span>
          </Link>
        )}
        {items.map((l, i) => {
          const img = safeImage(l.image) ?? community.avatarUrl ?? community.coverUrl;
          const inner = (
            <>
              <span className="relative block aspect-[2/1] overflow-hidden rounded-2xl bg-space-bg">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-orbit-gradient text-2xl font-bold text-snow">{l.label.slice(0, 1)}</span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-center text-[13px] font-medium uppercase tracking-wide text-white/80">{l.label}</span>
            </>
          );
          const internal = l.path ?? sameSite(l.url);
          return internal ? (
            <Link key={i} href={internal} className={tile}>
              {inner}
            </Link>
          ) : (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className={tile}>
              {inner}
            </a>
          );
        })}
      </div>
    </section>
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
  canAsCommunity: boolean;
  customTabs: { id: string; name: string }[];
  /** Contatos com cargo livre; null enquanto a migração não rodou (aí mostramos a equipe). */
  contacts?: CommunityContact[] | null;
  /** A comunidade publicou a ficha (Construtor de Ficha). */
  hasSheets?: boolean;
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
  // Entra em "Visitadas recentemente" na lista de comunidades (só neste navegador).
  useEffect(() => {
    rememberCommunityVisit({ slug: community.slug, name: community.name, avatarUrl: community.avatarUrl });
  }, [community.slug, community.name, community.avatarUrl]);
  useEffect(() => {
    const onScroll = () => setFab(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctx: CommunityCtx = useMemo(
    () => ({ community, viewer, role, setRole, membership, supabase, toast, canAsCommunity: props.canAsCommunity, refresh: () => (setRefreshKey((k) => k + 1), router.refresh()) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community, viewer, role, membership, supabase, props.canAsCommunity]
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
  // Como no VK: quem participa mas não pode publicar no mural sugere o post para a administração.
  // Só quando o dono liberou "Sugerir posts" em Permissões.
  const canSuggest = canSee && !!viewer && rank(role) >= 1 && !membership.muted && !can(community, role, "post") && can(community, role, "suggest");
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
  const [infoOpen, setInfoOpen] = useState(false);
  const canDiscuss = !!viewer && canSee && can(community, role, "discussion") && !membership.muted;

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

  // Mesmas proporções do perfil: capa 7:2 inteira (é como ela é salva) e foto redonda na beirada.
  const header = (
    <div className="relative mx-auto max-w-6xl lg:px-10 lg:pt-4">
      <div
        className="relative aspect-[7/2] w-full overflow-hidden md:rounded-b-[28px] lg:rounded-[28px]"
        style={{ background: `linear-gradient(135deg, ${accent.from}, rgb(${accent.rgb}) 55%, ${accent.to})` }}
      >
        {community.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.35),transparent_55%)]" />
        )}
        <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent md:hidden" />
        <Link href="/comunidades" aria-label="Voltar para comunidades" className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
      <div className="px-4 md:px-6">
        <div className="flex items-end gap-4">
          <span
            className="relative z-10 -mt-[clamp(28px,7.5vw,32px)] shrink-0 rounded-full p-[3px] shadow-[0_0_28px_rgb(var(--app-accent,139_92_246)/0.45)] md:-mt-12 lg:-mt-14"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            <span className="flex h-[clamp(100px,29vw,118px)] w-[clamp(100px,29vw,118px)] items-center justify-center overflow-hidden rounded-full border-4 border-space-bg bg-space-card text-3xl font-bold text-white md:h-[136px] md:w-[136px] lg:h-[156px] lg:w-[156px]">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                community.name.slice(0, 1).toUpperCase()
              )}
            </span>
          </span>
          <div className="hidden min-w-0 flex-1 pb-2 md:block">
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
            <Users className="h-4 w-4 text-orbit-cyan" /> {role && <span>Você participa ·</span>} <strong className="font-semibold text-white">{compactNumber(community.memberCount)}</strong> {community.memberCount === 1 ? "membro" : "membros"}
            {role && <RoleBadge role={role} className="ml-1" />}
          </Link>
          {community.description && (
            <div className="mt-2 max-w-2xl">
              <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{community.description}</p>
              <button type="button" onClick={() => setInfoOpen(true)} className="mt-0.5 text-sm font-semibold text-orbit-cyan hover:underline">
                Mais
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">{actions}</div>
        </div>
      </div>
    </div>
  );



  const staffMembers = p.members.filter((m) => m.role !== "member").sort((a, b) => rank(b.role) - rank(a.role));

  // Como no VK: as discussões recentes e "Adicionar discussão" / "Mostrar tudo" (os tópicos já aparecem como quadros no topo).
  const discussionsCard = canSee && (p.discussions.length > 0 || canDiscuss) && (
    <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <MessagesSquare className="h-4 w-4 text-orbit-cyan" /> Discussões
        {p.counts.discussions > 0 && <span className="font-normal text-white/45">{p.counts.discussions}</span>}
      </h2>
      {p.discussions.length === 0 ? (
        <p className="py-2 text-sm text-white/50">Nenhuma discussão ainda. Comece a primeira!</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {p.discussions.slice(0, 3).map((d) => (
            <li key={d.id}>
              <Link href={`${base}/discussoes/${d.id}`} className="block py-2.5 transition hover:opacity-80">
                <span className="line-clamp-1 text-[15px] font-semibold text-white">{d.title}</span>
                <span className="text-xs text-white/45">
                  {d.replyCount} {d.replyCount === 1 ? "comentário" : "comentários"} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: tz })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className={clsx("mt-3 grid gap-2", canDiscuss ? "grid-cols-2" : "grid-cols-1")}>
        {canDiscuss && (
          <button type="button" onClick={() => flow.start("discussion")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] text-sm font-medium text-orbit-cyan transition hover:bg-white/[0.1]">
            <Plus className="h-4 w-4" /> Adicionar discussão
          </button>
        )}
        <Link href={`${base}/discussoes`} className="flex h-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-medium text-orbit-cyan transition hover:bg-white/[0.1]">
          Mostrar tudo{p.counts.discussions > 0 ? ` ${p.counts.discussions}` : ""}
        </Link>
      </div>
    </section>
  );

  const sectionTiles: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { href: `${base}/discussoes`, label: "Discussões", icon: MessagesSquare },
    ...(p.hasSheets ? [{ href: `${base}/fichas`, label: "Fichas", icon: FileText }] : []),
    { href: `${base}/avisos`, label: "Avisos", icon: Megaphone },
    { href: `${base}/chats`, label: "Bate-papos", icon: MessageSquareText },
    { href: `${base}/eventos`, label: "Eventos", icon: CalendarDays },
    { href: `${base}/momentos`, label: "Momentos", icon: Sparkles },
    { href: `${base}/conteudo?aba=fotos`, label: "Fotos", icon: Images },
    { href: `${base}/membros`, label: "Membros", icon: Users },
  ];
  // "Informação detalhada", como no VK: tudo sobre a comunidade e as seções em quadros.
  const infoSheet = (
    <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Informação detalhada">
      <div className="space-y-1 pb-2">
        {(
          [
          [Info, <span key="n" className="font-medium text-white">{community.name}</span>],
          community.description ? [AlignLeft, <span key="d" className="whitespace-pre-wrap">{community.description}</span>] : null,
          [AtSign, <span key="u">{community.username}</span>],
          [community.isPrivate ? Lock : Globe, <span key="p">{community.isPrivate ? "Privada · só membros veem o conteúdo" : "Pública · qualquer pessoa pode ver e participar"}</span>],
          [CalendarDays, <span key="c">Criada em {new Date(community.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: tz })}</span>],
        ] as ([React.ComponentType<{ className?: string }>, React.ReactNode] | null)[]
        )
          .filter((x): x is [React.ComponentType<{ className?: string }>, React.ReactNode] => !!x)
          .map(([Icon, node], i) => (
            <div key={i} className="flex items-start gap-3 border-b border-white/[0.06] py-3 text-sm leading-relaxed text-white/75 last:border-0">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />
              <div className="min-w-0 flex-1 break-words">{node}</div>
            </div>
          ))}
        {community.links.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            {community.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 py-1.5 text-sm text-orbit-cyan hover:underline">
                <Link2 className="h-5 w-5 shrink-0 text-white/40" /> <span className="truncate">{l.label}</span>
              </a>
            ))}
          </div>
        )}
        {canSee && (
          <div className="pt-3">
            <p className="mb-3 text-[15px] font-semibold text-white">Seções</p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {sectionTiles.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.href} href={t.href} onClick={() => setInfoOpen(false)} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="flex aspect-square w-full max-w-[72px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-[12px] text-white/75">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );

  // Membros com nome (como "Seguidores" do VK) e Contatos: dono e equipe com o cargo.
  const ROLE_TITLE: Record<string, string> = { owner: "Proprietário(a) da comunidade", admin: "Administrador(a)", moderator: "Moderador(a)", editor: "Editor(a)" };
  const membersCard = canSee && p.members.length > 0 && (
    <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Membros <span className="font-normal text-white/45">{compactNumber(community.memberCount)}</span>
        </h2>
        <Link href={`${base}/membros`} className="text-xs font-semibold text-orbit-cyan">
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {p.members.slice(0, 8).map((m) => (
          <Link key={m.user.id} href={`/perfil/${m.user.username}`} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <Avatar name={m.user.name} url={m.user.avatarUrl} size={56} />
            <span className="w-full truncate text-[12px] text-white/75">{m.user.name.split(" ")[0]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
  // Contatos escolhidos pela administração, com o cargo que ela deu ("President MC®"); sem lista
  // configurada, mostra o dono e a equipe com o cargo do sistema.
  const contactList: { id: string; name: string; username: string; avatarUrl: string | null; title: string }[] =
    p.contacts && p.contacts.length
      ? p.contacts.map((c) => ({ ...c.user, title: c.title }))
      : staffMembers.map((m) => ({ ...m.user, title: ROLE_TITLE[m.role] ?? "Equipe" }));
  const canEditContacts = rank(role) >= 3 && p.contacts !== null && p.contacts !== undefined;
  const contactsCard = canSee && (contactList.length > 0 || canEditContacts) && (
    <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Contatos <span className="font-normal text-white/45">{contactList.length}</span>
        </h2>
        {canEditContacts && (
          <Link href={`${base}/gerenciar?secao=contatos`} className="text-xs font-semibold text-orbit-cyan">
            Alterar
          </Link>
        )}
      </div>
      <div className="space-y-1">
        {contactList.slice(0, 10).map((c) => (
          <Link key={c.id} href={`/perfil/${c.username}`} className="flex items-center gap-3 rounded-xl py-1.5 hover:bg-white/[0.03]">
            <Avatar name={c.name} url={c.avatarUrl} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{c.name}</span>
              {c.title && <span className="block truncate text-xs text-white/45">{c.title}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );

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
      {membersCard}
      {contactsCard}
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
        {canSee && <MenuTiles community={community} staff={rank(role) >= 3} base={base} discussions={p.discussions} />}
        {(canCreate || canSuggest) && (
          <section className={clsx("grid gap-2 rounded-3xl border border-white/[0.08] bg-space-card/70 p-3", canCreate && canSuggest && "grid-cols-2")}>
            {canSuggest && (
              <button type="button" onClick={flow.startSuggest} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-[16px] font-semibold text-white transition hover:bg-white/[0.1]">
                <Plus className="h-5 w-5" /> Sugerir post
              </button>
            )}
            {canCreate && (
              <button type="button" onClick={flow.openMenu} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-[16px] font-semibold text-white transition hover:bg-white/[0.1]">
                <Plus className="h-5 w-5" /> Criar
              </button>
            )}
          </section>
        )}
        {canSee && <Highlights slug={community.slug} counts={p.counts} isRpg={community.isRpg} staff={rank(role) >= 3} sheets={p.hasSheets} />}
        {canSee && <StoriesStrip canSee={canSee} />}
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
              {discussionsCard}
              <div className="space-y-4 lg:hidden">
                {membersCard}
                {contactsCard}
              </div>
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
                customTabs={p.customTabs}
                refreshKey={p.refreshKey}
                focusId={p.focus?.id}
                onCompose={flow.start}
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
      {infoSheet}
    </>
  );
}
