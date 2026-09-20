import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { MusicApp, type TrackRow } from "@/components/music-app";

export const dynamic = "force-dynamic";

export default async function MusicaPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const { data: tracks } = await supabase
    .from("Track")
    .select("id, title, artist, audioUrl, coverUrl, userId, owner:User(name, username, avatarUrl)")
    .order("createdAt", { ascending: false })
    .limit(50);

  return <MusicApp userId={current.authId} initialTracks={(tracks as unknown as TrackRow[]) ?? []} />;
}
