import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { loadMusic } from "@/lib/music";
import { MusicApp } from "@/components/music/music-app";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Música · Órbita X" };

export default async function MusicaPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/musica");

  const supabase = await createClient();
  const initial = await loadMusic(supabase, current.authId);
  return <MusicApp me={current.authId} initial={initial} />;
}
