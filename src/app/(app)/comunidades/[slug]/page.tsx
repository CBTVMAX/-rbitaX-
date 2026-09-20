import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { CommunityJoinButton } from "@/components/community-join-button";
import { Avatar } from "@/components/post-card";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommunityDetailPage({ params }: { params: { slug: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();

  const { data: community } = await supabase
    .from("Community")
    .select("*")
    .eq("slug", params.slug.toLowerCase())
    .maybeSingle();

  if (!community) notFound();

  const { data: members } = await supabase
    .from("CommunityMember")
    .select("role, user:User(id, name, username, avatarUrl)")
    .eq("communityId", community.id)
    .order("createdAt", { ascending: true });

  const isMember = (members ?? []).some((m) => (m.user as unknown as { id: string })?.id === current.authId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 h-32 rounded-2xl bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{community.name}</h1>
          <p className="flex items-center gap-1 text-sm text-white/40">
            <Users className="h-3.5 w-3.5" /> {members?.length ?? 0} membros
          </p>
        </div>
        <CommunityJoinButton communityId={community.id} userId={current.authId} initiallyMember={isMember} />
      </div>

      {community.description && <p className="mb-6 text-sm text-white/70">{community.description}</p>}

      <h2 className="mb-3 text-sm font-semibold text-white/70">Membros</h2>
      <div className="space-y-2">
        {(members ?? []).map((m, i) => {
          const u = m.user as unknown as { id: string; name: string; username: string; avatarUrl: string | null };
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-card p-3">
              <Avatar name={u.name} url={u.avatarUrl} size={36} />
              <div className="flex-1">
                <p className="text-sm text-white">{u.name}</p>
                <p className="text-xs text-white/40">@{u.username}</p>
              </div>
              {m.role !== "member" && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/50">
                  {m.role}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
