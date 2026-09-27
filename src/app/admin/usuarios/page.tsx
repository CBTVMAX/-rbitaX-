import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminUsers } from "@/components/admin/admin-tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuários · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Usuários" subtitle="Todos os cadastros da plataforma. Verifique, suspenda ou reative contas." />
      <Suspense fallback={null}>
        <AdminUsers />
      </Suspense>
    </div>
  );
}
