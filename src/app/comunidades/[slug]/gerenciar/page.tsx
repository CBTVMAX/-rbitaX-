import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { CommunityShell } from "@/components/community/community-shell";
import { ManageView } from "@/components/community/manage/manage-view";
import { findCommunity } from "@/lib/community-server";
import type { Role } from "@/lib/communities";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await findCommunity(params.slug);
  return { title: c ? `Gerenciar ${c.name} · Órbita X` : "Gerenciar comunidade · Órbita X", robots: { index: false } };
}

/** Staff area. The page only decides what to show — every change goes through a community_* RPC that re-checks the role. */
export default async function ManageCommunityPage({ params, searchParams }: { params: { slug: string }; searchParams: { secao?: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect(`/entrar?next=/comunidades/${encodeURIComponent(params.slug)}/gerenciar`);
  const community = await findCommunity(params.slug);
  if (!community) notFound();

  const supabase = createClient();
  const { data: mine } = await supabase.from("CommunityMember").select("role, notify").eq("communityId", community.id).eq("userId", current.authId).maybeSingle();
  const role = (mine?.role as Role) ?? null;
  if (!role || role === "member") redirect(`/comunidades/${community.slug}`);

  const [pp, pd, rq, rp] = await Promise.all([
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("moderationStatus", "pending"),
    supabase.from("CommunityDiscussion").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "pending"),
    supabase.from("CommunityJoinRequest").select("userId", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "pending"),
    supabase.from("Report").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "open"),
  ]);

  return (
    <CommunityShell current={current}>
      <ManageView
        community={community}
        viewer={{ id: current.authId, name: current.profile.name, username: current.profile.username, avatarUrl: current.profile.avatarUrl }}
        role={role}
        notify={mine?.notify ?? true}
        initialSection={searchParams.secao ?? ""}
        badges={{ pending: (pp.count ?? 0) + (pd.count ?? 0), requests: rq.count ?? 0, reports: rp.count ?? 0 }}
      />
    </CommunityShell>
  );
}
