"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStoreToast } from "@/components/store/store-view";
import { accentOf, type Community, type Membership, type Role, type Viewer } from "@/lib/communities";
import { CommunityContext, type CommunityCtx } from "./context";

/** Community context for the inner pages (Avisos, Eventos, Sobre…): data client, role, toasts and the community accent. */
export function CommunityProvider({
  community,
  viewer,
  membership,
  canAsCommunity = false,
  children,
}: {
  community: Community;
  viewer: Viewer;
  membership: Membership;
  canAsCommunity?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [role, setRole] = useState<Role | null>(membership.role);
  const ctx: CommunityCtx = useMemo(
    () => ({ community, viewer, role, setRole, membership, supabase, toast, canAsCommunity, refresh: () => router.refresh() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community, viewer, role, membership, supabase, canAsCommunity]
  );
  return (
    <CommunityContext.Provider value={ctx}>
      <div style={{ ["--app-accent" as string]: accentOf(community.accentColor).rgb }}>{children}</div>
      {node}
    </CommunityContext.Provider>
  );
}
