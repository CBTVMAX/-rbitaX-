import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityView, type MemberPreview } from "@/components/community/community-view";
import type { CommunityEvent } from "@/components/community/events";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";
import { DISCUSSION_COLUMNS, EVENT_COLUMNS, type Album, type Discussion } from "@/lib/communities";
import { loadCommunityPosts } from "@/lib/community-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await findCommunity(params.slug);
  if (!c) return { title: "Comunidade · Órbita X" };
  return {
    title: `${c.name} (@${c.username}) · Comunidades Órbita X`,
    description: c.isPrivate ? "Comunidade privada no Órbita X." : c.description?.slice(0, 160) ?? undefined,
  };
}

export default async function CommunityPage({ params, searchParams }: { params: { slug: string }; searchParams: { aba?: string; post?: string } }) {
  // Old tab links now have their own pages.
  if (searchParams.aba === "discussoes") redirect(`/comunidades/${params.slug}/discussoes`);
  if (searchParams.aba === "membros") redirect(`/comunidades/${params.slug}/membros`);

  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, me, membership, canSee, viewer } = access;

  type Posts = Awaited<ReturnType<typeof loadCommunityPosts>>;
  let pinned: Posts = [];
  let posts: Posts = [];
  let focus: Posts = [];
  let discussions: Discussion[] = [];
  let albums: Album[] = [];
  let members: MemberPreview[] = [];
  let nextEvent: { event: CommunityEvent; rsvp: string | null } | null = null;
  let counts = { fotos: 0, videos: 0, clipes: 0, musica: 0, gifs: 0, arquivos: 0, discussions: 0, announcements: 0, events: 0 };

  if (canSee) {
    const head = (kind: string) =>
      supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("kind", kind).eq("moderationStatus", "visible");
    const soon = new Date(Date.now() - 6 * 3600_000).toISOString();
    const [p, l, d, a, m, cPhotos, cVideos, cClips, cMusic, cGifs, cFiles, cDisc, cAnn, ev, f] = await Promise.all([
      loadCommunityPosts(supabase, community.id, me, { pinned: true, limit: 3 }),
      loadCommunityPosts(supabase, community.id, me, { pinned: false, excludeKinds: ["clip"], limit: 15 }),
      supabase
        .from("CommunityDiscussion")
        .select(DISCUSSION_COLUMNS)
        .eq("communityId", community.id)
        .eq("status", "visible")
        .order("isPinned", { ascending: false })
        .order("lastActivityAt", { ascending: false })
        .limit(5),
      supabase.from("CommunityAlbum").select("id, title, description, coverUrl, createdAt").eq("communityId", community.id).order("createdAt", { ascending: false }),
      supabase
        .from("CommunityMember")
        .select("role, createdAt, user:User!CommunityMember_userId_fkey(id, name, username, avatarUrl, isVerified)")
        .eq("communityId", community.id)
        .order("createdAt", { ascending: true })
        .limit(40),
      // Photos count pictures, not posts (one post can carry several).
      supabase
        .from("Media")
        .select("id, post:Post!Media_postId_fkey!inner(communityId, moderationStatus, kind)", { count: "exact", head: true })
        .eq("type", "image")
        .eq("post.communityId", community.id)
        .eq("post.moderationStatus", "visible")
        .eq("post.kind", "image"),
      head("video"),
      head("clip"),
      head("music"),
      head("gif"),
      head("file"),
      supabase.from("CommunityDiscussion").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "visible"),
      supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("moderationStatus", "visible").not("meta->>tag", "is", null),
      supabase.from("CommunityEvent").select(EVENT_COLUMNS).eq("communityId", community.id).eq("status", "scheduled").gte("startsAt", soon).order("startsAt", { ascending: true }).limit(20),
      searchParams.post && /^[0-9a-f-]{36}$/.test(searchParams.post)
        ? loadCommunityPosts(supabase, community.id, me, { ids: [searchParams.post], limit: 1 })
        : Promise.resolve([] as Posts),
    ]);
    pinned = p;
    posts = l;
    focus = f;
    discussions = (d.data ?? []) as unknown as Discussion[];
    albums = (a.data ?? []) as Album[];
    members = ((m.data ?? []) as unknown as MemberPreview[]).filter((x) => x.user);
    const upcoming = ((ev.data ?? []) as CommunityEvent[]).filter((e) => (e.endsAt ? new Date(e.endsAt).getTime() : new Date(e.startsAt).getTime() + 6 * 3600_000) > Date.now());
    counts = {
      fotos: cPhotos.count ?? 0,
      videos: cVideos.count ?? 0,
      clipes: cClips.count ?? 0,
      musica: cMusic.count ?? 0,
      gifs: cGifs.count ?? 0,
      arquivos: cFiles.count ?? 0,
      discussions: cDisc.count ?? 0,
      announcements: cAnn.count ?? 0,
      events: upcoming.length,
    };
    if (upcoming[0]) {
      const { data: mine } = me
        ? await supabase.from("CommunityEventRsvp").select("status").eq("eventId", upcoming[0].id).eq("userId", me).maybeSingle()
        : { data: null };
      nextEvent = { event: upcoming[0], rsvp: mine?.status ?? null };
    }
  }

  let staffBadges = { pending: 0, requests: 0, reports: 0 };
  if (membership.role && membership.role !== "member" && membership.role !== "editor") {
    const [pp, rq, rp] = await Promise.all([
      supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("moderationStatus", "pending"),
      supabase.from("CommunityJoinRequest").select("userId", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "pending"),
      supabase.from("Report").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "open"),
    ]);
    staffBadges = { pending: pp.count ?? 0, requests: rq.count ?? 0, reports: rp.count ?? 0 };
  }

  return (
    <CommunityShell current={current}>
      <CommunityView
        community={community}
        viewer={viewer}
        membership={membership}
        canSee={canSee}
        initialTab={searchParams.aba ?? "tudo"}
        pinned={pinned}
        posts={posts}
        focus={focus[0] ?? null}
        discussions={discussions}
        albums={albums}
        members={members}
        counts={counts}
        nextEvent={nextEvent}
        staffBadges={staffBadges}
      />
    </CommunityShell>
  );
}
