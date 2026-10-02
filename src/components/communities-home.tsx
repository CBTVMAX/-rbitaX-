import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Search, Users } from "lucide-react";
import { CommunityJoinButton } from "@/components/community-join-button";
import { CreateCommunityDialog } from "@/components/create-community-dialog";
import { RecentCommunities } from "@/components/recent-communities";
import { categoryLabel, COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import { OfficialBadge } from "@/components/community/ui";
import { CommunityAvatar } from "@/components/community-avatar";

export type HomeCommunity = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  isOfficial: boolean;
  memberCount: number;
};
export type FriendFace = { id: string; name: string; avatarUrl: string | null };
export type Suggestion = HomeCommunity & { friends: FriendFace[]; friendCount: number; pending: boolean };

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const card = "ox-card rounded-2xl border border-white/10 bg-space-surface";

function FaceStack({ faces }: { faces: FriendFace[] }) {
  return (
    <span className="flex -space-x-2">
      {faces.slice(0, 2).map((f) => (
        <span key={f.id} className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-black/40 bg-space-card text-[10px] font-bold text-snow">
          {f.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            f.name.slice(0, 1).toUpperCase()
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * Início das Comunidades, como no VK: as que você assina no topo, as visitadas recentemente,
 * e embaixo sugestões — primeiro as que seus amigos participam, depois as mais populares.
 */
export function CommunitiesHome({
  userId,
  mine,
  ownedCount,
  suggestions,
  popular,
}: {
  userId: string;
  mine: (HomeCommunity & { role: string })[];
  ownedCount: number;
  suggestions: Suggestion[];
  popular: (HomeCommunity & { pending: boolean })[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 md:py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-3 md:space-y-4">
        <div className="flex items-center gap-2">
          <form action="/comunidades" method="GET" className="min-w-0 flex-1">
            <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-space-surface px-4">
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <input name="q" placeholder="Pesquisar comunidades" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            </label>
          </form>
          <div className="shrink-0 lg:hidden [&>button]:h-11 [&>button]:px-4">
            <CreateCommunityDialog userId={userId} label="Criar" />
          </div>
        </div>

        {/* Minhas assinaturas */}
        <section className={clsx(card, "p-4")}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-white">
              Minhas comunidades <span className="font-normal text-white/45">{mine.length}</span>
            </h2>
            {mine.length > 0 && (
              <Link href="/comunidades?view=minhas" aria-label="Ver todas" className="flex h-8 items-center gap-1 rounded-full bg-white/[0.06] px-3 text-xs font-medium text-white/75 transition hover:bg-white/10">
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-white/50">Você ainda não participa de nenhuma comunidade. Veja as sugestões abaixo.</p>
          ) : (
            <>
              {/* Celular: grade de fotos redondas, como no app do VK. */}
              <div className="grid grid-cols-4 gap-x-2 gap-y-3 md:hidden">
                {mine.slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/comunidades/${c.slug}`} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <CommunityAvatar name={c.name} url={c.avatarUrl} className="h-[68px] w-[68px] text-xl" />
                    <span className="w-full truncate text-[12px] text-white/80">{c.name}</span>
                  </Link>
                ))}
              </div>
              {/* Computador: lista em duas colunas com a categoria, como no VK. */}
              <div className="hidden gap-x-4 md:grid md:grid-cols-2">
                {mine.slice(0, 10).map((c) => (
                  <Link key={c.id} href={`/comunidades/${c.slug}`} className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]">
                    <CommunityAvatar name={c.name} url={c.avatarUrl} className="h-12 w-12 text-base" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                        <span className="truncate">{c.name}</span>
                        {c.isOfficial && <OfficialBadge />}
                      </span>
                      <span className="block truncate text-xs text-white/45">
                        {c.role === "owner" ? "Você criou" : c.role === "admin" || c.role === "moderator" ? "Você administra" : categoryLabel(c.category) || "Comunidade"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              {ownedCount > 0 && (
                <Link href="/comunidades?view=criadas" className="mt-3 hidden text-xs font-medium text-orbit-blue hover:underline md:inline-block">
                  Administradas por você · {ownedCount}
                </Link>
              )}
            </>
          )}
        </section>

        <RecentCommunities />

        {/* Para você */}
        {suggestions.length > 0 && (
          <section className={clsx(card, "p-4")}>
            <h2 className="mb-3 text-[17px] font-semibold text-white">Para você</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {suggestions.map((c) => (
                <article key={c.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <Link href={`/comunidades/${c.slug}`} className="relative block aspect-square overflow-hidden bg-space-card">
                    {c.avatarUrl || c.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(c.avatarUrl ?? c.coverUrl)!} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-orbit-gradient text-4xl font-bold text-snow">{c.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-black/55 py-1 pl-1 pr-2.5 text-[12px] font-medium text-snow backdrop-blur">
                      {c.friendCount > 0 ? (
                        <>
                          <FaceStack faces={c.friends} />
                          <span className="truncate">
                            {c.friendCount} {c.friendCount === 1 ? "amigo" : "amigos"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users className="ml-1 h-3.5 w-3.5" />
                          <span className="truncate">
                            {compact.format(c.memberCount)} {c.memberCount === 1 ? "membro" : "membros"}
                          </span>
                        </>
                      )}
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <Link href={`/comunidades/${c.slug}`} className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white hover:underline">
                      <span className="truncate">{c.name}</span>
                      {c.isOfficial && <OfficialBadge />}
                    </Link>
                    <p className="mb-2.5 truncate text-xs text-white/45">{categoryLabel(c.category) || "Comunidade"}</p>
                    <div className="mt-auto [&>button]:w-full">
                      <CommunityJoinButton communityId={c.id} userId={userId} initiallyMember={false} isPrivate={c.isPrivate} request={c.pending ? "pending" : null} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={clsx(card, "p-4")}>
          <h2 className="mb-3 text-[17px] font-semibold text-white">Categorias</h2>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_CATEGORIES.map(({ slug, label, icon: Icon }) => (
              <Link key={slug} href={`/comunidades?categoria=${slug}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:border-white/25 hover:text-white">
                <Icon className="h-3.5 w-3.5 text-orbit-cyan" /> {label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Coluna da direita no computador: criar, atalhos e populares. */}
      <aside className="hidden space-y-4 lg:block">
        <div className={clsx(card, "space-y-1 p-3")}>
          <div className="mb-2 [&>button]:w-full [&>button]:justify-center">
            <CreateCommunityDialog userId={userId} />
          </div>
          <Link href="/comunidades" className="block rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-white">
            Início
          </Link>
          <Link href="/comunidades?view=minhas" className="block rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.04] hover:text-white">
            Minhas comunidades
          </Link>
          <Link href="/comunidades?view=criadas" className="block rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.04] hover:text-white">
            Administradas por mim
          </Link>
        </div>
        {popular.length > 0 && (
          <div className={clsx(card, "p-4")}>
            <h2 className="mb-2 text-sm font-semibold text-white">Populares</h2>
            <div className="space-y-1">
              {popular.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <Link href={`/comunidades/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CommunityAvatar name={c.name} url={c.avatarUrl} className="h-11 w-11 text-sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white hover:underline">{c.name}</span>
                      <span className="block text-xs text-white/45">
                        {compact.format(c.memberCount)} {c.memberCount === 1 ? "membro" : "membros"}
                      </span>
                    </span>
                  </Link>
                  <CommunityJoinButton communityId={c.id} userId={userId} initiallyMember={false} isPrivate={c.isPrivate} request={c.pending ? "pending" : null} />
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
