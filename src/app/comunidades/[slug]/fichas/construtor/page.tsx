import type { Metadata } from "next";
import { findCommunity } from "@/lib/community-server";
import { SheetPage } from "@/components/community/sheets/sheet-page";
import { SheetBuilder } from "@/components/community/sheets/sheet-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Construtor de ficha · ${c.name}` : "Construtor de ficha · Órbita X" };
}

export default async function Page(props: { params: Promise<{ slug: string; id?: string }> }) {
  const params = await props.params;
  return (
    <SheetPage slug={params.slug} title="Construtor de ficha">
      <SheetBuilder />
    </SheetPage>
  );
}
