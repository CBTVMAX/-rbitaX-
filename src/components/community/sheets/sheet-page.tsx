import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { SubpageFrame } from "@/components/community/subpage";
import { loadCommunityAccess } from "@/lib/community-access";

/** Moldura comum das páginas de fichas (mesma das outras páginas internas da comunidade). */
export async function SheetPage({ slug, title, children }: { slug: string; title: string; children: React.ReactNode }) {
  const access = await loadCommunityAccess(slug);
  if (!access) notFound();
  const { current, community, membership, canSee, viewer } = access;
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <SubpageFrame title={title} icon={<FileText className="h-5 w-5 text-orbit-cyan" />} canSee={canSee} wide>
          {children}
        </SubpageFrame>
      </CommunityProvider>
    </CommunityShell>
  );
}
