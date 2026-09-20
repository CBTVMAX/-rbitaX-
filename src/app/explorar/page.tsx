import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { FollowButton } from "@/components/follow-button";
import { Avatar } from "@/components/post-card";
import { COMMUNITY_CATEGORIES, categoryLabel } from "@/lib/community-categories";
import { timeAgo } from "@/lib/format";
import { Search, Users, Music2, BadgeCheck, Heart, MessageCircle, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

type Tab = "para-voce" | "pessoas" | "publicacoes" | "comunidades" | "musica";

const TABS: { id: Tab; label: string }[] = [
  { id: "para-voce", label: "Para você" },
  { id: "pessoas", label: "Pessoas" },
  { id: "publicacoes", label: "Publicações" },
  { id: "comunidades", label: "Comunidades" },
  { id: "musica", label: "Música" },
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
type CommunityCard = { id: string; name: string; slug: string; description: string | null; category: string | null; memberCount: number };
type Track = { id: string; title: string; artist: string; coverUrl: string | null };

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
  let tracks: Track[] = [];
  let categoryCounts: { slug: string; label: string; icon: (typeof COMMUNITY_CATEGORIES)[number]["icon"]; count: number }[] = [];

  if (tab === "para-voce") {
    const [{ data: p }, { data: allComms }, { data: members }, { data: pubPosts }] = await Promise.all([
      supabase.rpc("discoverable_profiles", { limit_count: 6 }),
      supabase.from("Community").select("id, name, slug, description, category"),
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
  } else if (tab === "pessoas") {
    const { data } = await supabase.rpc("discoverable_profiles", { limit_count: 24, search_query: q || null });
    profiles = (data as Profile[]) ?? [];
  } else if (tab === "publicacoes") {
    const { data } = await supabase.rpc("public_posts", { limit_count: 24, search_query: q || null });
    posts = (data as PublicPost[]) ?? [];
  } else if (tab === "comunidades") {
    let query = supabase.from("Community").select("id, name, slug, description, category").limit(24);
    if (q) query = query.ilike("name", `%${q}%`);
    const [{ data: comms }, { data: members }] = await Promise.all([query, supabase.from("CommunityMember").select("communityId")]);
    const countByCommunity = new Map<string, number>();
    (members ?? []).forEach((m) => countByCommunity.set(m.communityId, (countByCommunity.get(m.communityId) ?? 0) + 1));
    communities = (comms ?? []).map((c) => ({ ...c, memberCount: countByCommunity.get(c.id) ?? 0 }));
  } else if (tab === "musica") {
    let query = supabase.from("Track").select("id, title, artist, coverUrl").order("createdAt", { ascending: false }).limit(24);
    if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
    const { data } = await query;
    tracks = (data as Track[]) ?? [];
  }

  const tabHref = (id: Tab) => `/explorar?tab=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <PublicHeader authed={!!user} />

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-6 pt-4 text-center sm:px-6">
        <div className="mb-6 hidden text-left text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white/30 sm:block">
          <span className="border-l-2 border-orbit-cyan pl-3">
            Pessoas · Ideias · Comunidades
            <br />
            Música · Um só lugar
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Explore o seu <span className="orbit-text-gradient">universo</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/50 sm:text-base">
          Descubra pessoas, publicações, comunidades e interesses dentro do ÓrbitaX.
        </p>

        <form action="/explorar" method="GET" className="mx-auto mt-6 max-w-2xl">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar pessoas, publicações, comunidades, músicas..."
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {TABS.map(({ id, label }) => (
            <Link
              key={id}
              href={tabHref(id)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                tab === id ? "bg-orbit-gradient text-white shadow-glow" : "border border-white/10 text-white/60 hover:bg-white/5"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {tab === "para-voce" && (
          <div className="space-y-12">
            <SectionHeader emoji="🔥" title="Em alta no ÓrbitaX" subtitle="Veja os assuntos que estão movimentando a comunidade." seeAllHref={tabHref("comunidades")} />
            {categoryCounts.length === 0 ? (
              <EmptyState text="Ainda não há categorias com atividade. Seja a primeira comunidade!" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {categoryCounts.map(({ slug, label, icon: Icon, count }) => (
                  <Link
                    key={slug}
                    href={`/comunidades?categoria=${slug}`}
                    className="rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20"
                  >
                    <Icon className="mb-3 h-5 w-5 text-orbit-cyan" />
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/40">{count} {count === 1 ? "comunidade" : "comunidades"}</p>
                  </Link>
                ))}
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
              {tracks.length === 0 ? (
                <EmptyState text="Em breve: descubra músicas e artistas da comunidade por aqui." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tracks.map((t) => (
                    <TrackTile key={t.id} track={t} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "pessoas" &&
          (profiles.length === 0 ? (
            <EmptyState text={q ? `Ninguém encontrado para "${q}".` : "Ainda não há pessoas para descobrir por aqui."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {profiles.map((p) => (
                <ProfileCard key={p.id} profile={p} currentUserId={user?.id ?? null} />
              ))}
            </div>
          ))}

        {tab === "publicacoes" &&
          (posts.length === 0 ? (
            <EmptyState text={q ? `Nenhuma publicação encontrada para "${q}".` : "Ainda não há publicações públicas por aqui."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostTile key={post.id} post={post} />
              ))}
            </div>
          ))}

        {tab === "comunidades" &&
          (communities.length === 0 ? (
            <EmptyState text={q ? `Nenhuma comunidade encontrada para "${q}".` : "Ainda não há comunidades públicas."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {communities.map((c) => (
                <CommunityTile key={c.id} community={c} />
              ))}
            </div>
          ))}

        {tab === "musica" &&
          (tracks.length === 0 ? (
            <EmptyState text={q ? `Nenhuma música encontrada para "${q}".` : "Em breve: descubra músicas e artistas da comunidade por aqui."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map((t) => (
                <TrackTile key={t.id} track={t} />
              ))}
            </div>
          ))}
      </main>
    </div>
  );
}

function SectionHeader({ emoji, title, subtitle, seeAllHref }: { emoji: string; title: string; subtitle: string; seeAllHref: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <span>{emoji}</span> {title}
        </h2>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
      <Link href={seeAllHref} className="shrink-0 text-xs font-medium text-white/50 transition hover:text-white">
        Ver todos →
      </Link>
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
      <div className="mb-3 h-16 rounded-xl bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40" />
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

function TrackTile({ track }: { track: Track }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-card p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orbit-gradient">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
        ) : (
          <Music2 className="h-5 w-5 text-white" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{track.title}</p>
        <p className="truncate text-xs text-white/40">{track.artist}</p>
      </div>
    </div>
  );
}
