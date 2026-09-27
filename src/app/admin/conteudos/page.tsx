import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminContents } from "@/components/admin/admin-tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conteúdos · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Conteúdos" subtitle="Publicações da rede. Oculte, restaure ou remova conteúdos que violem as regras." />
      <AdminContents />
    </div>
  );
}
