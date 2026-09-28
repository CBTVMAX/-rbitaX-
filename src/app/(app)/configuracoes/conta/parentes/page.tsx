import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { FamilyManager } from "@/components/family-manager";
import type { FamilyMember, FamilyRequest } from "@/components/profile-family";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parentes · Órbita X" };

export default async function ParentesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/configuracoes/conta/parentes");

  const supabase = await createClient();
  const [{ data: family }, { data: requests }, { data: sent }] = await Promise.all([
    supabase.rpc("family_of", { p_user_id: current.authId }),
    supabase.rpc("family_requests"),
    supabase.rpc("family_sent"),
  ]);

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <FamilyManager
        family={(family ?? []) as FamilyMember[]}
        requests={(requests ?? []) as FamilyRequest[]}
        sent={(sent ?? []) as never}
      />
    </div>
  );
}
