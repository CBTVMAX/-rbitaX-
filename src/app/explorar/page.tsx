import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { FollowButton } from "@/components/follow-button";
import { NotifyMeButton } from "@/components/notify-me-button";
import { Avatar } from "@/components/post-card";
import { COMMUNITY_CATEGORIES, categoryLabel } from "@/lib/community-categories";
import { timeAgo } from "@/lib/format";
import {
  Search,
  Users,
  Music2,
  BadgeCheck,
  Heart,
  MessageCircle,
  SlidersHorizontal,
  Newspaper,
  Compass,
  Send,
  Star,
  Sparkles,
  ImagePlus,
  ListMusic,
  Headphones,
  Mic2,
  Guitar,
  Waves,
  Radio,
  Disc3,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type Tab = "para-voce" | "pessoas" | "publicacoes" | "comunidades" | "musica";

const TABS: { id: Tab; label: string }[] = [
  { id: "para-voce", label: "Para você" },
  { id: "pessoas", label: "Pessoas" },
  { id: "publicacoes", label: "Publicações" },
  { id: "comunidades", label: "Comunidades" },
  { id: "musica", label: "Música" },
];

const GENRES: { label: string; icon: LucideIcon }[] = [
  { label: "Pop", icon: Mic2 },
  { label: "Rock", icon: Guitar },
  { label: "Eletrônica", icon: Waves },
  { label: "Hip Hop", icon: Radio },
  { label: "K-pop", icon: Heart },
  { label: "Sertanejo", icon: Music2 },
  { label: "Rap", icon: Mic2 },
  { label: "Indie", icon: Disc3 },
  { label: "Mais gêneros", icon: MoreHorizontal },
];

type Profile = { id: string; name: string; username: string; avatarUrl: string | null; bio: string | null; isVerified: boolean };
type PublicPost = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  commentCount: number;
};
type CommunityCard = { id: string; name: string; slug: string; description: string | null; category: string | null; avatarUrl: string | null; coverUrl: string | null; memberCount: number };

const HERO_ILLUSTRATION: Partial<Record<Tab, string>> = {
  "para-voce": "/explore-hero.webp",
  pessoas: "/explore-hero.webp",
  comunidades: "/explore-hero.webp",
  musica: "/explore-hero.webp",
};

