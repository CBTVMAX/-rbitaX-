import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityView, type MemberPreview } from "@/components/community/community-view";
import { findCommunity } from "@/lib/community-server";
import { DISCUSSION_COLUMNS, type Album, type Community, type Discussion, type Membership, type Role } from "@/lib/communities";
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
  const current = await getCurrentUser();
  const community = await findCommunity(params.slug);
  if (!community) notFound();

  const supabase = createClient();
  const me = current?.authId ?? null;

  const [mine, request, ban, siteAdmin] = await Promise.all([
    me ? supabase.from("CommunityMember").select("role, notify").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.from("CommunityJoinRequest").select("status").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.from("CommunityBan").select("userId").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.rpc("is_admin") : Promise.resolve({ data: false }),
  ]);
  const membership: Membership = {
    role: (mine.data?.role as Role) ?? null,
    notify: mine.data?.notify ?? true,
    request: request.data?.status === "pending" || request.data?.status === "rejected" ? request.data.status : null,
    banned: !!ban.data,
  };
  const canSee = !membership.banned && (!community.isPrivate || !!membership.role || siteAdmin.data === true);

  type Posts = Awaited<ReturnType<typeof loadCommunityPosts>>;
  let pinned: Posts = [];
  let posts: Posts = [];
  let focus: Posts = [];
  let discussions: Discussion[] = [];
  let albums: Album[] = [];
  let members: MemberPreview[] = [];
  let counts = { photos: 0, videos: 0, clips: 0, discussions: 0 };

  if (canSee) {
    const head = (kind: string) =>
      supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("kind", kind).eq("moderationStatus", "visible");
    const [p, l, d, a, m, cPhotos, cVideos, cClips, cDisc, f] = await Promise.all([
      loadCommunityPosts(supabase, community.id, me, { pinned: true, limit: 3 }),
      loadCommunityPosts(supabase, community.id, me, { pinned: false, excludeKinds: ["clip"], limit: 15 }),
      supabase
        .from("CommunityDiscussion")
        .select(DISCUSSION_COLUMNS)
        .eq("communityId", community.id)
        .eq("status", "visible")
        .order("isPinned", { ascending: false })
        .order("lastActivityAt", { ascending: false })
        .limit(20),
      supabase.from("CommunityAlbum").select("id, title, description, coverUrl, createdAt").eq("communityId", community.id).order("createdAt", { ascending: false }),
      supabase
        .from("CommunityMember")
        .select("role, createdAt, user:User!CommunityMember_userId_fkey(id, name, username, avatarUrl, isVerified)")
        .eq("communityId", community.id)
        .order("createdAt", { ascending: true })
        .limit(60),
      // Photos tab counts pictures, not posts (one post can carry several).
      supabase
        .from("Media")
        .select("id, post:Post!Media_postId_fkey!inner(communityId, moderationStatus)", { count: "exact", head: true })
        .eq("type", "image")
        .eq("post.communityId", community.id)
        .eq("post.moderationStatus", "visible"),
      head("video"),
      head("clip"),
      supabase.from("CommunityDiscussion").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "visible"),
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
    counts = { photos: cPhotos.count ?? 0, videos: cVideos.count ?? 0, clips: cClips.count ?? 0, discussions: cDisc.count ?? 0 };
  }

  let staffBadges = { pending: 0, requests: 0, reports: 0 };
  if (membership.role && membership.role !== "member") {
    const [pp, rq, rp] = await Promise.all([
      supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("moderationStatus", "pending"),
      supabase.from("CommunityJoinRequest").select("userId", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "pending"),
      supabase.from("Report").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "open"),
    ]);
    staffBadges = { pending: pp.count ?? 0, requests: rq.count ?? 0, reports: rp.count ?? 0 };
  }

  const viewer = current ? { id: current.authId, name: current.profile.name, username: current.profile.username, avatarUrl: current.profile.avatarUrl } : null;

  return (
    <CommunityShell current={current}>
      <CommunityView
        community={community}
        viewer={viewer}
        membership={membership}
        canSee={canSee}
        initialTab={searchParams.aba ?? "inicio"}
        pinned={pinned}
        posts={posts}
        focus={focus[0] ?? null}
        discussions={discussions}
        albums={albums}
        members={members}
        counts={counts}
        staffBadges={staffBadges}
      />
    </CommunityShell>
  );
}
