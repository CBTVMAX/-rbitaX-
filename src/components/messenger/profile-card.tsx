"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Loader2, UserRound } from "lucide-react";
import { FriendButton } from "@/components/friend-button";
import { FollowButton } from "@/components/follow-button";
import { parseFriendState, type FriendState } from "@/lib/friends";
import { PRESENCE, presenceOf } from "@/lib/presence";
import type { Attachment, ChatUser } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { SharedContent } from "./conversation-info";
import { ChatAvatar, Modal } from "./ui";
import { VerifiedBadge } from "@/components/verified-badge";

type Details = { bio: string | null; coverUrl: string | null; friendState: FriendState; following: boolean };

/** Opened from the chat header: who this is, relationship actions and what you've shared. */
export function ProfileCard({
  user,
  conversationId,
  open,
  onClose,
  onOpenMedia,
  onJump,
}: {
  user: ChatUser;
  conversationId: string;
  open: boolean;
  onClose: () => void;
  onOpenMedia: (items: Attachment[], index: number) => void;
  onJump: (id: string) => void;
}) {
  const { supabase, me } = useMessenger();
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setDetails(null);
    Promise.all([
      supabase.from("User").select("bio, coverUrl").eq("id", user.id).maybeSingle(),
      supabase.rpc("friendship_state", { other_user_id: user.id }),
      supabase.from("Follow").select("id").eq("followerId", me.id).eq("followingId", user.id).maybeSingle(),
    ]).then(([u, f, follow]) => {
      if (cancel) return;
      setDetails({
        bio: u.data?.bio ?? null,
        coverUrl: u.data?.coverUrl ?? null,
        friendState: parseFriendState(f.data as string),
        following: !!follow.data,
      });
    });
    return () => {
      cancel = true;
    };
  }, [open, user.id, me.id, supabase]);

  const presence = PRESENCE[presenceOf(user.presence)];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="-mx-5 -mt-1">
        <div
          className="relative h-24 bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/35 to-orbit-pink/30 bg-cover bg-center"
          style={details?.coverUrl ? { backgroundImage: `url(${details.coverUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-space-surface via-transparent" />
        </div>
        <div className="-mt-12 flex flex-col items-center px-5 text-center">
          <span className="rounded-full ring-4 ring-space-surface">
            <ChatAvatar name={user.name} url={user.avatarUrl} size={88} frame={user.avatarFrame} />
          </span>
          <h2 className="mt-3 flex items-center gap-1.5 font-display text-xl font-bold text-white">
            {user.name}
            {user.isVerified && <VerifiedBadge className="h-5 w-5" />}
          </h2>
          <p className="text-sm text-white/50">@{user.username}</p>
          <p className={clsx("mt-1 flex items-center gap-1.5 text-xs font-medium", presence.text)}>
            <span className={clsx("h-2 w-2 rounded-full", presence.dot)} /> {presence.label}
          </p>
          {details === null ? (
            <Loader2 className="mt-4 h-5 w-5 animate-spin text-white/40" />
          ) : (
            <>
              {details.bio && <p className="mt-3 line-clamp-3 max-w-xs text-sm text-white/70">{details.bio}</p>}
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <FriendButton targetUserId={user.id} initialState={details.friendState} className="w-full" />
                <FollowButton targetUserId={user.id} currentUserId={me.id} initiallyFollowing={details.following} variant="outline" className="w-full" />
              </div>
              <Link
                href={`/perfil/${user.username}`}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/5"
              >
                <UserRound className="h-4 w-4" /> Ver perfil
              </Link>
            </>
          )}
        </div>
        <div className="mt-5 border-t border-white/[0.07] px-5 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Compartilhado entre vocês</p>
          <SharedContent
            conversationId={conversationId}
            compact
            onOpenMedia={(items, i) => {
              onClose();
              onOpenMedia(items, i);
            }}
            onJump={(id) => {
              onClose();
              onJump(id);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
