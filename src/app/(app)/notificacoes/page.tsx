import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Avatar } from "@/components/post-card";
import { timeAgo } from "@/lib/format";
import Link from "next/link";
import { FriendRequestActions } from "@/components/friend-button";
import { FollowRequestActions } from "@/components/follow-button";
import { NavBack } from "@/components/nav-back";
import { AtSign, Bell, CalendarDays, CircleDot, Heart, Megaphone, MessageCircle, MessagesSquare, Repeat2, Reply, ShieldAlert, ShieldCheck, UserCheck, UserPlus, Users, VolumeX } from "lucide-react";

export const dynamic = "force-dynamic";

// Sensible landing page per type when a notification has no actor and no explicit href,
// so tapping a notification NEVER links back to the notifications list itself.
const TYPE_FALLBACK: Record<string, string> = {
  security: "/configuracoes/seguranca",
  friend_request: "/amigos",
  follow_request: "/amigos",
  friend_accept: "/amigos",
};

/** Where a notification card goes when tapped. Guarantees it always leaves this page. */
function notifTarget(type: string, href: string | null, actor: { username: string } | null | undefined): string {
  // A stored self-href is treated as "no destination" so tapping never reloads this list.
  const link = href && href !== "/notificacoes" ? href : null;
  const isCommunity = type.startsWith("community_") || !!link?.startsWith("/comunidades/");
  if (isCommunity && link) return link;
  if (actor) return `/perfil/${actor.username}`;
  if (link) return link;
  return TYPE_FALLBACK[type] ?? "/feed";
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  follow_request: UserPlus,
  security: ShieldAlert,
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
  community_member: UserPlus,
  community_mute: VolumeX,
  community_event: CalendarDays,
  community_invite: Users,
  community_repost: Repeat2,
  community_discussion_like: Heart,
  comment_reply: Reply,
  story_reaction: CircleDot,
};

export default async function NotificacoesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = await createClient();
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

  // Marca TODAS as não-lidas como lidas (não só as 50 exibidas), para o sino zerar de fato.
  const hasUnread = (notifications ?? []).some((n) => !n.isRead);
  if (hasUnread) {
    await supabase.from("Notification").update({ isRead: true }).eq("userId", current.authId).eq("isRead", false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <NavBack fallback="/feed" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:bg-white/5 hover:text-white md:hidden" />
        <h1 className="font-display text-2xl font-bold text-white">Notificações</h1>
      </div>

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
                href={notifTarget(n.type, n.href, actor)}
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
              {n.type === "follow_request" && n.actorId && <FollowRequestActions followerId={n.actorId} />}
              {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-orbit-pink" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
