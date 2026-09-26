"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, BarChart3, Bell, ChevronRight, FileStack, KeyRound, Settings2, ShieldAlert, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useStoreToast } from "@/components/store/store-view";
import { accentOf, rank, type Community, type Role, type Viewer } from "@/lib/communities";
import { CommunityContext, type CommunityCtx } from "../context";
import { Composer, type CreateKind } from "../composer";
import { OfficialBadge, RoleBadge } from "../ui";
import { GeneralSection } from "./general";
import { ContentSection } from "./content";
import { MembersSection } from "./members";
import { PermissionsSection } from "./permissions";
import { ModerationSection } from "./moderation";
import { NotificationsSection } from "./notifications";
import { StatsSection } from "./stats";

type Section = "geral" | "conteudo" | "membros" | "permissoes" | "moderacao" | "notificacoes" | "estatisticas";

const SECTIONS: { id: Section; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; min: number }[] = [
  { id: "geral", label: "Geral", desc: "Nome, @, categoria, foto, capa, tema e privacidade", icon: Settings2, min: 3 },
  { id: "conteudo", label: "Conteúdo", desc: "Fixados, publicações e discussões", icon: FileStack, min: 2 },
  { id: "membros", label: "Membros", desc: "Cargos, pedidos, bloqueados e removidos", icon: Users, min: 2 },
  { id: "permissoes", label: "Permissões", desc: "Quem pode publicar, comentar, enviar mídia…", icon: KeyRound, min: 3 },
  { id: "moderacao", label: "Moderação", desc: "Filtros, aprovações e denúncias", icon: ShieldAlert, min: 2 },
  { id: "notificacoes", label: "Notificações", desc: "Avisos para membros e anúncios", icon: Bell, min: 2 },
  { id: "estatisticas", label: "Estatísticas", desc: "Membros, alcance e engajamento", icon: BarChart3, min: 3 },
];

export function ManageView(props: {
  community: Community;
  viewer: Viewer;
  role: Role;
  notify: boolean;
  initialSection: string;
  badges: { pending: number; requests: number; reports: number };
}) {
  const { viewer, role } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [community, setCommunity] = useState(props.community);
  const [badges, setBadges] = useState(props.badges);
  const [composer, setComposer] = useState<CreateKind | null>(null);
  const allowed = SECTIONS.filter((s) => rank(role) >= s.min);
  const valid = (s: string): s is Section => allowed.some((x) => x.id === s);
  // Empty = the section list (phones). Desktop always shows a section.
  const [section, setSection] = useState<Section | "">(valid(props.initialSection) ? props.initialSection : "");
  const active: Section = section || (rank(role) >= 3 ? "geral" : "moderacao");
  const accent = accentOf(community.accentColor);
  const base = `/comunidades/${community.slug}`;

  const ctx: CommunityCtx = useMemo(
    () => ({ community, viewer, role, supabase, toast, refresh: () => router.refresh() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community, viewer, role, supabase]
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (section) url.searchParams.set("secao", section);
    else url.searchParams.delete("secao");
    window.history.replaceState(window.history.state, "", url.toString());
    if (section) window.scrollTo({ top: 0 });
  }, [section]);

  const badgeFor = (s: Section) => (s === "moderacao" ? badges.pending + badges.reports : s === "membros" && rank(role) >= 3 ? badges.requests : 0);

  const current = SECTIONS.find((s) => s.id === active)!;
  let content: React.ReactNode;
  switch (active) {
    case "geral":
      content = <GeneralSection onSaved={(p) => setCommunity((c) => ({ ...c, ...p, category: p.category ?? c.category }))} />;
      break;
    case "conteudo":
      content = <ContentSection />;
      break;
    case "membros":
      content = <MembersSection badges={badges} onBadge={(requests) => setBadges((b) => ({ ...b, requests }))} />;
      break;
    case "permissoes":
      content = <PermissionsSection onSaved={(permissions) => setCommunity((c) => ({ ...c, permissions }))} />;
      break;
    case "moderacao":
      content = <ModerationSection badges={badges} onBadges={(b) => setBadges((x) => ({ ...x, ...b }))} />;
      break;
    case "notificacoes":
      content = <NotificationsSection notify={props.notify} onAnnounce={() => setComposer("post")} />;
      break;
    case "estatisticas":
      content = <StatsSection />;
      break;
  }

  const nav = (
    <nav aria-label="Seções de gerenciamento" className="space-y-1">
      {allowed.map((s) => {
        const Icon = s.icon;
        const b = badgeFor(s.id);
        const on = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={on ? "page" : undefined}
            className={clsx(
              "flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 text-left transition",
              on ? "lg:bg-orbit-purple/[0.12] lg:shadow-[inset_0_0_0_1px_rgb(var(--app-accent,139_92_246)/0.35)]" : "hover:bg-white/[0.04]"
            )}
          >
            <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", on ? "lg:bg-orbit-gradient lg:text-snow bg-white/[0.05] text-white/75" : "bg-white/[0.05] text-white/75")}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{s.label}</span>
              <span className="block truncate text-xs text-white/45">{s.desc}</span>
            </span>
            {b > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-orbit-pink px-1.5 text-[11px] font-bold text-snow">{b}</span>}
            <ChevronRight className="h-4 w-4 shrink-0 text-white/30 lg:hidden" />
          </button>
        );
      })}
    </nav>
  );

  return (
    <CommunityContext.Provider value={ctx}>
      <div style={{ ["--app-accent" as string]: accent.rgb }} className="mx-auto max-w-6xl px-4 pb-16 pt-4 md:px-6 lg:px-10 lg:pt-6">
        <header className="flex items-center gap-3">
          {section ? (
            <button type="button" onClick={() => setSection("")} aria-label="Voltar para as seções" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/80 lg:hidden">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <Link href={base} aria-label="Voltar para a comunidade" className={clsx("h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/80", section ? "hidden lg:flex" : "flex")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-space-card text-base font-bold text-white" style={{ boxShadow: `0 0 0 2px rgb(${accent.rgb} / 0.6)` }}>
            {community.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              community.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-xs text-white/50">
              <span className="truncate">{community.name}</span> {community.isOfficial && <OfficialBadge />}
            </p>
            <h1 className="truncate font-display text-xl font-bold text-white md:text-2xl">
              <span className={clsx(section ? "hidden lg:inline" : "")}>Gerenciar</span>
              <span className={clsx(section ? "lg:hidden" : "hidden")}>{current.label}</span>
            </h1>
          </div>
          <RoleBadge role={role} className="hidden sm:inline-flex" />
        </header>

        <div className="mt-5 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
          <aside className={clsx("lg:block", section ? "hidden" : "block")}>
            <div className="lg:sticky lg:top-20">
              <div className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-2">{nav}</div>
              <Link href={base} className="mt-3 hidden items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold text-white/55 hover:text-white lg:flex">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a comunidade
              </Link>
            </div>
          </aside>
          <main className={clsx("min-w-0 lg:block", section ? "block" : "hidden")}>
            <h2 className="mb-3 hidden font-display text-lg font-semibold text-white lg:block">{current.label}</h2>
            {content}
          </main>
        </div>
      </div>
      <Composer kind={composer} defaultTag="anuncio" onClose={() => setComposer(null)} onCreated={() => (setComposer(null), toast("Anúncio publicado e enviado aos membros."))} />
      {node}
    </CommunityContext.Provider>
  );
}
