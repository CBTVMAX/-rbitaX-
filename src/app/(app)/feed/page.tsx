import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PostComposer } from "@/components/post-composer";
import { PostCard, type FeedPost } from "@/components/post-card";
import { loadSharedEmbeds } from "@/lib/shared-posts";
import { sortMedia } from "@/lib/post-media";
import { FeedStories } from "@/components/personal-stories";
import { FeedRail, type RailCommunity, type RailPerson } from "@/components/feed-rail";
import { FEED_TABS, FEED_TYPES, type FeedTab, type FeedType } from "@/lib/feed";
import { ChevronDown, Check } from "lucide-react";

export const dynamic = "force-dynamic";

const POST_SELECT =
  "id, content, createdAt, editedAt, kind, location, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url, position), sharedPostId, visibility, publishAt" as const;

const KIND_OF: Record<Exclude<FeedType, "todos">, string> = { fotos: "image", videos: "video", texto: "text", musica: "music" };

export default async function FeedPage(props: { searchParams: Promise<{ aba?: string; tipo?: string; novo?: string }> }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const sp = await props.searchParams;
  const tab: FeedTab = FEED_TABS.some((t) => t.id === sp.aba) ? (sp.aba as FeedTab) : "para-voce";
  const type: FeedType = FEED_TYPES.some((t) => t.id === sp.tipo) ? (sp.tipo as FeedType) : "todos";
  const me = current.authId;

  const supabase = await createClient();

  // Quem eu sigo e de quem sou amigo: usado em "Seguindo", no "Seguir" dos posts e nas sugestões.
  const [{ data: followRows }, { data: friendRows }, { count: followerCount }, { data: memberRows }] = await Promise.all([
    supabase.from("Follow").select("followingId").eq("followerId", me),
    supabase.from("Friendship").select("requesterId, addresseeId").eq("status", "accepted").or(`requesterId.eq.${me},addresseeId.eq.${me}`).limit(1000),
    supabase.from("Follow").select("id", { count: "exact", head: true }).eq("followingId", me),
    supabase.from("CommunityMember").select("communityId").eq("userId", me),
  ]);
  const followingIds = new Set((followRows ?? []).map((f) => f.followingId));
  const friendIds = new Set((friendRows ?? []).map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId)));
  const myCommunityIds = (memberRows ?? []).map((m) => m.communityId);

  // ---------- Publicações da aba escolhida ----------
  let query = supabase.from("Post").select(POST_SELECT).is("communityId", null).eq("isArchived", false);
  if (type !== "todos") query = query.eq("kind", KIND_OF[type]);

  let rows: Awaited<typeof query>["data"] = [];
  if (tab === "salvos") {
    const { data: marks } = await supabase.from("Bookmark").select("postId").eq("userId", me).order("createdAt", { ascending: false }).limit(60);
    const ids = (marks ?? []).map((m) => m.postId);
    if (ids.length) {
      const { data } = await query.in("id", ids);
      const order = new Map(ids.map((id, i) => [id, i]));
      rows = (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
  } else if (tab === "seguindo") {
    const authors = [me, ...followingIds, ...friendIds];
    const { data } = await query.in("authorId", authors.slice(0, 500)).order("createdAt", { ascending: false }).limit(30);
    rows = data ?? [];
  } else {
    const { data } = await query.order("createdAt", { ascending: false }).limit(tab === "para-voce" ? 60 : 30);
    rows = data ?? [];
  }

  const postIds = (rows ?? []).map((p) => p.id);
  const none = Promise.resolve({ data: [] as { postId: string }[] });
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }, { data: savedRows }, shared] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds) : none,
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", me) : none,
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : none,
    postIds.length ? supabase.from("Bookmark").select("postId").in("postId", postIds).eq("userId", me) : none,
    loadSharedEmbeds(supabase, (rows ?? []).map((p) => p.sharedPostId)),
  ]);

  const likeCountByPost = new Map<string, number>();
  (likeRows ?? []).forEach((l) => likeCountByPost.set(l.postId, (likeCountByPost.get(l.postId) ?? 0) + 1));
  const likedSet = new Set((myLikes ?? []).map((l) => l.postId));
  const savedSet = new Set((savedRows ?? []).map((l) => l.postId));
  const commentCountByPost = new Map<string, number>();
  (commentRows ?? []).forEach((c) => commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1));

  let feed: FeedPost[] = (rows ?? []).map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    kind: p.kind,
    location: p.location,
    author: p.author as unknown as FeedPost["author"],
    media: sortMedia(p.media),
    likeCount: likeCountByPost.get(p.id) ?? 0,
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
    visibility: p.visibility,
    publishAt: p.publishAt,
    ...(p.sharedPostId ? { shared: shared.get(p.sharedPostId) ?? null } : {}),
  }));

  // "Para você": interação recente pesa mais, e quem você segue ou é amigo ganha destaque.
  if (tab === "para-voce") {
    const now = Date.now();
    const score = (p: FeedPost) => {
      const hours = Math.max(0, (now - new Date(p.createdAt).getTime()) / 3_600_000);
      const close = friendIds.has(p.author.id) || followingIds.has(p.author.id) ? 6 : 0;
      return (1 + p.likeCount * 2 + p.commentCount * 3 + close) / Math.pow(hours + 2, 1.3);
    };
    feed = [...feed].sort((a, b) => score(b) - score(a)).slice(0, 30);
  }

  // ---------- Coluna da direita ----------
  const friendList = Array.from(friendIds);
  const exclude = new Set([me, ...friendIds, ...followingIds]);
  const [{ data: detailRows }, { data: fofRows }, { data: communityRows }] = await Promise.all([
    supabase.rpc("public_profile_details", { target_user_id: me }),
    friendList.length
      ? supabase
          .from("Friendship")
          .select("requesterId, addresseeId")
          .eq("status", "accepted")
          .or(`requesterId.in.(${friendList.slice(0, 200).join(",")}),addresseeId.in.(${friendList.slice(0, 200).join(",")})`)
          .limit(2000)
      : Promise.resolve({ data: [] as { requesterId: string; addresseeId: string }[] }),
    (() => {
      let q = supabase
        .from("Community")
        .select("id, name, slug, avatarUrl, memberCount, isPrivate")
        .eq("isPrivate", false)
        .order("memberCount", { ascending: false })
        .limit(4);
      if (myCommunityIds.length) q = q.not("id", "in", `(${myCommunityIds.join(",")})`);
      return q;
    })(),
  ]);

  // Amigos de amigos, ordenados por quantos amigos em comum.
  const mutual = new Map<string, number>();
  for (const f of fofRows ?? []) {
    const [a, b] = [f.requesterId, f.addresseeId];
    const other = friendIds.has(a) ? b : friendIds.has(b) ? a : null;
    if (other && !exclude.has(other)) mutual.set(other, (mutual.get(other) ?? 0) + 1);
  }
  let peopleIds = Array.from(mutual.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([id]) => id);
  let people: RailPerson[] = [];
  if (peopleIds.length) {
    const { data } = await supabase.from("User").select("id, name, username, avatarUrl, isVerified").in("id", peopleIds);
    people = peopleIds.flatMap((id) => {
      const u = (data ?? []).find((x) => x.id === id);
      return u ? [{ ...u, mutual: mutual.get(id) ?? 0 }] : [];
    });
  }
  if (people.length < 3) {
    // Sem amigos em comum suficientes: pessoas que se cadastraram recentemente e aparecem na busca.
    const { data } = await supabase
      .from("User")
      .select("id, name, username, avatarUrl, isVerified")
      .eq("discoverable", true)
      .order("createdAt", { ascending: false })
      .limit(12);
    const extra = (data ?? []).filter((u) => !exclude.has(u.id) && !people.some((p) => p.id === u.id));
    people = [...people, ...extra.slice(0, 3 - people.length).map((u) => ({ ...u, mutual: 0 }))];
    peopleIds = people.map((p) => p.id);
  }

  const info = Array.isArray(detailRows) && detailRows[0] ? (detailRows[0] as { age: number | null; location: string | null; website: string | null }) : null;
  const communities: RailCommunity[] = (communityRows ?? []) as RailCommunity[];

  const tabHref = (id: FeedTab) => `/feed${id === "para-voce" ? "" : `?aba=${id}`}${type !== "todos" ? `${id === "para-voce" ? "?" : "&"}tipo=${type}` : ""}`;
  const typeHref = (id: FeedType) => {
    const q = new URLSearchParams();
    if (tab !== "para-voce") q.set("aba", tab);
    if (id !== "todos") q.set("tipo", id);
    const s = q.toString();
    return `/feed${s ? `?${s}` : ""}`;
  };
  const currentType = FEED_TYPES.find((t) => t.id === type)!;
  const showComposerOnMobile = sp.novo === "1";

  const emptyText =
    tab === "salvos"
      ? "Você ainda não salvou nenhuma publicação. Toque em Salvar num post para guardar aqui."
      : tab === "seguindo"
        ? "Ainda não há publicações de quem você segue. Siga pessoas para ver o que elas compartilham."
        : "Ainda não há publicações. Seja a primeira pessoa a publicar algo no seu universo.";

  return (
    <div className="mx-auto max-w-[1080px] md:px-5 md:py-5 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-5">
      <div className="min-w-0 md:space-y-4">
        <div className={showComposerOnMobile ? "px-3 pt-3 md:p-0" : "hidden md:block"}>
          <PostComposer userId={me} name={current.profile.name} avatarUrl={current.profile.avatarUrl} />
        </div>

        <FeedStories me={{ id: me, name: current.profile.name, avatarUrl: current.profile.avatarUrl }} />

        {/* Abas do feed + filtro de tipo (no celular, as abas ficam no "Principal" do topo) */}
        <div className="ox-card hidden items-center justify-between rounded-2xl border border-white/10 bg-space-surface px-2 md:flex">
          <nav className="flex items-center">
            {FEED_TABS.map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={tabHref(t.id)}
                  className={`relative px-4 py-3.5 text-sm transition ${on ? "font-semibold text-white" : "text-white/55 hover:text-white"}`}
                >
                  {t.label}
                  {on && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-orbit-gradient" />}
                </Link>
              );
            })}
          </nav>
          <TypeFilter current={currentType.label} items={FEED_TYPES.map((t) => ({ id: t.id, label: t.label, href: typeHref(t.id), on: t.id === type }))} />
        </div>

        {/* Celular: filtro de tipo discreto */}
        {type !== "todos" && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/60 md:hidden">
            <span>Mostrando: {currentType.label}</span>
            <Link href={typeHref("todos")} className="font-medium text-orbit-blue">
              Ver todos os tipos
            </Link>
          </div>
        )}

        {feed.length === 0 ? (
          <div className="mx-3 mt-3 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/45 md:mx-0 md:mt-0">{emptyText}</div>
        ) : (
          <div className="space-y-2 md:space-y-4">
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={me}
                bleed
                showFollow={!followingIds.has(post.author.id) && !friendIds.has(post.author.id)}
                initiallySaved={savedSet.has(post.id)}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden space-y-4 xl:sticky xl:top-20 xl:block">
        <FeedRail
          me={{
            id: me,
            name: current.profile.name,
            username: current.profile.username,
            avatarUrl: current.profile.avatarUrl,
            coverUrl: current.profile.coverUrl,
            bio: current.profile.bio,
            isVerified: current.profile.isVerified,
            age: info?.age ?? null,
            location: info?.location ?? null,
            website: info?.website ?? null,
          }}
          stats={{ friends: friendIds.size, followers: followerCount ?? 0, communities: myCommunityIds.length }}
          communities={communities}
          people={people}
        />
      </aside>
    </div>
  );
}

function TypeFilter({ current, items }: { current: string; items: { id: string; label: string; href: string; on: boolean }[] }) {
  // <details> abre e fecha sem JavaScript; cada opção é um link de verdade.
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/75 hover:text-white [&::-webkit-details-marker]:hidden">
        {current}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
        {items.map((i) => (
          <Link key={i.id} href={i.href} className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 ${i.on ? "font-semibold text-white" : "text-white/75"}`}>
            {i.label}
            {i.on && <Check className="h-4 w-4 text-orbit-blue" />}
          </Link>
        ))}
      </div>
    </details>
  );
}
