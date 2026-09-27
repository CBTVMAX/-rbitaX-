import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSecurityView } from "@/components/admin/admin-security-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Segurança · Administração · Órbita X", robots: { index: false } };

export default async function AdminSecurityPage() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  // Only administrators; the panel's data also requires two-step verification inside the database.
  if (admin !== true) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">Segurança</h1>
        <p className="mt-1 text-sm text-white/60">Eventos de segurança, sessões, verificação em duas etapas e integridade das Órbita Coins.</p>
      </div>
      <AdminSecurityView />
    </div>
  );
}
