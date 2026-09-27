import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminSecurityView } from "@/components/admin/admin-security-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Logs de Sistema · Painel · Órbita X", robots: { index: false } };

// Acesso já garantido pelo layout /admin; os dados exigem 2FA dentro do banco (admin_security_overview).
export default function AdminSecurityPage() {
  return (
    <div>
      <AdminPageHead title="Logs de Sistema" subtitle="Eventos de segurança, sessões, verificação em duas etapas e integridade das Órbita Coins." />
      <AdminSecurityView />
    </div>
  );
}
