import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { FriendsHub, type HubPerson } from "@/components/friends-hub";

export const dynamic = "force-dynamic";

type Row = { requesterId: string; addresseeId: string; status: string; createdAt: string; respondedAt: string | null };

/**
 * Amigos no estilo VK: pedidos recebidos, possíveis amigos (amigos de amigos), meus amigos,
 * pedidos enviados, seguidores (quem segue e ainda não é amigo), quem eu sigo e bloqueados.
 * Ao virar amigo, a pessoa sai de Seguidores/Seguindo e passa para Meus amigos.
 */
export default async function AmigosPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const me = current.authId;
  const supabase = await createClient();

  // Visto: o contador de Amigos zera (os pedidos continuam listados até serem respondidos).
  await supabase.rpc("mark_friend_requests_seen");

  const [{ data: rows }, { data: blockRows }, { data: followerRows }, { data: followingRows }] = await Promise.all([
    supabase
      .from("Friendship")
      .select("requesterId, addresseeId, status, createdAt, respondedAt")
      .or(`requesterId.eq.${me},addresseeId.eq.${me}`)
      .order("createdAt", { ascending: false })
      .limit(1000),
    supabase.from("Block").select("blockedId, createdAt").eq("blockerId", me).order("createdAt", { ascending: false }).limit(500),
    supabase.from("Follow").select("followerId, status, createdAt").eq("followingId", me).order("createdAt", { ascending: false }).limit(1000),
    supabase.from("Follow").select("followingId, status, createdAt").eq("followerId", me).order("createdAt", { ascending: false }).limit(1000),
  ]);

  const mine = (rows ?? []) as Row[];
  const other = (r: Row) => (r.requesterId === me ? r.addresseeId : r.requesterId);
  const accepted = mine.filter((r) => r.status === "accepted");
  const incoming = mine.filter((r) => r.status === "pending" && r.addresseeId === me);
  const outgoing = mine.filter((r) => r.status === "pending" && r.requesterId === me);

  const friendIds = new Set(accepted.map(other));
  const incomingIds = new Set(incoming.map((r) => r.requesterId));
  const outgoingIds = new Set(outgoing.map((r) => r.addresseeId));
  const blockedIds = new Set((blockRows ?? []).map((b) => b.blockedId));
  const related = (id: string) => id === me || friendIds.has(id) || incomingIds.has(id) || outgoingIds.has(id) || blockedIds.has(id);

  // Seguidores e seguindo mostram só quem ainda não é amigo (nem tem pedido em andamento).
  const followers = (followerRows ?? []).filter((f) => !related(f.followerId));
  const following = (followingRows ?? []).filter((f) => !related(f.followingId));

  // Amizades dos meus amigos: dão os "amigos em comum" e as sugestões (amigos de amigos).
  const friendList = Array.from(friendIds);
  const { data: fofRows } = friendList.length
    ? await supabase
        .from("Friendship")
        .select("requesterId, addresseeId")
        .eq("status", "accepted")
        .or(`requesterId.in.(${friendList.slice(0, 300).join(",")}),addresseeId.in.(${friendList.slice(0, 300).join(",")})`)
        .limit(5000)
    : { data: [] as { requesterId: string; addresseeId: string }[] };

  // mutual.get(x) = meus amigos que também são amigos de x
  const mutual = new Map<string, Set<string>>();
  for (const f of fofRows ?? []) {
    const pairs: [string, string][] = [
      [f.requesterId, f.addresseeId],
      [f.addresseeId, f.requesterId],
    ];
    for (const [friend, person] of pairs) {
      if (!friendIds.has(friend) || person === me) continue;
      const set = mutual.get(person) ?? new Set<string>();
      set.add(friend);
      mutual.set(person, set);
    }
  }

  const suggestionIds = Array.from(mutual.entries())
    .filter(([id]) => !related(id))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 30)
    .map(([id]) => id);

  const ids = Array.from(
    new Set([
      ...friendIds,
      ...incomingIds,
      ...outgoingIds,
      ...blockedIds,
      ...followers.map((f) => f.followerId),
      ...following.map((f) => f.followingId),
      ...suggestionIds,
      ...Array.from(mutual.values()).flatMap((s) => Array.from(s).slice(0, 3)),
    ])
  );
  const { data: people } = ids.length
    ? await supabase.from("User").select("id, name, username, avatarUrl, presence, bio, isVerified").in("id", ids.slice(0, 2000))
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const person = (id: string, at?: string | null): HubPerson | null => {
    const p = byId.get(id);
    if (!p) return null;
    const common = Array.from(mutual.get(id) ?? []);
    return {
      id: p.id,
      name: p.name,
      username: p.username,
      avatarUrl: p.avatarUrl,
      presence: p.presence,
      subtitle: (p.bio ?? "").split("\n")[0].slice(0, 80) || null,
      verified: !!p.isVerified,
      mutualCount: common.length,
      mutualAvatars: common
        .slice(0, 3)
        .map((m) => byId.get(m))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => ({ name: m.name, avatarUrl: m.avatarUrl })),
      at: at ?? null,
    };
  };
  const list = <T,>(items: T[], pick: (x: T) => [string, string | null | undefined]) =>
    items.map((x) => person(...pick(x))).filter((p): p is HubPerson => !!p);

  return (
    <FriendsHub
      meId={me}
      friends={list(accepted, (r) => [other(r), r.respondedAt ?? r.createdAt])}
      incoming={list(incoming, (r) => [r.requesterId, r.createdAt])}
      outgoing={list(outgoing, (r) => [r.addresseeId, r.createdAt])}
      followers={list(followers, (f) => [f.followerId, f.createdAt]).map((p) => ({
        ...p,
        pendingFollow: (followerRows ?? []).find((f) => f.followerId === p.id)?.status === "pending",
      }))}
      following={list(following, (f) => [f.followingId, f.createdAt])}
      suggestions={list(suggestionIds, (id) => [id, null])}
      blocked={list(blockRows ?? [], (b) => [b.blockedId, b.createdAt])}
    />
  );
}
