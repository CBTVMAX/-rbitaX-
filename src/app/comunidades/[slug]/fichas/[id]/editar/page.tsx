import type { Metadata } from "next";
import { findCommunity } from "@/lib/community-server";
import { SheetPage } from "@/components/community/sheets/sheet-page";
import { SheetForm } from "@/components/community/sheets/sheet-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Editar ficha · ${c.name}` : "Editar ficha · Órbita X" };
}

export default async function Page(props: { params: Promise<{ slug: string; id?: string }> }) {
  const params = await props.params;
  return (
    <SheetPage slug={params.slug} title="Editar ficha">
      <SheetForm sheetId={params.id!} />
    </SheetPage>
  );
}
