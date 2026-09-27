import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/admin");

  // Só administradores da plataforma. O banco checa de novo em cada RPC/ação (defesa em profundidade).
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/feed");

  return <AdminShell admin={{ name: current.profile.name, avatarUrl: current.profile.avatarUrl }}>{children}</AdminShell>;
}
