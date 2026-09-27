import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminReports } from "@/components/admin/admin-tables";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Denúncias · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Denúncias" subtitle="Denúncias enviadas pela comunidade. Resolva ou arquive cada caso." />
      <AdminReports />
    </div>
  );
}
