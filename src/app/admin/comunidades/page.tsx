import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminCommunities } from "@/components/admin/admin-tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comunidades · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Comunidades" subtitle="Todas as comunidades, seus donos e tamanho." />
      <AdminCommunities />
    </div>
  );
}
