import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";
import { AppAccentSync } from "@/components/app-theme";
import { appAccentVars } from "@/lib/profile-colors";
import { PublicHeader } from "@/components/public-header";
import { CreateCommunityDialog } from "@/components/create-community-dialog";
import { CommunityJoinButton } from "@/components/community-join-button";
import { COMMUNITY_CATEGORIES, categoryLabel } from "@/lib/community-categories";
import { Search, Users, Plus, BadgeCheck, Star } from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

type ViewFilter = "descobrir" | "minhas" | "criadas";

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
};

export default async function ComunidadesPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string; view?: string };
}) {
  const current = await getCurrentUser();
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim();
  const categoria = searchParams.categoria ?? "";
  const view: ViewFilter =
    current && (searchParams.view === "minhas" || searchParams.view === "criadas")
      ? (searchParams.view as ViewFilter)
      : "descobrir";

  let listQuery = supabase
    .from("Community")
    .select("id, name, slug, description, category, avatarUrl, coverUrl")
    .order("createdAt", { ascending: false });
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);
  if (categoria) listQuery = listQuery.eq("category", categoria);

  const [{ data: allCommunities }, { data: filtered }, { data: members }] = await Promise.all([
    supabase.from("Community").select("id, name, slug, description, category, avatarUrl, coverUrl"),
    listQuery,
    supabase.from("CommunityMember").select("communityId, userId, role"),
  ]);

  const countByCommunity = new Map<string, number>();
  (members ?? []).forEach((m) => countByCommunity.set(m.communityId, (countByCommunity.get(m.communityId) ?? 0) + 1));

  const myMemberships = current ? (members ?? []).filter((m) => m.userId === current.authId) : [];
  const myCommunityIds = new Set(myMemberships.map((m) => m.communityId));
  const myOwnedIds = new Set(myMemberships.filter((m) => m.role === "owner").map((m) => m.communityId));

  let list: CommunityRow[] = filtered ?? [];
  if (view === "minhas") list = list.filter((c) => myCommunityIds.has(c.id));
  if (view === "criadas") list = list.filter((c) => myOwnedIds.has(c.id));

  const featured = [...(allCommunities ?? [])]
    .sort((a, b) => (countByCommunity.get(b.id) ?? 0) - (countByCommunity.get(a.id) ?? 0))
    .slice(0, 4);

  const categoryCounts = new Map<string, number>();
  (allCommunities ?? []).forEach((c) => {
    if (c.category) categoryCounts.set(c.category, (categoryCounts.get(c.category) ?? 0) + 1);
  });

  const showDiscoveryExtras = view === "descobrir" && !q && !categoria;

  const filterLink = (v: ViewFilter, label: string, locked: boolean) => {
    const href = `/comunidades?view=${v}`;
    if (locked) {
      return (
        <Link
          href="/entrar"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/30 transition hover:bg-white/5"
        >
          {label}
        </Link>
      );
    }
    return (
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
          view === v ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
        )}
      >
        {label}
      </Link>
    );
  };

  const content = (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
        <aside className="mb-6 space-y-1 md:mb-0">
          {filterLink("descobrir", "Descobrir", false)}
          {filterLink("minhas", "Minhas comunidades", !current)}
          {filterLink("criadas", "Comunidades criadas", !current)}
          <div className="pt-2">
            {current ? (
              <CreateCommunityDialog userId={current.authId} />
            ) : (
              <Link
                href="/criar-conta"
                className="flex items-center gap-2 rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
              >
                <Plus className="h-4 w-4" /> Criar comunidade
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Comunidades</h1>
            <p className="text-sm text-white/50">Encontre seu lugar. Participe de comunidades com os mesmos interesses que você.</p>
          </div>

          <form action="/comunidades" method="GET" className="mb-6">
            {categoria && <input type="hidden" name="categoria" value={categoria} />}
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar comunidades..."
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>
          </form>

          {showDiscoveryExtras && (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80">Comunidades em destaque</h2>
              </div>
              {featured.length === 0 ? (
                <EmptyState text="Nenhuma comunidade criada ainda. Seja a primeira pessoa a criar uma!" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.map((c) => (
                    <CommunityCard
                      key={c.id}
                      community={c}
                      memberCount={countByCommunity.get(c.id) ?? 0}
                      current={current}
                      isMember={myCommunityIds.has(c.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {showDiscoveryExtras && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-white/80">Categorias</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {COMMUNITY_CATEGORIES.map(({ slug, label, icon: Icon }) => (
                  <Link
                    key={slug}
                    href={`/comunidades?categoria=${slug}`}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-space-card px-2 py-3 text-center transition hover:border-white/20"
                  >
                    <Icon className="h-5 w-5 text-orbit-cyan" />
                    <span className="text-[11px] text-white/70">{label}</span>
                    <span className="text-[10px] text-white/30">{categoryCounts.get(slug) ?? 0}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/80">
                {categoria ? categoryLabel(categoria) : view === "minhas" ? "Minhas comunidades" : view === "criadas" ? "Comunidades criadas" : "Todas as comunidades"}
              </h2>
              {categoria && (
                <Link href="/comunidades" className="text-xs text-white/40 hover:text-white/70">
                  Limpar filtro
                </Link>
              )}
            </div>

            {list.length === 0 ? (
              <EmptyState
                text={
                  q
                    ? `Nenhuma comunidade encontrada para "${q}".`
                    : view === "minhas"
                    ? "Você ainda não participa de nenhuma comunidade."
                    : view === "criadas"
                    ? "Você ainda não criou nenhuma comunidade."
                    : "Nenhuma comunidade por aqui ainda."
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    memberCount={countByCommunity.get(c.id) ?? 0}
                    current={current}
                    isMember={myCommunityIds.has(c.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  if (current) {
    const { profile } = current;
    const accent = appAccentVars(profile.profileColor);
    return (
      <div className="min-h-screen bg-space-bg bg-stars" style={accent as React.CSSProperties | undefined}>
        <AppAccentSync vars={accent} />
        <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
        <main className="min-h-screen pb-20 md:ml-64 md:pb-0">{content}</main>
        <MobileTabBar username={profile.username} />
      </div>
    );
  }

  const officialCommunity = (allCommunities ?? []).find((c) => c.slug === "orbitax-oficial") ?? null;
  const previewCommunities = (allCommunities ?? []).filter((c) => c.slug !== "orbitax-oficial").slice(0, 3);

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <section
        className="relative overflow-hidden bg-cover bg-no-repeat"
        style={{ backgroundImage: "url(/explore-hero.webp)", backgroundPosition: "right center" }}
      >
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: "linear-gradient(180deg, rgba(5,6,15,0.75) 0%, rgba(5,6,15,0.93) 60%, rgba(5,6,15,0.98) 100%)" }}
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ background: "linear-gradient(90deg, rgba(5,6,15,0.96) 0%, rgba(5,6,15,0.8) 35%, rgba(5,6,15,0.25) 65%, rgba(5,6,15,0.05) 85%)" }}
        />

        <div className="relative z-10">
          <PublicHeader authed={false} />

          <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:pb-16">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
              <span className="text-orbit-cyan">Comunidades</span>
            </p>
            <div className="max-w-xl">
              <h1 className="font-display text-3xl font-bold text-white sm:text-5xl">
                Encontre seu lugar no <span className="orbit-text-gradient">universo.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
                Participe de comunidades com os mesmos interesses que você.
              </p>
              <form action="/comunidades" method="GET" className="mt-6 max-w-2xl">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/90 px-4 py-3.5 backdrop-blur">
                  <Search className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar comunidades..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8">
          <aside className="mb-8 space-y-1.5 md:mb-0">
            {filterLink("descobrir", "Descobrir", false)}
            {filterLink("minhas", "Minhas comunidades", true)}
            {filterLink("criadas", "Comunidades criadas", true)}
            <div className="pt-3">
              <Link
                href="/criar-conta"
                className="flex items-center justify-center gap-2 rounded-full bg-orbit-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow"
              >
                <Plus className="h-4 w-4" /> Criar comunidade
              </Link>
            </div>
            <blockquote className="mt-8 rounded-2xl border border-white/10 bg-space-card/60 p-5 text-sm italic leading-relaxed text-white/40">
              &ldquo;Grandes conexões começam com interesses em comum.&rdquo;
            </blockquote>
          </aside>

          <div className="min-w-0">
            {!showDiscoveryExtras ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white/80">{categoria ? categoryLabel(categoria) : "Resultados"}</h2>
                  {categoria && (
                    <Link href="/comunidades" className="text-xs text-white/40 hover:text-white/70">
                      Limpar filtro
                    </Link>
                  )}
                </div>
                {list.length === 0 ? (
                  <EmptyState text={q ? `Nenhuma comunidade encontrada para "${q}".` : "Nenhuma comunidade por aqui ainda."} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((c) => (
                      <CommunityCard key={c.id} community={c} memberCount={countByCommunity.get(c.id) ?? 0} current={null} isMember={false} />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
            <section className="mb-12">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <h2 className="text-base font-semibold text-white/80">Comunidades em destaque</h2>
              </div>
              <p className="mb-5 text-sm text-white/40">Conheça comunidades incríveis e faça parte dessas conversas.</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {officialCommunity && (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-card transition hover:border-white/20">
                    <Link href={`/comunidades/${officialCommunity.slug}`} className="block">
                      <div
                        className="h-36 bg-cover bg-center"
                        style={{ backgroundImage: `url(${officialCommunity.coverUrl ?? "/hero-earth.webp"})` }}
                      />
                      <div className="p-5">
                        <div className="mb-2 flex items-center gap-1.5">
                          <span className="rounded-full bg-orbit-gradient px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white">Oficial</span>
                        </div>
                        <h3 className="flex items-center gap-1.5 truncate text-lg font-semibold text-white hover:underline">
                          {officialCommunity.name}
                          <BadgeCheck className="h-4 w-4 shrink-0 text-orbit-cyan" />
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                          <Users className="h-3.5 w-3.5" /> 1 membro
                        </p>
                        <p className="mb-4 mt-3 line-clamp-2 text-sm text-white/60">{officialCommunity.description}</p>
                        <Link
                          href="/entrar"
                          className="inline-flex w-full items-center justify-center rounded-full bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow"
                        >
                          Entrar na comunidade
                        </Link>
                      </div>
                    </Link>
                  </div>
                )}
                {previewCommunities.map((c) => (
                  <div key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-space-card transition hover:border-white/20">
                    <div
                      className={clsx(
                        "h-36 bg-cover bg-center",
                        !c.coverUrl && "bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40"
                      )}
                      style={c.coverUrl ? { backgroundImage: `url(${c.coverUrl})` } : undefined}
                    />
                    <div className="p-5">
                      {c.category && (
                        <span className="mb-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                          {categoryLabel(c.category)}
                        </span>
                      )}
                      <h3 className="truncate text-lg font-semibold text-white">{c.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                        <Users className="h-3.5 w-3.5" /> 0 membros
                      </p>
                      {c.description && <p className="mb-4 mt-3 line-clamp-2 text-sm text-white/60">{c.description}</p>}
                      <button
                        disabled
                        className="w-full cursor-not-allowed rounded-full border border-white/10 py-2.5 text-sm font-semibold text-white/30"
                      >
                        Em breve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="mb-4 text-base font-semibold text-white/80">Explore por categorias</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {COMMUNITY_CATEGORIES.map(({ slug, label, icon: Icon }) => (
                  <Link
                    key={slug}
                    href={`/comunidades?categoria=${slug}`}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-space-card px-3 py-4 text-center transition hover:border-white/20"
                  >
                    <Icon className="h-6 w-6 text-orbit-cyan" />
                    <span className="text-xs text-white/70">{label}</span>
                  </Link>
                ))}
              </div>
            </section>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-card">
              <div className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                <div>
                  <h3 className="mb-2 text-xl font-bold text-white">Não encontrou o seu espaço?</h3>
                  <p className="mb-4 max-w-md text-sm text-white/60">
                    Crie uma comunidade e reúna pessoas que compartilham os mesmos interesses.
                  </p>
                  <Link
                    href="/criar-conta"
                    className="inline-flex items-center gap-2 rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                  >
                    Criar comunidade →
                  </Link>
                </div>
                <p className="shrink-0 text-right text-xs font-semibold uppercase tracking-wide text-white/30">
                  Ideias
                  <br />
                  Pessoas
                  <br />
                  Conexões
                  <br />
                  Sempre.
                </p>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </main>
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

function CommunityCard({
  community,
  memberCount,
  current,
  isMember,
}: {
  community: CommunityRow;
  memberCount: number;
  current: { authId: string } | null;
  isMember: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card p-4">
      <Link href={`/comunidades/${community.slug}`} className="mb-2 block">
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
        <h3 className="truncate text-sm font-semibold text-white hover:underline">{community.name}</h3>
        <p className="flex items-center gap-1 text-xs text-white/40">
          <Users className="h-3 w-3" /> {memberCount} membros
        </p>
      </Link>
      {community.description && <p className="mb-3 line-clamp-2 text-xs text-white/60">{community.description}</p>}
      {current ? (
        <CommunityJoinButton communityId={community.id} userId={current.authId} initiallyMember={isMember} />
      ) : (
        <Link
          href="/entrar"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/15 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/5"
        >
          Entrar para participar
        </Link>
      )}
    </div>
  );
}
