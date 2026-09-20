import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";
import { PublicHeader } from "@/components/public-header";
import { CreateCommunityDialog } from "@/components/create-community-dialog";
import { CommunityJoinButton } from "@/components/community-join-button";
import { COMMUNITY_CATEGORIES, categoryLabel } from "@/lib/community-categories";
import { Search, Users, Plus } from "lucide-react";
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
    .select("id, name, slug, description, category, avatarUrl")
    .order("createdAt", { ascending: false });
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);
  if (categoria) listQuery = listQuery.eq("category", categoria);

  const [{ data: allCommunities }, { data: filtered }, { data: members }] = await Promise.all([
    supabase.from("Community").select("id, name, slug, description, category, avatarUrl"),
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
    return (
      <div className="min-h-screen bg-space-bg bg-stars">
        <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
        <main className="min-h-screen pb-20 md:ml-64 md:pb-0">{content}</main>
        <MobileTabBar username={profile.username} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />
      <PublicHeader authed={false} />
      {content}
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
        <div className="mb-3 h-16 rounded-xl bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40" />
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
