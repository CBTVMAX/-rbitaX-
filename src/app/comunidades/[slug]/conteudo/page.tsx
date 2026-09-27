import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { ContentPageView } from "@/components/community/pages/content";
import type { ContentTab } from "@/components/community/content-center";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";
import { CONTENT_TAB_IDS, type Album } from "@/lib/communities";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Conteúdo · ${c.name}` : "Conteúdo · Órbita X" };
}

export default async function ContentPage(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, membership, canSee, viewer } = access;
  const tab = ((CONTENT_TAB_IDS as readonly string[]).includes(searchParams.aba ?? "") ? searchParams.aba : "tudo") as ContentTab;

  let albums: Album[] = [];
  const counts: Partial<Record<ContentTab, number>> = {};
  if (canSee) {
    const head = (kind: string) => supabase.from("Post").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("kind", kind).eq("moderationStatus", "visible");
    const [a, v, c, m, g, f] = await Promise.all([
      supabase.from("CommunityAlbum").select("id, title, description, coverUrl, createdAt").eq("communityId", community.id).order("createdAt", { ascending: false }),
      head("video"),
      head("clip"),
      head("music"),
      head("gif"),
      head("file"),
    ]);
    albums = (a.data ?? []) as Album[];
    Object.assign(counts, { videos: v.count ?? 0, clipes: c.count ?? 0, musica: m.count ?? 0, gifs: g.count ?? 0, arquivos: f.count ?? 0 });
  }
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <ContentPageView canSee={canSee} tab={tab} albums={albums} counts={counts} />
      </CommunityProvider>
    </CommunityShell>
  );
}
