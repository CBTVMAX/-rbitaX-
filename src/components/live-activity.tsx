"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Bell, MessageCircle, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type LiveCounts = { messages: number; friendRequests: number; notifications: number };

type Toast = {
  id: string;
  kind: "message" | "friend" | "notification";
  title: string;
  body: string;
  href: string;
  avatarUrl: string | null;
};

const EMPTY: LiveCounts = { messages: 0, friendRequests: 0, notifications: 0 };

const LiveContext = createContext<{ counts: LiveCounts; refresh: () => void }>({ counts: EMPTY, refresh: () => {} });

export function useLiveCounts() {
  return useContext(LiveContext);
}

/** VK-style counter pill ("3", "99+"). Renders nothing at zero. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} ${count === 1 ? "novo" : "novos"}`}
      className={clsx(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-orbit-pink px-1.5 text-[11px] font-bold leading-none text-snow shadow-[0_0_10px_rgba(236,72,153,0.55)]",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Keeps the menu counters and the on-screen alerts live for the signed-in user.
 * Listens to Supabase Realtime (messages, notifications, friend requests); the database
 * policies make sure each person only receives their own events.
 */
export function LiveActivityProvider({
  userId,
  initialCounts = EMPTY,
  children,
}: {
  userId: string;
  initialCounts?: LiveCounts;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const [counts, setCounts] = useState<LiveCounts>(initialCounts);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_badge_counts");
    const row = Array.isArray(data) ? data[0] : null;
    if (row) setCounts({ messages: row.messages, friendRequests: row.friendRequests, notifications: row.notifications });
  }, [supabase]);

  // Several events can arrive together (e.g. accept = notification + follow): refresh once.
  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 250);
  }, [load]);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const person = useCallback(
    async (id: string | null) => {
      if (!id) return null;
      const { data } = await supabase.from("User").select("name, username, avatarUrl").eq("id", id).maybeSingle();
      return data;
    },
    [supabase]
  );

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`live:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification", filter: `userId=eq.${userId}` },
        async (payload) => {
          refresh();
          const n = payload.new as { type: string; message: string; title: string; actorId: string | null; href: string | null };
          if (pathRef.current === "/notificacoes") router.refresh();
          if (n.type === "friend_request" || n.type === "friend_accept") {
            if (pathRef.current.startsWith("/perfil/") || pathRef.current === "/amigos") router.refresh();
          }
          const actor = await person(n.actorId);
          pushToast({
            kind: n.type.startsWith("friend") ? "friend" : "notification",
            title: actor?.name ?? n.title,
            body: n.message,
            href: n.type === "friend_request" ? "/amigos" : actor ? `/perfil/${actor.username}` : n.href ?? "/notificacoes",
            avatarUrl: actor?.avatarUrl ?? null,
          });
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Notification", filter: `userId=eq.${userId}` }, refresh)
      // Deletes are not filtered per user by Realtime, so they are left to the periodic check below.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Friendship", filter: `addresseeId=eq.${userId}` }, () => {
        refresh();
        if (pathRef.current === "/amigos") router.refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Friendship", filter: `requesterId=eq.${userId}` }, () => {
        if (pathRef.current === "/amigos" || pathRef.current.startsWith("/perfil/")) router.refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, async (payload) => {
        const m = payload.new as { senderId: string; content: string; conversationId: string };
        if (m.senderId === userId) return;
        refresh();
        // Inside Messenger the conversation itself shows the new message.
        if (pathRef.current.startsWith("/mensagens")) return;
        const sender = await person(m.senderId);
        pushToast({
          kind: "message",
          title: sender?.name ?? "Nova mensagem",
          body: m.content.length > 90 ? `${m.content.slice(0, 90)}…` : m.content,
          href: sender ? `/mensagens?com=${encodeURIComponent(sender.username)}` : "/mensagens",
          avatarUrl: sender?.avatarUrl ?? null,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message" }, refresh)
      .subscribe();

    // Safety net: catch anything missed while the tab was asleep or offline.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    const interval = setInterval(load, 30_000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [supabase, userId, load, refresh, pushToast, person, router]);

  // Reading notifications/messages elsewhere in the app changes the counts.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // "(3) Órbita X" in the browser tab, like VK.
  useEffect(() => {
    const total = counts.messages + counts.notifications;
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [counts, pathname]);

  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);

  return (
    <LiveContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-16 z-50 flex flex-col items-stretch gap-2 md:inset-x-auto md:right-5 md:top-20 md:w-80"
      >
        {toasts.map((t) => {
          const Icon = t.kind === "message" ? MessageCircle : t.kind === "friend" ? UserPlus : Bell;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-orbit-purple/40 bg-space-surface/95 p-3 shadow-2xl backdrop-blur"
            >
              <Link
                href={t.href}
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="relative shrink-0">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-orbit-gradient text-snow">
                    {t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-space-surface bg-orbit-pink text-snow">
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{t.title}</span>
                  <span className="line-clamp-2 text-xs text-white/65">{t.body}</span>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="shrink-0 rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </LiveContext.Provider>
  );
}
