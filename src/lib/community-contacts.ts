import type { SupabaseClient } from "@supabase/supabase-js";

/** Contato da comunidade: uma pessoa e o cargo livre escolhido pela administração ("President MC®"). */
export type CommunityContact = { title: string; user: { id: string; name: string; username: string; avatarUrl: string | null } };
export type ContactRow = { userId: string; title: string };

/** Lê os contatos salvos. Devolve null enquanto a coluna não existir no banco (migração pendente). */
export async function loadCommunityContacts(supabase: SupabaseClient, communityId: string): Promise<CommunityContact[] | null> {
  const { data, error } = await supabase.from("Community").select("*").eq("id", communityId).maybeSingle();
  if (error || !data || !("contacts" in data)) return null;
  const rows = (Array.isArray(data.contacts) ? data.contacts : []) as ContactRow[];
  if (!rows.length) return [];
  const { data: users } = await supabase.from("User").select("id, name, username, avatarUrl").in("id", rows.map((r) => r.userId));
  const byId = new Map((users ?? []).map((u) => [u.id as string, u as CommunityContact["user"]]));
  return rows.flatMap((r) => {
    const user = byId.get(r.userId);
    return user ? [{ title: r.title ?? "", user }] : [];
  });
}
