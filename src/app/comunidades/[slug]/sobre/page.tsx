import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { AboutView, type StaffMember } from "@/components/community/pages/about";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await findCommunity(params.slug);
  return { title: c ? `Sobre · ${c.name}` : "Sobre · Órbita X", description: c?.isPrivate ? undefined : c?.description?.slice(0, 160) ?? undefined };
}

export default async function AboutPage({ params }: { params: { slug: string } }) {
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, membership, canSee, viewer } = access;
  const [staffRows, posts, discussions, events] = await Promise.all([
    supabase
      .from("CommunityMember")
      .select("role, user:User!CommunityMember_userId_fkey(id, name, username, avatarUrl, isVerified)")
      .eq("communityId", community.id)
      .in("role", ["owner", "admin", "moderator", "editor"])
      .order("createdAt", { ascending: true })
      .limit(60),
    canSee ? supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("moderationStatus", "visible") : Promise.resolve({ count: 0 }),
    canSee ? supabase.from("CommunityDiscussion").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "visible") : Promise.resolve({ count: 0 }),
    canSee ? supabase.from("CommunityEvent").select("id", { count: "exact", head: true }).eq("communityId", community.id) : Promise.resolve({ count: 0 }),
  ]);
  const staff = ((staffRows.data ?? []) as unknown as StaffMember[]).filter((s) => s.user);
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <AboutView staff={staff} stats={canSee ? { posts: posts.count ?? 0, discussions: discussions.count ?? 0, events: events.count ?? 0 } : null} />
      </CommunityProvider>
    </CommunityShell>
  );
}
