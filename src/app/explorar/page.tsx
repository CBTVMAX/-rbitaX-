import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { Avatar } from "@/components/post-card";
import { Search, Users, Newspaper, Compass, Music2, BadgeCheck } from "lucide-react";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

type Tab = "para-voce" | "pessoas" | "publicacoes" | "comunidades" | "musica";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "para-voce", label: "Para você", icon: Compass },
  { id: "pessoas", label: "Pessoas", icon: Users },
  { id: "publicacoes", label: "Publicações", icon: Newspaper },
  { id: "comunidades", label: "Comunidades", icon: Users },
  { id: "musica", label: "Música", icon: Music2 },
];

type Profile = { id: string; name: string; username: string; avatarUrl: string | null; bio: string | null; isVerified: boolean };
type PublicPost = { id: string; content: string; createdAt: string; authorId: string; authorName: string; authorUsername: string; authorAvatarUrl: string | null };
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

  if (tab === "para-voce") {
    const [{ data: p }, { data: comms }, { data: members }] = await Promise.all([
      supabase.rpc("discoverable_profiles", { limit_count: 4 }),
      supabase.from("Community").select("id, name, slug, description, category").limit(50),
      supabase.from("CommunityMember").select("communityId"),
    ]);
    profiles = (p as Profile[]) ?? [];
    const countByCommunity = new Map<string, number>();
    (members ?? []).forEach((m) => countByCommunity.set(m.communityId, (countByCommunity.get(m.communityId) ?? 0) + 1));
    communities = (comms ?? [])
      .map((c) => ({ ...c, memberCount: countByCommunity.get(c.id) ?? 0 }))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 3);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <PublicHeader authed={!!user} />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-2 sm:px-6">
        <h1 className="mb-5 font-display text-3xl font-bold text-white">Explorar</h1>

        <form action="/explorar" method="GET" className="mb-5">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar pessoas, posts, comunidades, músicas..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map(({ id, label }) => (
            <Link
              key={id}
              href={`/explorar?tab=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                tab === id ? "bg-orbit-gradient text-white shadow-glow" : "border border-white/10 text-white/60 hover:bg-white/5"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {tab === "para-voce" && (
          <div className="space-y-10">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
                🔥 Em destaque
              </h2>
              {communities.length === 0 ? (
                <EmptyState text="Ainda não há comunidades em destaque. Seja a primeira!" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {communities.map((c) => (
                    <CommunityTile key={c.id} community={c} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
                👥 Pessoas que você pode conhecer
              </h2>
              {profiles.length === 0 ? (
                <EmptyState text="Ainda não há pessoas para descobrir por aqui. Crie sua conta e seja uma das primeiras!" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {profiles.map((p) => (
                    <ProfileCard key={p.id} profile={p} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "pessoas" &&
          (profiles.length === 0 ? (
            <EmptyState text={q ? `Ninguém encontrado para "${q}".` : "Ainda não há pessoas para descobrir por aqui."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {profiles.map((p) => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </div>
          ))}

        {tab === "publicacoes" &&
          (posts.length === 0 ? (
            <EmptyState text={q ? `Nenhuma publicação encontrada para "${q}".` : "Ainda não há publicações públicas por aqui."} />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostTile key={post.id} post={post} />
              ))}
            </div>
          ))}

        {tab === "comunidades" &&
          (communities.length === 0 ? (
            <EmptyState text={q ? `Nenhuma comunidade encontrada para "${q}".` : "Ainda não há comunidades públicas."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((c) => (
                <CommunityTile key={c.id} community={c} />
              ))}
            </div>
          ))}

        {tab === "musica" &&
          (tracks.length === 0 ? (
            <EmptyState text={q ? `Nenhuma música encontrada para "${q}".` : "Ainda não há músicas publicadas."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-card p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orbit-gradient">
                    {t.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.coverUrl} alt={t.title} className="h-full w-full object-cover" />
                    ) : (
                      <Music2 className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{t.title}</p>
                    <p className="truncate text-xs text-white/40">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
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

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card p-4 text-center">
      <div className="mb-3 flex justify-center">
        <Avatar name={profile.name} url={profile.avatarUrl} size={56} />
      </div>
      <p className="flex items-center justify-center gap-1 truncate text-sm font-semibold text-white">
        {profile.name}
        {profile.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-orbit-cyan" />}
      </p>
      <p className="mb-3 truncate text-xs text-white/40">@{profile.username}</p>
      <Link
        href={`/perfil/${profile.username}`}
        className="inline-flex w-full items-center justify-center rounded-full border border-white/15 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/5"
      >
        Ver perfil
      </Link>
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
          {community.category}
        </span>
      )}
      <h3 className="truncate text-sm font-semibold text-white">{community.name}</h3>
      <p className="flex items-center gap-1 text-xs text-white/40">
        <Users className="h-3 w-3" /> {community.memberCount} membros
      </p>
    </Link>
  );
}

function PostTile({ post }: { post: PublicPost }) {
  return (
    <Link
      href={`/perfil/${post.authorUsername}`}
      className="block rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20"
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={post.authorName} url={post.authorAvatarUrl} size={28} />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{post.authorName}</p>
          <p className="truncate text-[11px] text-white/40">@{post.authorUsername}</p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-white/70">{post.content}</p>
    </Link>
  );
}
