import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { findCommunity } from "@/lib/community-server";
import type { Membership, Role, Viewer } from "@/lib/communities";

/**
 * Everything a community page needs to know about the visitor: the community (RLS applies), their
 * membership, whether they are muted or banned and whether they may see the content. The database
 * enforces all of this again on every read and write; this only decides what to render.
 */
export async function loadCommunityAccess(slug: string) {
  const current = await getCurrentUser();
  const community = await findCommunity(slug);
  if (!community) return null;

  const supabase = createClient();
  const me = current?.authId ?? null;
  const [mine, request, ban, siteAdmin, mute, favorite] = await Promise.all([
    me ? supabase.from("CommunityMember").select("role, notify").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.from("CommunityJoinRequest").select("status").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.from("CommunityBan").select("userId").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.rpc("is_admin") : Promise.resolve({ data: false }),
    me ? supabase.from("CommunityMute").select("until, reason").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    me ? supabase.from("CommunityFavorite").select("communityId").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const muteRow = mute.data as { until: string | null; reason: string } | null;
  const membership: Membership = {
    role: (mine.data?.role as Role) ?? null,
    notify: mine.data?.notify ?? true,
    request: request.data?.status === "pending" || request.data?.status === "rejected" ? request.data.status : null,
    banned: !!ban.data,
    muted: muteRow && (!muteRow.until || new Date(muteRow.until).getTime() > Date.now()) ? muteRow : null,
    favorite: !!favorite.data,
  };
  const canSee = !membership.banned && (!community.isPrivate || !!membership.role || siteAdmin.data === true);
  const viewer: Viewer = current ? { id: current.authId, name: current.profile.name, username: current.profile.username, avatarUrl: current.profile.avatarUrl } : null;

  return { current, community, supabase, me, membership, canSee, viewer };
}

export type CommunityAccess = NonNullable<Awaited<ReturnType<typeof loadCommunityAccess>>>;
