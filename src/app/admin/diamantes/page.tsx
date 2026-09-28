import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminDiamondsView } from "@/components/admin/admin-diamonds-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diamantes · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Diamantes" subtitle="Pacotes de compra: quantidade, preço, selo e status." />
      <AdminDiamondsView />
    </div>
  );
}
