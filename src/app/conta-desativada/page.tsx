import type { Metadata } from "next";
import { DeactivatedNotice } from "@/components/account-deactivated";

export const metadata: Metadata = { title: "Página excluída · Órbita X", robots: { index: false } };

export default async function DeactivatedPage(props: { searchParams: Promise<{ ate?: string }> }) {
  const { ate } = await props.searchParams;
  const until = ate && !Number.isNaN(Date.parse(ate)) ? ate : null;
  return <DeactivatedNotice until={until} />;
}