const CATEGORY_PHOTOS: Partial<Record<string, string>> = {
  tecnologia: "/cat-tecnologia.webp",
  games: "/cat-games.webp",
  musica: "/cat-musica.webp",
  "arte-design": "/cat-arte-design.webp",
  "cinema-series": "/cat-cinema-series.webp",
};

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const q = (searchParams.q ?? "").trim();
  const tab: Tab = (["para-voce", "pessoas", "publicacoes", "comunidades", "musica"] as Tab[]).includes(
    searchParams.tab as Tab
  )
    ? (searchParams.tab as Tab)
    : "para-voce";

  let profiles: Profile[] = [];
  let posts: PublicPost[] = [];
  let communities: CommunityCard[] = [];
  let categoryCounts: { slug: string; label: string; icon: (typeof COMMUNITY_CATEGORIES)[number]["icon"]; count: number }[] = [];
  let officialCommunity: CommunityCard | null = null;

  if (tab === "para-voce") {
    const [{ data: p }, { data: allComms }, { data: members }, { data: pubPosts }] = await Promise.all([
      supabase.rpc("discoverable_profiles", { limit_count: 6 }),
      supabase.from("Community").select("id, name, slug, description, category, avatarUrl, coverUrl"),
      supabase.from("CommunityMember").select("communityId"),
      supabase.rpc("public_posts", { limit_count: 3 }),
    ]);
    profiles = (p as Profile[]) ?? [];
    posts = (pubPosts as PublicPost[]) ?? [];

    const countByCommunity = new Map<string, number>();
    (members ?? []).forEach((m) => countByCommunity.set(m.communityId, (countByCommunity.get(m.communityId) ?? 0) + 1));
    communities = (allComms ?? [])
      .map((c) => ({ ...c, memberCount: countByCommunity.get(c.id) ?? 0 }))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 6);

    const byCategory = new Map<string, number>();
    (allComms ?? []).forEach((c) => {
      if (c.category) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
    });
    categoryCounts = COMMUNITY_CATEGORIES.filter((c) => (byCategory.get(c.slug) ?? 0) > 0)
      .map((c) => ({ ...c, count: byCategory.get(c.slug) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  } else if (tab === "comunidades") {
    const [{ data: official }, { data: officialMembers }] = await Promise.all([
      supabase.from("Community").select("id, name, slug, description, category, avatarUrl, coverUrl").eq("slug", "orbitax-oficial").maybeSingle(),
      supabase.from("CommunityMember").select("userId").eq("communityId", "orbitax-oficial"),
    ]);
    if (official) {
      officialCommunity = { ...official, memberCount: officialMembers?.length ?? 0 };
    }
  }

  const tabHref = (id: Tab) => `/explorar?tab=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const HERO: Record<Tab, { title: React.ReactNode; subtitle: string; placeholder: string }> = {
    "para-voce": {
      title: "Explorar",
      subtitle: "Descubra pessoas, publicações, comunidades e interesses dentro do ÓrbitaX.",
      placeholder: "Buscar pessoas, publicações, comunidades, músicas...",
    },
    pessoas: {
      title: (
        <>
          Explore o seu <span className="orbit-text-gradient">universo</span>
        </>
      ),
      subtitle: "Descubra pessoas, publicações, comunidades e interesses dentro do ÓrbitaX.",
      placeholder: "Buscar pessoas, publicações, comunidades, músicas...",
    },
    publicacoes: {
      title: (
        <>
          Explore o seu <span className="orbit-text-gradient">universo</span>
        </>
      ),
      subtitle: "Descubra pessoas, publicações, comunidades e interesses dentro do ÓrbitaX.",
      placeholder: "Buscar pessoas, publicações, comunidades, músicas...",
    },
    comunidades: {
      title: (
        <>
          Encontre seu lugar no <span className="orbit-text-gradient">universo.</span>
        </>
      ),
      subtitle: "Participe de comunidades sobre os assuntos que fazem sentido para você.",
      placeholder: "Buscar comunidades...",
    },
    musica: {
      title: (
        <>
          Descubra <span className="orbit-text-gradient">novos sons</span>
        </>
      ),
      subtitle: "Encontre músicas, artistas e playlists compartilhadas pela comunidade do ÓrbitaX.",
      placeholder: "Buscar músicas, artistas ou playlists...",
    },
  };

  const hero = HERO[tab];

  const heroImg = HERO_ILLUSTRATION[tab];

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <section
        className="relative overflow-hidden bg-cover bg-no-repeat"
        style={heroImg ? { backgroundImage: `url(${heroImg})`, backgroundPosition: "right center" } : undefined}
      >
        {heroImg && (
          <>
            <div
              className="absolute inset-0 lg:hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,6,15,0.75) 0%, rgba(5,6,15,0.93) 60%, rgba(5,6,15,0.98) 100%)",
              }}
            />
            <div
              className="absolute inset-0 hidden lg:block"
              style={{
                background:
                  "linear-gradient(90deg, rgba(5,6,15,0.96) 0%, rgba(5,6,15,0.8) 35%, rgba(5,6,15,0.25) 65%, rgba(5,6,15,0.05) 85%)",
              }}
            />
          </>
        )}

        <div className="relative z-10">
          <PublicHeader authed={!!user} />

          <div className={clsx("mx-auto max-w-6xl px-4 pb-6 sm:px-6", heroImg ? "pt-2" : "pt-4")}>
            {tab !== "para-voce" && (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
                Explorar <span className="text-white/20">›</span>{" "}
                <span className="text-orbit-cyan">{TABS.find((t) => t.id === tab)?.label}</span>
              </p>
            )}

            {tab === "publicacoes" && (
              <p className="pointer-events-none mb-3 hidden max-w-[16rem] text-right text-sm italic text-white/30 lg:float-right lg:block">
                &ldquo;Grandes histórias começam com uma primeira publicação.&rdquo;
              </p>
            )}

            <div className={clsx(tab === "publicacoes" ? "text-center" : "max-w-xl text-left")}>
              {(tab === "para-voce" || tab === "pessoas") && (
                <div className="mb-6 hidden text-left text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white/30 sm:block">
                  <span className="border-l-2 border-orbit-cyan pl-3">
                    Pessoas · Ideias · Comunidades
                    <br />
                    Música · Um só lugar
                  </span>
                </div>
              )}

              <h1 className={clsx("font-display text-3xl font-bold text-white sm:text-4xl", tab === "publicacoes" && "mx-auto")}>
                {hero.title}
              </h1>
              <p className={clsx("mt-2 max-w-xl text-sm text-white/60 sm:text-base", tab === "publicacoes" && "mx-auto")}>
                {hero.subtitle}
              </p>

              <form action="/explorar" method="GET" className={clsx("mt-6 max-w-2xl", tab === "publicacoes" && "mx-auto")}>
                <input type="hidden" name="tab" value={tab} />
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/90 px-4 py-3 backdrop-blur">
                  <Search className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder={hero.placeholder}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>

              <div className={clsx("mt-5 flex flex-wrap items-center gap-2", tab === "publicacoes" && "justify-center")}>
                {TABS.map(({ id, label }) => (
                  <Link
                    key={id}
                    href={tabHref(id)}
                    className={clsx(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition",
                      tab === id ? "bg-orbit-gradient text-white shadow-glow" : "border border-white/10 text-white/60 hover:bg-white/5 hover:bg-space-card/60"
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {tab === "para-voce" && (
          <div className="space-y-12">
            <SectionHeader emoji="🔥" title="Em alta no ÓrbitaX" subtitle="Veja os assuntos que estão movimentando a comunidade." seeAllHref={tabHref("comunidades")} />
            {categoryCounts.length === 0 ? (
              <EmptyState text="Ainda não há categorias com atividade. Seja a primeira comunidade!" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {categoryCounts.map(({ slug, label, icon: Icon, count }) => {
                  const photo = CATEGORY_PHOTOS[slug];
                  return (
                    <Link
                      key={slug}
                      href={`/comunidades?categoria=${slug}`}
                      className={clsx(
                        "relative overflow-hidden rounded-2xl border border-white/10 p-4 transition hover:border-white/20",
                        !photo && "bg-space-card"
                      )}
                      style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      {photo && <div className="absolute inset-0 bg-gradient-to-t from-space-bg via-space-bg/70 to-transparent" />}
                      <div className="relative">
                        <Icon className="mb-3 h-5 w-5 text-orbit-cyan" />
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <p className="text-xs text-white/60">{count} {count === 1 ? "comunidade" : "comunidades"}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div>
              <SectionHeader emoji="👥" title="Pessoas para conhecer" subtitle="Encontre pessoas incríveis e expanda seu universo." seeAllHref={tabHref("pessoas")} />
              {profiles.length === 0 ? (
                <EmptyState text="Ainda não há pessoas para descobrir por aqui. Crie sua conta e seja uma das primeiras!" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {profiles.map((p) => (
                    <ProfileCard key={p.id} profile={p} currentUserId={user?.id ?? null} />
                  ))}
                  {!user && (
                    <Link
                      href="/criar-conta"
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-space-card/50 p-4 text-center transition hover:border-white/30"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient text-white">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-white">Venha se conectar!</span>
                      <span className="text-xs text-white/50">Crie sua conta e faça parte do ÓrbitaX.</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div>
              <SectionHeader emoji="🧭" title="Descubra comunidades" subtitle="Participe de comunidades e encontre pessoas com os mesmos interesses." seeAllHref={tabHref("comunidades")} />
              {communities.length === 0 ? (
                <EmptyState text="Nenhuma comunidade criada ainda. Seja a primeira pessoa a criar uma!" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {communities.map((c) => (
                    <CommunityTile key={c.id} community={c} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeader emoji="✨" title="Publicações em destaque" subtitle="Veja o que a comunidade está compartilhando." seeAllHref={tabHref("publicacoes")} />
              {posts.length === 0 ? (
                <EmptyState text="Ainda não há publicações públicas por aqui." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {posts.map((post) => (
                    <PostTile key={post.id} post={post} />
                  ))}
                  <Link
                    href="/criar-conta"
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-space-card/50 p-4 text-center transition hover:border-white/30"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient text-lg text-white">+</span>
                    <span className="text-sm font-semibold text-white">Faça parte dessa conversa!</span>
                    <span className="text-xs text-white/50">Crie sua conta e comece a compartilhar.</span>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <SectionHeader emoji="🎵" title="Descubra músicas" subtitle="Explore sons e artistas da comunidade." seeAllHref={tabHref("musica")} />
              <EmptyState text="Em breve: descubra músicas e artistas da comunidade por aqui." />
            </div>
          </div>
        )}

        {tab === "pessoas" && (
          <div className="space-y-10">
            <ComingSoonCard
              icon={Users}
              eyebrow="Pessoas no ÓrbitaX"
              heading={
                <>
                  Ainda estamos formando <span className="orbit-text-gradient">nossa comunidade.</span>
                </>
              }
              text="O ÓrbitaX está começando agora. Seja uma das primeiras pessoas a entrar e faça parte desse universo."
              illustration="/explore-card-pessoas.webp"
              illustrationSide="right"
            />

            <div>
              <h2 className="mb-4 border-l-2 border-orbit-cyan pl-3 text-sm font-semibold text-white/80">O que você pode fazer</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <FeatureCard icon={Sparkles} title="Seja um dos primeiros exploradores" text="Entre agora e faça parte da nossa comunidade desde o início." />
                <FeatureCard icon={Search} title="Descubra novas conexões" text="À medida que a comunidade crescer, você poderá encontrar pessoas com os mesmos interesses que você." />
                <FeatureCard icon={Send} title="Convide seus amigos" text="Traga pessoas para o ÓrbitaX e ajude a construir um universo ainda mais incrível." />
              </div>
            </div>

            <BottomBanner
              icon={Star}
              title="Em breve, você verá pessoas incríveis por aqui!"
              text="Estamos preparando uma experiência única de descoberta de pessoas. Fique ligado!"
              action={<NotifyMeButton source="explorar-pessoas" />}
            />
          </div>
        )}

        {tab === "publicacoes" && (
          <div className="space-y-10">
            <ComingSoonCard
              icon={Newspaper}
              eyebrow="Publicações no ÓrbitaX"
              heading={
                <>
                  Ainda não há <span className="orbit-text-gradient">publicações</span> por aqui.
                </>
              }
              text="Seja uma das primeiras pessoas a compartilhar algo com a comunidade."
              illustration="/explore-card-publicacoes.webp"
              illustrationSide="left"
              quote={"Campartilhe suas ideias.\nConecte mundos.\nCrie histórias."}
              script
            />

            <div>
              <h2 className="mb-4 border-l-2 border-orbit-cyan pl-3 text-sm font-semibold text-white/80">O que você poderá compartilhar</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <FeatureCard icon={ImagePlus} title="Compartilhe seu primeiro momento" text="Publique textos, fotos, ideias e momentos." />
                <FeatureCard icon={Users} title="Encontre seu espaço" text="Participe de comunidades e converse sobre os assuntos que fazem sentido para você." />
                <FeatureCard icon={Star} title="Faça parte do começo" text="Ajude a construir o universo do ÓrbitaX desde o início." />
              </div>
            </div>

            <BottomBanner
              icon={Compass}
              title="Quando a comunidade começar a crescer, as publicações aparecerão aqui."
              text="Novas ideias, conversas e histórias de todo o universo ÓrbitaX."
              tag="Um universo de possibilidades"
            />
          </div>
        )}

        {tab === "comunidades" && (
          <div className="space-y-10">
            <div>
              <SectionHeader emoji="⭐" title="Comunidades em destaque" subtitle="Conheça comunidades incríveis e faça parte dessas conversas." seeAllHref="/comunidades" hideSeeAll />
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                {officialCommunity ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-card">
                    <div className="h-24 bg-[url('/hero-earth.webp')] bg-cover bg-center" />
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                      <div className="-mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-space-card bg-space-bg shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={officialCommunity.avatarUrl ?? "/orbit-mark.webp"} alt={officialCommunity.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="flex items-center gap-1 text-lg font-bold text-white">
                            {officialCommunity.name}
                            <BadgeCheck className="h-4 w-4 text-orbit-cyan" />
                          </h3>
                          <span className="rounded-full bg-orbit-gradient px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white">Oficial</span>
                        </div>
                        <p className="mt-1 text-sm text-white/60">{officialCommunity.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {officialCommunity.memberCount} {officialCommunity.memberCount === 1 ? "membro" : "membros"}
                          </span>
                          {officialCommunity.category && <span>{categoryLabel(officialCommunity.category)}</span>}
                          <span>Rede Social</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/comunidades/${officialCommunity.slug}`}
                            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/5"
                          >
                            Ver comunidade
                          </Link>
                          {user ? (
                            <Link href={`/comunidades/${officialCommunity.slug}`} className="rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-glow">
                              Participar
                            </Link>
                          ) : (
                            <Link href="/entrar" className="rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-glow">
                              Participar
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState text="Nenhuma comunidade em destaque no momento." />
                )}

                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-space-card/50 p-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-orbit-cyan">
                    <Users className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-white">Muitas outras comunidades estão por vir!</p>
                  <p className="text-xs text-white/50">À medida que mais pessoas entrarem, novas comunidades aparecerão aqui.</p>
                  <Link href="/comunidades" className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/5">
                    Explorar categorias
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <SectionHeader emoji="🧩" title="Explore outras comunidades" subtitle="Descubra conteúdos, compartilhe interesses e encontre seu lugar." seeAllHref="/comunidades" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {COMMUNITY_CATEGORIES.map(({ slug, label, icon: Icon }) => (
                  <Link
                    key={slug}
                    href={`/comunidades?categoria=${slug}`}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-space-card px-2 py-4 text-center transition hover:border-white/20"
                  >
                    <Icon className="h-5 w-5 text-orbit-cyan" />
                    <span className="text-[11px] text-white/70">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-card">
              <div className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orbit-purple">
                    <Plus className="h-3.5 w-3.5" /> Crie sua própria comunidade
                  </p>
                  <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">
                    Não encontrou o <span className="orbit-text-gradient">seu espaço?</span>
                  </h3>
                  <p className="mb-4 max-w-md text-sm text-white/60">
                    Crie uma comunidade, reúna pessoas com os mesmos interesses e ajude a expandir o universo do ÓrbitaX.
                  </p>
                  <Link
                    href={user ? "/comunidades" : "/criar-conta"}
                    className="inline-flex items-center gap-2 rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                  >
                    Criar comunidade →
                  </Link>
                </div>
                <img src="/explore-banner-comunidades.webp" alt="" className="hidden h-32 w-auto rounded-xl object-cover sm:block" />
              </div>
            </div>
          </div>
        )}

        {tab === "musica" && (
          <div className="space-y-10">
            <ComingSoonCard
              icon={Music2}
              eyebrow="Música no ÓrbitaX"
              heading={
                <>
                  O universo musical <span className="orbit-text-gradient">está começando.</span>
                </>
              }
              text="Em breve você poderá descobrir músicas, compartilhar seus sons favoritos, criar playlists e se conectar com outras pessoas através da música."
              illustration="/explore-card-musica.webp"
              illustrationSide="right"
            />

            <div>
              <h2 className="mb-4 border-l-2 border-orbit-cyan pl-3 text-sm font-semibold text-white/80">O que você poderá fazer</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FeatureCard icon={Music2} title="Compartilhar músicas" text="Compartilhe músicas que você gosta com seus amigos e comunidades." />
                <FeatureCard icon={ListMusic} title="Criar playlists" text="Monte playlists para diferentes momentos e interesses." />
                <FeatureCard icon={Headphones} title="Descobrir novos sons" text="Encontre músicas e artistas compartilhados pela comunidade." />
                <FeatureCard icon={Users} title="Música nas comunidades" text="Compartilhe recomendações musicais e participe de conversas sobre seus estilos favoritos." />
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="border-l-2 border-orbit-cyan pl-3 text-sm font-semibold text-white/80">Explore gêneros (em breve)</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                {GENRES.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-space-card px-2 py-4 text-center opacity-70">
                    <Icon className="h-5 w-5 text-orbit-pink" />
                    <span className="text-[11px] text-white/70">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <BottomBanner
              icon={Waves}
              title="Em breve, um universo musical ainda maior."
              text="Estamos preparando uma experiência incrível para você descobrir, compartilhar e viver a música no ÓrbitaX."
              tag="Música sem fronteiras"
            />
          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeader({
  emoji,
  title,
  subtitle,
  seeAllHref,
  hideSeeAll,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  seeAllHref: string;
  hideSeeAll?: boolean;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span>{emoji}</span> {title}
        </h2>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
      {!hideSeeAll && (
        <Link href={seeAllHref} className="shrink-0 text-xs font-medium text-white/50 transition hover:text-white">
          Ver todos →
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
      {text}
    </div>
  );
}

function ComingSoonCard({
  icon: Icon,
  eyebrow,
  heading,
  text,
  illustration,
  illustrationSide,
  quote,
  script,
}: {
  icon: LucideIcon;
  eyebrow: string;
  heading: React.ReactNode;
  text: string;
  illustration: string;
  illustrationSide: "left" | "right";
  quote?: string;
  script?: boolean;
}) {
  const content = (
    <div className="flex min-w-0 flex-1 flex-col justify-center p-6 sm:p-10">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
        <Icon className="h-4 w-4 text-orbit-cyan" /> {eyebrow}
      </p>
      <h2 className="mb-3 text-2xl font-bold leading-tight text-white sm:text-3xl">{heading}</h2>
      <p className="mb-6 max-w-md text-sm text-white/60">{text}</p>
      <Link
        href="/criar-conta"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
      >
        Criar minha conta →
      </Link>
    </div>
  );

  const image = (
    <div className="relative min-h-[220px] flex-1 sm:min-h-[320px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={illustration} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {quote && (
        <p
          className={clsx(
            "absolute right-4 top-4 max-w-[11rem] text-right leading-snug text-white/80",
            script ? "font-script text-xl" : "text-xs uppercase tracking-wide"
          )}
        >
          {quote.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-card sm:flex-row">
      {illustrationSide === "left" ? (
        <>
          {image}
          {content}
        </>
      ) : (
        <>
          {content}
          {image}
        </>
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient">
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs leading-relaxed text-white/50">{text}</p>
    </div>
  );
}

function BottomBanner({
  icon: Icon,
  title,
  text,
  action,
  tag,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
  tag?: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-space-card p-6 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-orbit-pink">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/50">{text}</p>
        </div>
      </div>
      {action}
      {tag && <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/30">{tag}</span>}
    </div>
  );
}

function ProfileCard({ profile, currentUserId }: { profile: Profile; currentUserId: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card p-4 text-center transition hover:border-white/20">
      <Link href={`/perfil/${profile.username}`} className="mb-3 flex justify-center">
        <Avatar name={profile.name} url={profile.avatarUrl} size={56} />
      </Link>
      <Link href={`/perfil/${profile.username}`} className="flex items-center justify-center gap-1 truncate text-sm font-semibold text-white hover:underline">
        {profile.name}
        {profile.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
      </Link>
      <p className="truncate text-xs text-white/40">@{profile.username}</p>
      {profile.bio && <p className="mt-1 line-clamp-2 text-xs text-white/50">{profile.bio}</p>}
      <div className="mt-3">
        <FollowButton targetUserId={profile.id} currentUserId={currentUserId} className="w-full" />
      </div>
    </div>
  );
}

function CommunityTile({ community }: { community: CommunityCard }) {
  return (
    <Link
      href={`/comunidades/${community.slug}`}
      className="block rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20"
    >
      <div
        className={clsx(
          "mb-3 h-16 rounded-xl bg-cover bg-center",
          !community.coverUrl && "bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40"
        )}
        style={community.coverUrl ? { backgroundImage: `url(${community.coverUrl})` } : undefined}
      />
      {community.category && (
        <span className="mb-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
          {categoryLabel(community.category)}
        </span>
      )}
      <h3 className="truncate text-sm font-semibold text-white">{community.name}</h3>
      <p className="mb-1 flex items-center gap-1 text-xs text-white/40">
        <Users className="h-3 w-3" /> {community.memberCount} membros
      </p>
      {community.description && <p className="line-clamp-2 text-xs text-white/50">{community.description}</p>}
    </Link>
  );
}

function PostTile({ post }: { post: PublicPost }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20">
      <Link href={`/perfil/${post.authorUsername}`} className="mb-2 flex items-center gap-2">
        <Avatar name={post.authorName} url={post.authorAvatarUrl} size={28} />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{post.authorName}</p>
          <p className="truncate text-[11px] text-white/40">
            @{post.authorUsername} · {timeAgo(post.createdAt)}
          </p>
        </div>
      </Link>
      <p className="mb-3 line-clamp-4 text-sm text-white/70">{post.content}</p>
      <div className="flex items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" /> {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
        </span>
      </div>
    </div>
  );
}
