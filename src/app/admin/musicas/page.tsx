import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminMusicView } from "@/components/admin/admin-music-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Músicas · Administração · Órbita X", robots: { index: false } };

export default async function AdminMusicPage() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  // Só administradores; o banco confere de novo em cada envio, edição ou exclusão.
  if (admin !== true) notFound();

  return (
    <div>
      <AdminPageHead title="Músicas" subtitle="Envie músicas para o catálogo do Órbita X, adicione clipes do YouTube e organize o que aparece para todos." />
      <AdminMusicView />
    </div>
  );
}
