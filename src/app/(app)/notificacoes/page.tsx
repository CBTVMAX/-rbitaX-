import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Avatar } from "@/components/post-card";
import { timeAgo } from "@/lib/format";
import Link from "next/link";
import { FriendRequestActions } from "@/components/friend-button";
import { AtSign, Bell, Heart, Megaphone, MessageCircle, MessagesSquare, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  friend_request: UserPlus,
  friend_accept: UserCheck,
  community_post: Users,
  community_announcement: Megaphone,
  community_discussion: MessagesSquare,
  community_reply: MessagesSquare,
  community_mention: AtSign,
  community_join_request: UserPlus,
  community_join_approved: UserCheck,
  community_role: ShieldCheck,
};

export default async function NotificacoesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const { data: notifications } = await supabase
    .from("Notification")
    .select("id, type, title, message, isRead, createdAt, actorId, href")
    .eq("userId", current.authId)
    .order("createdAt", { ascending: false })
    .limit(50);

  const actorIds = Array.from(new Set((notifications ?? []).map((n) => n.actorId).filter(Boolean))) as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("User").select("id, name, username, avatarUrl").in("id", actorIds)
    : { data: [] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));

  const unreadIds = (notifications ?? []).filter((n) => !n.isRead).map((n) => n.id);
  if (unreadIds.length) {
    await supabase.from("Notification").update({ isRead: true }).in("id", unreadIds);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-white">Notificações</h1>

      {(notifications ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
          <Bell className="mx-auto mb-2 h-6 w-6 text-white/20" />
          Nenhuma notificação por enquanto.
        </div>
      )}

      <div className="space-y-2">
        {(notifications ?? []).map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const actor = n.actorId ? actorById.get(n.actorId) : null;
          // Community notifications carry their own text and open the post, discussion or management page.
          const community = n.type.startsWith("community_") || !!n.href?.startsWith("/comunidades/");
          return (
            <div
              key={n.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-space-card p-3"
            >
              <Link
                href={community && n.href ? n.href : actor ? `/perfil/${actor.username}` : n.href ?? "/notificacoes"}
                className="flex min-w-[12rem] flex-1 items-center gap-3"
              >
                {actor ? (
                  <Avatar name={actor.name} url={actor.avatarUrl} size={36} />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <Icon className="h-4 w-4 text-orbit-cyan" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    <strong>{community && n.type.startsWith("community_") ? n.title : actor?.name ?? n.title}</strong> {n.message}
                  </p>
                  <p className="text-xs text-white/40">{timeAgo(n.createdAt)}</p>
                </div>
              </Link>
              {n.type === "friend_request" && n.actorId && <FriendRequestActions requesterId={n.actorId} />}
              {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-orbit-pink" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
