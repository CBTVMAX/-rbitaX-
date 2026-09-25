import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, MessageCircle, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Avatar } from "@/components/post-card";
import { FriendButton, FriendRequestActions } from "@/components/friend-button";
import { PresenceDot } from "@/components/presence-picker";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

type Person = { id: string; name: string; username: string; avatarUrl: string | null; presence: string };

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-orbit-purple" /> {title}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{count}</span>
      </h2>
      {children}
    </section>
  );
}

export default async function AmigosPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const me = current.authId;
  const supabase = createClient();

  // Seen: the Amigos counter clears (pending requests stay listed until answered).
  await supabase.rpc("mark_friend_requests_seen");

  const { data: rows } = await supabase
    .from("Friendship")
    .select("requesterId, addresseeId, status, createdAt")
    .or(`requesterId.eq.${me},addresseeId.eq.${me}`)
    .order("createdAt", { ascending: false })
    .limit(500);

  const incoming = (rows ?? []).filter((r) => r.status === "pending" && r.addresseeId === me);
  const outgoing = (rows ?? []).filter((r) => r.status === "pending" && r.requesterId === me);
  const accepted = (rows ?? []).filter((r) => r.status === "accepted");
  const other = (r: { requesterId: string; addresseeId: string }) => (r.requesterId === me ? r.addresseeId : r.requesterId);

  const ids = Array.from(new Set((rows ?? []).map(other)));
  const { data: people } = ids.length
    ? await supabase.from("User").select("id, name, username, avatarUrl, presence").in("id", ids)
    : { data: [] as Person[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p as Person]));

  const friends = accepted
    .map((r) => byId.get(other(r)))
    .filter((p): p is Person => !!p)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const personLink = (p: Person, sub: React.ReactNode) => (
    <Link href={`/perfil/${p.username}`} className="flex min-w-[10rem] flex-1 items-center gap-3">
      <span className="relative shrink-0">
        <Avatar name={p.name} url={p.avatarUrl} size={44} />
        <PresenceDot value={p.presence} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-space-surface" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{p.name}</span>
        <span className="block truncate text-xs text-white/50">{sub}</span>
      </span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 md:px-4 md:py-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white md:text-2xl">Amigos</h1>
        <p className="mt-1 text-sm text-white/60">Pedidos de amizade e as pessoas com quem você pode conversar.</p>
      </div>

      {incoming.length > 0 && (
        <Section icon={UserPlus} title="Pedidos de amizade" count={incoming.length}>
          <p className="-mt-1 mb-3 text-xs text-white/50">
            Ao aceitar, vocês viram amigos e o chat é liberado. Se recusar, a pessoa continua como seguidora.
          </p>
          <div className="space-y-2">
            {incoming.map((r) => {
              const p = byId.get(r.requesterId);
              if (!p) return null;
              return (
                <div key={r.requesterId} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
                  {personLink(p, <>@{p.username} · {timeAgo(r.createdAt)}</>)}
                  <FriendRequestActions requesterId={p.id} />
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section icon={Users} title="Seus amigos" count={friends.length}>
        {friends.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/45">
            Você ainda não tem amigos no ÓrbitaX. Encontre pessoas em{" "}
            <Link href="/explorar?tab=pessoas" className="text-orbit-blue hover:underline">
              Explorar
            </Link>{" "}
            e toque em &ldquo;Adicionar amigo&rdquo;.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {friends.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
                {personLink(p, <>@{p.username}</>)}
                <Link
                  href={`/mensagens?com=${encodeURIComponent(p.username)}`}
                  aria-label={`Conversar com ${p.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section icon={Clock} title="Pedidos enviados" count={outgoing.length}>
          <div className="space-y-2">
            {outgoing.map((r) => {
              const p = byId.get(r.addresseeId);
              if (!p) return null;
              return (
                <div key={r.addresseeId} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
                  {personLink(p, <>Enviado {timeAgo(r.createdAt)}</>)}
                  <FriendButton targetUserId={p.id} initialState="outgoing" />
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
