"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveCounts } from "@/components/live-activity";
import type { ChatUser, Conversation } from "@/lib/messenger/types";
import { MessengerContext, type MessengerContextValue } from "./context";
import { ConversationList, EmptyUniverse } from "./conversation-list";
import { ChatView } from "./chat-view";
import { NewConversationDialog } from "./new-conversation";
import { OrbitIllustration, PrimaryButton } from "./ui";

type Toast = { id: number; text: string; tone: "info" | "error" };

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

function useIsSplit() {
  const [split, setSplit] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setSplit(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return split;
}

/** Phones: the open chat is its own full-screen screen, above the app header and tab bar. */
export function MobileChat({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  if (typeof document === "undefined") return null;
  const host = document.querySelector("[data-app-theme]") ?? document.body;
  return createPortal(<div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-space-bg">{children}</div>, host);
}

function normalizeRow(row: Record<string, unknown>): Conversation {
  return {
    ...(row as unknown as Conversation),
    otherUser: (row.otherUser as ChatUser | null) ?? null,
    lastMessage: (row.lastMessage as Conversation["lastMessage"]) ?? null,
  };
}

export function DesktopMessenger({
  me,
  presence,
  initialConversations,
  initialActiveId = null,
  notice = null,
}: {
  me: ChatUser;
  presence: string;
  initialConversations: Record<string, unknown>[];
  initialActiveId?: string | null;
  notice?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { refresh: refreshCounts } = useLiveCounts();
  const [conversations, setConversations] = useState<Conversation[]>(() => initialConversations.map(normalizeRow));
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [banner, setBanner] = useState<string | null>(notice);
  const [newOpen, setNewOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const phone = useIsPhone();
  const split = useIsSplit();
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, tone: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-1), { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === "error" ? 5000 : 2800);
  }, []);

  const reloadConversations = useCallback(async () => {
    const { data } = await supabase.rpc("my_conversations");
    if (data) setConversations((data as unknown as Record<string, unknown>[]).map(normalizeRow));
  }, [supabase]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      reloadConversations();
      refreshCounts();
    }, 300);
  }, [reloadConversations, refreshCounts]);

  const patchConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return patch.sortAt ? [...next].sort((a, b) => (b.sortAt ?? "").localeCompare(a.sortAt ?? "")) : next;
    });
  }, []);

  // URL keeps the open conversation (?c=…): refresh, sharing a link and the phone's back button work.
  const openConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      const url = `/mensagens?c=${encodeURIComponent(id)}`;
      if (window.matchMedia("(max-width: 1023px)").matches) window.history.pushState({ chat: id }, "", url);
      else window.history.replaceState({ chat: id }, "", url);
    },
    []
  );

  const closeConversation = useCallback(() => {
    if (window.history.state?.chat) window.history.back();
    else {
      setActiveId(null);
      window.history.replaceState(null, "", "/mensagens");
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get("c");
      setActiveId(id);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (initialActiveId) window.history.replaceState(null, "", `/mensagens?c=${encodeURIComponent(initialActiveId)}`);
  }, [initialActiveId]);

  const startDirect = useCallback(
    async (user: ChatUser) => {
      const { data: id, error } = await supabase.rpc("get_or_create_dm", { other_user_id: user.id });
      if (error || !id) {
        setBanner(`Você e ${user.name} ainda não são amigos. O chat é liberado quando o pedido de amizade for aceito.`);
        return;
      }
      await reloadConversations();
      openConversation(id);
    },
    [supabase, reloadConversations, openConversation]
  );

  // The list follows everything that happens in my conversations (the database only sends me my own).
  useEffect(() => {
    const channel = supabase
      .channel(`messenger:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message" }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Conversation" }, scheduleReload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ConversationMember", filter: `userId=eq.${me.id}` }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Friendship" }, scheduleReload)
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && scheduleReload();
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(scheduleReload, 60_000);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [supabase, me.id, scheduleReload]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const ctx: MessengerContextValue = useMemo(
    () => ({ me, supabase, conversations, toast, reloadConversations, patchConversation, openConversation, startDirect }),
    [me, supabase, conversations, toast, reloadConversations, patchConversation, openConversation, startDirect]
  );

  const chat = active ? (
    <ChatView key={active.id} c={active} visible={split || !!activeId} showBack={!split} onBack={closeConversation} />
  ) : null;

  return (
    <MessengerContext.Provider value={ctx}>
      <div className="flex h-[calc(100dvh-9.5rem)] overflow-hidden md:h-[calc(100dvh-4rem)]">
        <aside
          className={clsx(
            "h-full min-h-0 w-full shrink-0 border-white/10 bg-space-bg/60 lg:flex lg:w-[340px] lg:flex-col lg:border-r xl:w-[360px]",
            active && !split ? "hidden" : "flex flex-col"
          )}
        >
          <ConversationList
            activeId={activeId}
            onOpen={openConversation}
            onNew={() => setNewOpen(true)}
            presence={presence}
            banner={banner}
            onCloseBanner={() => setBanner(null)}
          />
        </aside>

        {phone ? (
          chat && <MobileChat>{chat}</MobileChat>
        ) : (
          <main className={clsx("h-full min-h-0 min-w-0 flex-1", !active && !split && "hidden")}>
            {chat ?? (
              <div className="chat-space-bg relative flex h-full flex-col items-center justify-center px-6 text-center">
                {conversations.length === 0 ? (
                  <EmptyUniverse onFind={() => setNewOpen(true)} />
                ) : (
                  <>
                    <OrbitIllustration />
                    <p className="mt-6 font-display text-lg font-semibold text-white">Suas conversas, em órbita.</p>
                    <p className="mt-1.5 max-w-xs text-sm text-white/55">Escolha uma conversa ao lado ou comece uma nova.</p>
                    <PrimaryButton onClick={() => setNewOpen(true)} className="mt-6">
                      <PenSquare className="h-4 w-4" /> Nova conversa
                    </PrimaryButton>
                  </>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      <NewConversationDialog open={newOpen} onClose={() => setNewOpen(false)} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "animate-pop-in flex max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
              t.tone === "error" ? "border-red-500/40 bg-space-surface/95 text-red-300" : "border-white/10 bg-space-surface/95 text-white"
            )}
          >
            {t.tone === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
            {t.text}
          </div>
        ))}
      </div>
    </MessengerContext.Provider>
  );
}
