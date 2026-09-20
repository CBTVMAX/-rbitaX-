import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { CreateCommunityDialog } from "@/components/create-community-dialog";
import { CommunityJoinButton } from "@/components/community-join-button";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComunidadesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();

  const { data: communities } = await supabase
    .from("Community")
    .select("*")
    .order("createdAt", { ascending: false });

  const { data: myMemberships } = await supabase
    .from("CommunityMember")
    .select("communityId")
    .eq("userId", current.authId);
  const myCommunityIds = new Set((myMemberships ?? []).map((m) => m.communityId));

  const { data: memberCounts } = await supabase.from("CommunityMember").select("communityId");
  const countByCommunity = new Map<string, number>();
  (memberCounts ?? []).forEach((m) => countByCommunity.set(m.communityId, (countByCommunity.get(m.communityId) ?? 0) + 1));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Comunidades</h1>
          <p className="text-sm text-white/50">Descubra, participe e conecte-se com quem compartilha os mesmos interesses.</p>
        </div>
        <CreateCommunityDialog userId={current.authId} />
      </div>

      {(communities ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
          Nenhuma comunidade ainda. Crie a primeira!
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(communities ?? []).map((c) => (
          <div key={c.id} className="rounded-2xl border border-white/10 bg-space-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Link href={`/comunidades/${c.slug}`} className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white hover:underline">{c.name}</h3>
                <p className="flex items-center gap-1 text-xs text-white/40">
                  <Users className="h-3 w-3" /> {countByCommunity.get(c.id) ?? 0} membros
                </p>
              </Link>
              <CommunityJoinButton
                communityId={c.id}
                userId={current.authId}
                initiallyMember={myCommunityIds.has(c.id)}
              />
            </div>
            {c.description && <p className="line-clamp-2 text-xs text-white/60">{c.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
