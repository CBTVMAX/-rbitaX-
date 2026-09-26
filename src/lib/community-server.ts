import { createClient } from "@/lib/supabase/server";
import { COMMUNITY_COLUMNS, type Community } from "@/lib/communities";

/** Community by URL slug or by @username (RLS applies). */
export async function findCommunity(key: string) {
  const supabase = createClient();
  const k = decodeURIComponent(key).toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9._-]{1,60}$/.test(k)) return null;
  const { data } = await supabase.from("Community").select(COMMUNITY_COLUMNS).eq("slug", k).maybeSingle();
  if (data) return data as unknown as Community;
  const { data: byUser } = await supabase.from("Community").select(COMMUNITY_COLUMNS).eq("username", k).maybeSingle();
  return (byUser as unknown as Community) ?? null;
}
