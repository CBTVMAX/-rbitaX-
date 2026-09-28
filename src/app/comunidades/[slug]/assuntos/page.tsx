import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hash } from "lucide-react";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { SubpageFrame } from "@/components/community/subpage";
import { SubjectsBrowser } from "@/components/community/pages/subjects-browser";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Assuntos · ${c.name}` : "Assuntos · Órbita X" };
}

export default async function SubjectsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const params = await props.params;
  const { a } = await props.searchParams;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, membership, canSee, viewer } = access;
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <SubpageFrame title="Assuntos" icon={<Hash className="h-5 w-5 text-orbit-cyan" />} canSee={canSee} wide>
          <SubjectsBrowser canSee={canSee} initialSlug={a ?? ""} />
        </SubpageFrame>
      </CommunityProvider>
    </CommunityShell>
  );
}
