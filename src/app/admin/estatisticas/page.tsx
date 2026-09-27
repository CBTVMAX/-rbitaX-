import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminStatsView } from "@/components/admin/admin-stats-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estatísticas · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Estatísticas" subtitle="Evolução de usuários, publicações e denúncias ao longo do tempo." />
      <AdminStatsView />
    </div>
  );
}
