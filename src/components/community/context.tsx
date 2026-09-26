"use client";

import { createContext, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Community, Role, Viewer } from "@/lib/communities";

export type CommunityCtx = {
  community: Community;
  viewer: Viewer;
  role: Role | null;
  supabase: SupabaseClient<Database>;
  toast: (text: string, error?: boolean) => void;
  /** Ask the page to reload its data after a change. */
  refresh: () => void;
};

export const CommunityContext = createContext<CommunityCtx | null>(null);

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity outside CommunityContext");
  return ctx;
}
