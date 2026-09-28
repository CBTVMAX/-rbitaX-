import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminFinanceView } from "@/components/admin/admin-finance-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Financeiro · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Financeiro" subtitle="Compras, pedidos, estornos e carteiras. Todo ajuste manual gera auditoria." />
      <AdminFinanceView />
    </div>
  );
}
