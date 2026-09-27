import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/current-user";
import { AdminOverview } from "@/components/admin/admin-overview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel · Órbita X", robots: { index: false } };

export default async function AdminHomePage() {
  const current = await getCurrentUser();
  return <AdminOverview adminName={current?.profile.name ?? "Admin"} />;
}
