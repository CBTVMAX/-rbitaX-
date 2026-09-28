import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/page-head";
import { AdminGiftsView } from "@/components/admin/admin-gifts-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Presentes · Painel · Órbita X", robots: { index: false } };

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Presentes" subtitle="Catálogo de presentes virtuais pagos em Diamantes." />
      <AdminGiftsView />
    </div>
  );
}
