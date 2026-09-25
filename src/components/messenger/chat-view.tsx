"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { useLiveCounts } from "@/components/live-activity";
import {
  audioDuration,
  chatFilePath,
  compressImage,
  copyChatFile,
  extensionOf,
  MAX_UPLOAD_BYTES,
  registerLocalUrl,
  removeChatFiles,
  uploadChatFile,
  uploadMime,
  videoInfo,
  voiceWaveform,
} from "@/lib/messenger/media";
import { chatThemeStyle } from "@/lib/messenger/themes";
import { isWallpaper, wallpaperStyle } from "@/lib/messenger/wallpapers";
import { messagePreview, toDate } from "@/lib/messenger/format";
import {
  conversationTitle,
  isMuted,
  MESSAGE_COLUMNS,
  toMessage,
  type Attachment,
  type ChatMessage,
  type ChatUser,
  type Conversation,
  type Member,
  type MessageMeta,
  type MessageType,
  type PollVote,
  type Reaction,
} from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ChatHeader } from "./chat-header";
import { ChatIntro, deliveryState, MessageList } from "./message-list";
import { ComposerLocked, MessageComposer, type ComposerApi } from "./message-composer";
import { DeleteDialog, MessageActionSheet, type MessageAction } from "./message-actions";
import { ConversationInfo } from "./conversation-info";
import { ContactDialog, ForwardDialog, LocationDialog, PollDialog } from "./dialogs";
import { MediaViewer } from "./media-viewer";
import { ProfileCard } from "./profile-card";
import { GhostButton, Modal } from "./ui";

const PAGE = 40;
const INFO_KEY = "orbitax:messenger-info-open";

type Upload = { path: string; blob: Blob; mime: string; done?: boolean };
type Outgoing = { type: MessageType; content: string; attachments: Attachment[]; meta: MessageMeta; replyToId: string | null; uploads: Upload[] };

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export function ChatView({
  c,
  visible,
  showBack,
  onBack,
}: {
  c: Conversation;
  /** The chat is on screen (on phones the list and the chat are separate screens). */
  visible: boolean;
  showBack: boolean;
  onBack: () => void;
}) {
  const { supabase, me, toast, patchConversation, reloadConversations } = useMessenger();
  const { refresh: refreshCounts } = useLiveCounts();
  const wide = useMediaQuery("(min-width: 1280px)");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [unreadFromId, setUnreadFromId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [infoPref, setInfoPref] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sheetFor, setSheetFor] = useState<ChatMessage | null>(null);
  const [deleteFor, setDeleteFor] = useState<ChatMessage | null>(null);
  const [forwardFor, setForwardFor] = useState<ChatMessage | null>(null);
  const [dialog, setDialog] = useState<null | "poll" | "location" | "contact">(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [viewer, setViewer] = useState<{ items: Attachment[]; locals?: string[]; index: number; caption?: string } | null>(null);
  const outgoing = useRef(new Map<string, Outgoing>());
  const unreadAtOpen = useRef(c.unread);
  const cRef = useRef(c);
  cRef.current = c;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    try {
      const v = localStorage.getItem(INFO_KEY);
      setInfoPref(v === null ? null : v === "1");
    } catch {
      /* private mode */
    }
  }, []);
  const infoColumn = wide && (infoPref ?? true);

  function toggleInfo() {
    if (wide) {
      const next = !infoColumn;
      setInfoPref(next);
      try {
        localStorage.setItem(INFO_KEY, next ? "1" : "0");
      } catch {
        /* private mode */
      }
    } else setDrawerOpen((v) => !v);
  }

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const othersReadAt = useMemo(() => {
    const others = members.filter((m) => m.id !== me.id);
    if (!others.length) return c.othersReadAt;
    return others.reduce<string | null>((min, m) => {
      const v = m.lastReadAt;
      if (!v) return min;
      return !min || toDate(v) < toDate(min) ? v : min;
    }, null);
  }, [members, me.id, c.othersReadAt]);
  const reactionMap = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    reactions.forEach((r) => map.set(r.messageId, [...(map.get(r.messageId) ?? []), r]));
    return map;
  }, [reactions]);
  const voteMap = useMemo(() => {
    const map = new Map<string, PollVote[]>();
    votes.forEach((v) => map.set(v.messageId, [...(map.get(v.messageId) ?? []), v]));
    return map;
  }, [votes]);

  // ── Loading ────────────────────────────────────────────────────────────────
  const loadExtras = useCallback(
    async (ids: string[], replace: boolean) => {
      if (!ids.length) {
        if (replace) {
          setReactions([]);
          setVotes([]);
        }
        return;
      }
      const [r, v] = await Promise.all([
        supabase.from("MessageReaction").select("id, messageId, userId, emoji").in("messageId", ids),
        supabase.from("PollVote").select("id, messageId, userId, optionIndex").in("messageId", ids),
      ]);
      const rs = (r.data ?? []) as Reaction[];
      const vs = (v.data ?? []) as PollVote[];
      setReactions((prev) => (replace ? rs : [...prev.filter((x) => !ids.includes(x.messageId)), ...rs]));
      setVotes((prev) => (replace ? vs : [...prev.filter((x) => !ids.includes(x.messageId)), ...vs]));
    },
    [supabase]
  );

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("ConversationMember")
      .select("userId, role, lastReadAt, user:User(id, name, username, avatarUrl, presence, avatarFrame, isVerified)")
      .eq("conversationId", c.id);
    setMembers(
      (data ?? [])
        .filter((row) => row.user)
        .map((row) => ({ ...(row.user as unknown as ChatUser), role: row.role, lastReadAt: row.lastReadAt }))
    );
  }, [supabase, c.id]);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("Message")
      .select(MESSAGE_COLUMNS)
      .eq("conversationId", c.id)
      .order("createdAt", { ascending: false })
      .limit(PAGE);
    const list = (data ?? []).map((r) => toMessage(r as Record<string, unknown>)).reverse();
    setMessages((prev) => [...list, ...prev.filter((m) => m.status && m.conversationId === c.id)]);
    setHasMore((data?.length ?? 0) === PAGE);
    setHasNewer(false);
    setLoading(false);
    loadExtras(
      list.map((m) => m.id),
      true
    );
    return list;
  }, [supabase, c.id, loadExtras]);

  useEffect(() => {
    let cancel = false;
    unreadAtOpen.current = cRef.current.unread;
    setMessages([]);
    setReactions([]);
    setVotes([]);
    setReplyTo(null);
    setHighlightId(null);
    setSearchOpen(false);
    setDrawerOpen(false);
    setUnreadFromId(null);
    loadMembers();
    supabase
      .from("MessageFavorite")
      .select("messageId")
      .eq("conversationId", c.id)
      .then(({ data }) => !cancel && setFavorites(new Set((data ?? []).map((f) => f.messageId))));
    loadLatest().then((list) => {
      if (cancel) return;
      // "Novas mensagens" marker above the first unread message.
      let n = unreadAtOpen.current;
      if (n > 0) {
        for (let i = list.length - 1; i >= 0 && n > 0; i--) {
          if (list[i].senderId !== me.id && list[i].type !== "system") {
            n--;
            if (n === 0) setUnreadFromId(list[i].id);
          }
        }
      }
    });
    return () => {
      cancel = true;
    };
  }, [c.id, supabase, me.id, loadLatest, loadMembers]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const oldest = messages.find((m) => !m.status);
    if (!oldest) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("Message")
      .select(MESSAGE_COLUMNS)
      .eq("conversationId", c.id)
      .lt("createdAt", oldest.createdAt)
      .order("createdAt", { ascending: false })
      .limit(PAGE);
    const list = (data ?? []).map((r) => toMessage(r as Record<string, unknown>)).reverse();
    setMessages((prev) => [...list.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
    setHasMore((data?.length ?? 0) === PAGE);
    setLoadingMore(false);
    loadExtras(
      list.map((m) => m.id),
      false
    );
  }, [loadingMore, hasMore, messages, supabase, c.id, loadExtras]);

  /** Opens the history around a message (search results, replies, favorites, files). */
  const jumpTo = useCallback(
    async (id: string, createdAt?: string) => {
      if (messages.some((m) => m.id === id)) {
        setHighlightId(null);
        requestAnimationFrame(() => setHighlightId(id));
        return;
      }
      let at = createdAt;
      if (!at) {
        const { data } = await supabase.from("Message").select("createdAt").eq("id", id).maybeSingle();
        at = data?.createdAt;
      }
      if (!at) {
        toast("Essa mensagem não está mais disponível.");
        return;
      }
      setLoading(true);
      const [older, newer] = await Promise.all([
        supabase.from("Message").select(MESSAGE_COLUMNS).eq("conversationId", c.id).lt("createdAt", at).order("createdAt", { ascending: false }).limit(25),
        supabase.from("Message").select(MESSAGE_COLUMNS).eq("conversationId", c.id).gte("createdAt", at).order("createdAt", { ascending: true }).limit(25),
      ]);
      const list = [
        ...(older.data ?? []).map((r) => toMessage(r as Record<string, unknown>)).reverse(),
        ...(newer.data ?? []).map((r) => toMessage(r as Record<string, unknown>)),
      ];
      setMessages(list);
      setHasMore((older.data?.length ?? 0) === 25);
      setHasNewer((newer.data?.length ?? 0) === 25);
      setLoading(false);
      setUnreadFromId(null);
      setHighlightId(id);
      loadExtras(
        list.map((m) => m.id),
        true
      );
    },
    [messages, supabase, c.id, loadExtras, toast]
  );

  // ── Reading ────────────────────────────────────────────────────────────────
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(async () => {
      if (!visibleRef.current || document.visibilityState !== "visible") return;
      patchConversation(c.id, { unread: 0 });
      await supabase.rpc("mark_conversation_read", { conversation_id: c.id });
      refreshCounts();
    }, 350);
  }, [c.id, supabase, patchConversation, refreshCounts]);

  useEffect(() => {
    if (visible) markRead();
    const onVisible = () => document.visibilityState === "visible" && visibleRef.current && cRef.current.unread > 0 && markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [visible, markRead]);

  // ── Live updates for this conversation ──────────────────────────────────────
  useEffect(() => {
    const filter = `conversationId=eq.${c.id}`;
    const channel = supabase
      .channel(`chat:${c.id}:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter }, (payload) => {
        const m = toMessage(payload.new as Record<string, unknown>);
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev.map((x) => (x.id === m.id ? { ...m, localUrls: x.localUrls } : x));
          return [...prev, m];
        });
        if (m.senderId !== me.id) markRead();
        if (m.type === "system") {
          loadMembers();
          reloadConversations();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message", filter }, (payload) => {
        const m = toMessage(payload.new as Record<string, unknown>);
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...m, localUrls: x.localUrls } : x)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "MessageReaction", filter }, (payload) => {
        const r = payload.new as Reaction;
        setReactions((prev) => [...prev.filter((x) => x.id !== r.id && !(x.messageId === r.messageId && x.userId === r.userId)), r]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "MessageReaction", filter }, (payload) => {
        const r = payload.new as Reaction;
        setReactions((prev) => [...prev.filter((x) => x.id !== r.id && !(x.messageId === r.messageId && x.userId === r.userId)), r]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "MessageReaction" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setReactions((prev) => prev.filter((x) => x.id !== id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "PollVote", filter }, (payload) => {
        const v = payload.new as PollVote;
        setVotes((prev) => [...prev.filter((x) => x.id !== v.id && !(x.messageId === v.messageId && x.userId === v.userId && x.optionIndex === v.optionIndex)), v]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "PollVote" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setVotes((prev) => prev.filter((x) => x.id !== id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ConversationMember", filter }, (payload) => {
        const row = payload.new as { userId: string; role: string; lastReadAt: string | null };
        setMembers((prev) => prev.map((m) => (m.id === row.userId ? { ...m, role: row.role, lastReadAt: row.lastReadAt } : m)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ConversationMember", filter }, () => loadMembers())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [c.id, me.id, supabase, markRead, loadMembers, reloadConversations]);

  // ── Sending ────────────────────────────────────────────────────────────────
  const deliver = useCallback(
    async (id: string) => {
      const o = outgoing.current.get(id);
      if (!o) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sending" } : m)));
      try {
        for (const u of o.uploads) {
          if (u.done) continue;
          await uploadChatFile(u.path, u.blob, u.mime);
          u.done = true;
        }
        const { data, error } = await supabase
          .from("Message")
          .insert({
            id,
            conversationId: c.id,
            senderId: me.id,
            content: o.content,
            type: o.type,
            attachments: o.attachments as never,
            meta: o.meta as never,
            replyToId: o.replyToId,
          })
          .select(MESSAGE_COLUMNS)
          .single();
        if (error || !data) throw error ?? new Error("insert");
        outgoing.current.delete(id);
        const saved = toMessage(data as Record<string, unknown>);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...saved, localUrls: m.localUrls } : m)));
        patchConversation(c.id, {
          lastMessage: {
            id,
            senderId: me.id,
            senderName: me.name,
            type: saved.type,
            preview: messagePreview(saved.type, saved.content, saved.meta, saved.attachments),
            createdAt: saved.createdAt,
            deliveredAt: null,
            deleted: false,
          },
          sortAt: saved.createdAt,
          archivedAt: null,
        });
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m)));
        const { data: status } = await supabase.rpc("conversation_send_status", { conversation_id: c.id });
        if (status && status !== "ok") {
          patchConversation(c.id, { sendStatus: status as Conversation["sendStatus"] });
          toast("Não foi possível enviar: esta conversa não está mais disponível para você.", "error");
        } else toast("Não foi possível enviar. Verifique sua conexão e toque na mensagem para tentar de novo.", "error");
      }
    },
    [supabase, c.id, me.id, me.name, patchConversation, toast]
  );

  const queue = useCallback(
    (o: Omit<Outgoing, "replyToId">, localUrls?: string[]) => {
      const id = crypto.randomUUID();
      const full: Outgoing = { ...o, replyToId: replyTo?.id ?? null };
      outgoing.current.set(id, full);
      setMessages((prev) => [
        ...prev,
        {
          id,
          conversationId: c.id,
          senderId: me.id,
          content: full.content,
          type: full.type,
          attachments: full.attachments,
          meta: full.meta,
          replyToId: full.replyToId,
          deletedAt: null,
          deliveredAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
          isRead: false,
          status: "sending",
          localUrls,
        },
      ]);
      setReplyTo(null);
      if (hasNewer) loadLatest();
      deliver(id);
    },
    [c.id, me.id, replyTo, deliver, hasNewer, loadLatest]
  );

  const tooBig = (f: Blob) => {
    if (f.size <= MAX_UPLOAD_BYTES) return false;
    toast("Arquivo acima de 50 MB. Escolha um arquivo menor.", "error");
    return true;
  };

  const api: ComposerApi = {
    text: (text) => queue({ type: "text", content: text, attachments: [], meta: {}, uploads: [] }),
    sticker: (id) => queue({ type: "sticker", content: "", attachments: [], meta: { sticker: id }, uploads: [] }),
    media: async (files, caption) => {
      const attachments: Attachment[] = [];
      const uploads: Upload[] = [];
      const locals: string[] = [];
      for (const file of files.slice(0, 10)) {
        if (tooBig(file)) continue;
        try {
          if (file.type.startsWith("video/")) {
            const info = await videoInfo(file);
            const mime = uploadMime(file.type);
            const path = chatFilePath(c.id, me.id, extensionOf(file.name, mime));
            const a: Attachment = { path, kind: "video", name: file.name, size: file.size, mime, width: info.width, height: info.height, duration: Math.round(info.duration) };
            uploads.push({ path, blob: file, mime });
            if (info.poster) {
              const thumbPath = chatFilePath(c.id, me.id, info.poster.type === "image/webp" ? "webp" : "jpg");
              a.thumbPath = thumbPath;
              uploads.push({ path: thumbPath, blob: info.poster, mime: info.poster.type || "image/jpeg" });
              registerLocalUrl(thumbPath, URL.createObjectURL(info.poster));
            }
            const local = URL.createObjectURL(file);
            registerLocalUrl(path, local);
            locals.push(local);
            attachments.push(a);
          } else {
            const img = await compressImage(file);
            const path = chatFilePath(c.id, me.id, extensionOf(undefined, img.mime));
            uploads.push({ path, blob: img.blob, mime: img.mime });
            const local = URL.createObjectURL(img.blob);
            registerLocalUrl(path, local);
            locals.push(local);
            attachments.push({ path, kind: "image", name: file.name, size: img.blob.size, mime: img.mime, width: img.width, height: img.height });
          }
        } catch {
          toast(`Não foi possível ler “${file.name}”. Envie como arquivo pelo “+”.`, "error");
        }
      }
      if (attachments.length) queue({ type: "media", content: caption, attachments, meta: {}, uploads }, locals);
    },
    files: (files) => {
      files.forEach((file) => {
        if (tooBig(file)) return;
        const mime = uploadMime(file.type);
        const path = chatFilePath(c.id, me.id, extensionOf(file.name, mime));
        queue({
          type: "file",
          content: "",
          attachments: [{ path, kind: "file", name: file.name.slice(0, 180), size: file.size, mime }],
          meta: {},
          uploads: [{ path, blob: file, mime }],
        });
      });
    },
    music: async (file) => {
      if (tooBig(file)) return;
      const mime = uploadMime(file.type || "audio/mpeg");
      const duration = await audioDuration(file);
      const path = chatFilePath(c.id, me.id, extensionOf(file.name, mime));
      const local = URL.createObjectURL(file);
      registerLocalUrl(path, local);
      queue(
        {
          type: "music",
          content: "",
          attachments: [{ path, kind: "audio", name: file.name.slice(0, 180), size: file.size, mime, duration: Math.round(duration) }],
          meta: { title: file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").slice(0, 120) },
          uploads: [{ path, blob: file, mime }],
        },
        [local]
      );
    },
    voice: async (blob, type) => {
      const mime = uploadMime(type);
      const { duration, waveform } = await voiceWaveform(blob);
      const ext = mime === "audio/mp4" ? "m4a" : mime === "audio/ogg" ? "ogg" : "webm";
      const path = chatFilePath(c.id, me.id, ext);
      const local = URL.createObjectURL(blob);
      registerLocalUrl(path, local);
      queue(
        {
          type: "voice",
          content: "",
          attachments: [{ path, kind: "audio", size: blob.size, mime, duration: Math.round(duration * 10) / 10, waveform }],
          meta: {},
          uploads: [{ path, blob, mime }],
        },
        [local]
      );
    },
    gif: async (file) => {
      if (tooBig(file)) return;
      try {
        const img = await compressImage(file);
        const path = chatFilePath(c.id, me.id, "gif");
        const local = URL.createObjectURL(file);
        registerLocalUrl(path, local);
        queue(
          {
            type: "gif",
            content: "",
            attachments: [{ path, kind: "image", size: file.size, mime: "image/gif", width: img.width, height: img.height }],
            meta: {},
            uploads: [{ path, blob: file, mime: "image/gif" }],
          },
          [local]
        );
      } catch {
        toast("Não foi possível ler esse GIF.", "error");
      }
    },
    gifReuse: async (a) => {
      const path = chatFilePath(c.id, me.id, "gif");
      try {
        await copyChatFile(a.path, path);
        queue({ type: "gif", content: "", attachments: [{ ...a, path, thumbPath: undefined }], meta: {}, uploads: [] });
      } catch {
        toast("Esse GIF não está mais disponível.", "error");
      }
    },
    openPoll: () => setDialog("poll"),
    openLocation: () => setDialog("location"),
    openContact: () => setDialog("contact"),
  };

  // ── Message actions ─────────────────────────────────────────────────────────
  const react = useCallback(
    async (m: ChatMessage, emoji: string) => {
      if (m.status || m.deletedAt) return;
      const mine = reactions.find((r) => r.messageId === m.id && r.userId === me.id);
      setReactions((prev) => {
        const rest = prev.filter((r) => !(r.messageId === m.id && r.userId === me.id));
        return mine?.emoji === emoji ? rest : [...rest, { id: mine?.id ?? `local-${m.id}`, messageId: m.id, userId: me.id, emoji }];
      });
      const { error } = await supabase.rpc("toggle_reaction", { message_id: m.id, emoji });
      if (error) {
        toast("Não foi possível reagir.", "error");
        loadExtras([m.id], false);
      }
    },
    [reactions, me.id, supabase, toast, loadExtras]
  );

  const vote = useCallback(
    async (m: ChatMessage, indexes: number[]) => {
      setVotes((prev) => [
        ...prev.filter((v) => !(v.messageId === m.id && v.userId === me.id)),
        ...indexes.map((i) => ({ id: `local-${m.id}-${i}`, messageId: m.id, userId: me.id, optionIndex: i })),
      ]);
      const { error } = await supabase.rpc("vote_poll", { message_id: m.id, option_indexes: indexes });
      if (error) toast("Não foi possível registrar o voto.", "error");
      loadExtras([m.id], false);
    },
    [me.id, supabase, toast, loadExtras]
  );

  const action = useCallback(
    async (m: ChatMessage, a: MessageAction) => {
      if (a === "reply") setReplyTo(m);
      if (a === "copy") {
        try {
          await navigator.clipboard.writeText(m.content);
          toast("Texto copiado.");
        } catch {
          toast("Não foi possível copiar.", "error");
        }
      }
      if (a === "forward") setForwardFor(m);
      if (a === "favorite") {
        const { data, error } = await supabase.rpc("toggle_favorite", { message_id: m.id });
        if (error) return toast("Não foi possível favoritar.", "error");
        setFavorites((prev) => {
          const next = new Set(prev);
          if (data) next.add(m.id);
          else next.delete(m.id);
          return next;
        });
        setFavoritesVersion((v) => v + 1);
        toast(data ? "Adicionada aos favoritos." : "Removida dos favoritos.");
      }
      if (a === "delete") {
        if (m.status === "failed") {
          outgoing.current.delete(m.id);
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        } else setDeleteFor(m);
      }
    },
    [supabase, toast]
  );

  async function doDelete(forEveryone: boolean) {
    const m = deleteFor;
    setDeleteFor(null);
    if (!m) return;
    const { data, error } = await supabase.rpc("delete_message", { message_id: m.id, for_everyone: forEveryone });
    if (error) return toast("Não foi possível apagar.", "error");
    if (forEveryone) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deletedAt: new Date().toISOString(), content: "", attachments: [], meta: {} } : x)));
      const paths = (Array.isArray(data) ? data : []).filter((p): p is string => typeof p === "string");
      removeChatFiles(paths).catch(() => {});
    } else setMessages((prev) => prev.filter((x) => x.id !== m.id));
    reloadConversations();
  }

  async function forward(targets: string[]) {
    const m = forwardFor;
    if (!m) return;
    let ok = 0;
    for (const target of targets) {
      try {
        const attachments: Attachment[] = [];
        for (const a of m.attachments) {
          const path = chatFilePath(target, me.id, a.path.split(".").pop() ?? "bin");
          await copyChatFile(a.path, path);
          const copy: Attachment = { ...a, path };
          if (a.thumbPath) {
            const thumb = chatFilePath(target, me.id, a.thumbPath.split(".").pop() ?? "webp");
            await copyChatFile(a.thumbPath, thumb);
            copy.thumbPath = thumb;
          }
          attachments.push(copy);
        }
        const { error } = await supabase.from("Message").insert({
          id: crypto.randomUUID(),
          conversationId: target,
          senderId: me.id,
          content: m.content,
          type: m.type,
          attachments: attachments as never,
          meta: { ...m.meta, forwarded: true } as never,
        });
        if (!error) ok++;
      } catch {
        /* counted below */
      }
    }
    setForwardFor(null);
    toast(ok === targets.length ? (ok > 1 ? `Encaminhada para ${ok} conversas.` : "Mensagem encaminhada.") : "Algumas conversas não receberam a mensagem.", ok === targets.length ? "info" : "error");
    reloadConversations();
  }

  async function setSetting(patch: Record<string, unknown>, local: Partial<Conversation>, ok: string) {
    patchConversation(c.id, local);
    const { error } = await supabase.rpc("update_conversation_setting", { conversation_id: c.id, patch: patch as never });
    if (error) {
      toast("Não foi possível salvar.", "error");
      reloadConversations();
    } else toast(ok);
  }

  async function leaveOrClear() {
    setConfirmLeave(false);
    const { error } = c.isGroup
      ? await supabase.rpc("remove_group_member", { p_conversation_id: c.id, p_user_id: me.id })
      : await supabase.rpc("clear_conversation", { conversation_id: c.id });
    if (error) return toast("Não foi possível concluir.", "error");
    toast(c.isGroup ? "Você saiu do grupo." : "Conversa excluída.");
    onBack();
    reloadConversations();
  }

  const openMedia = useCallback((m: ChatMessage, index: number) => {
    setViewer({ items: m.attachments, locals: m.localUrls, index, caption: m.content || undefined });
  }, []);

  const handlers = useMemo(
    () => ({
      onReact: react,
      onAction: action,
      onLongPress: (m: ChatMessage) => setSheetFor(m),
      onOpenMedia: openMedia,
      onVote: vote,
      onJump: (id: string) => jumpTo(id),
      onRetry: (m: ChatMessage) => deliver(m.id),
    }),
    [react, action, openMedia, vote, jumpTo, deliver]
  );

  const replyName = replyTo ? (replyTo.senderId === me.id ? "você mesmo" : memberMap.get(replyTo.senderId)?.name ?? "mensagem") : null;
  const title = conversationTitle(c);
  const infoProps = {
    c,
    members,
    favoritesVersion,
    onSearch: () => {
      setDrawerOpen(false);
      setSearchOpen(true);
    },
    onJump: (id: string) => {
      setDrawerOpen(false);
      jumpTo(id);
    },
    onOpenMedia: (items: Attachment[], index: number) => setViewer({ items, index }),
    onMembersChanged: () => {
      loadMembers();
      reloadConversations();
    },
    onLeft: onBack,
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1" style={chatThemeStyle(c.theme)}>
      <section
        className={clsx("relative flex h-full min-h-0 min-w-0 flex-1 flex-col", !isWallpaper(c.wallpaper) && "chat-space-bg")}
        style={isWallpaper(c.wallpaper) ? wallpaperStyle(c.wallpaper) : undefined}
        aria-label={`Conversa com ${title}`}
      >
        <ChatHeader
          c={c}
          members={members}
          showBack={showBack}
          onBack={onBack}
          infoOpen={infoColumn || drawerOpen}
          onToggleInfo={toggleInfo}
          onOpenProfile={() => (c.isGroup ? toggleInfo() : setProfileOpen(true))}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((v) => !v)}
          onJump={(m) => jumpTo(m.id, m.createdAt)}
          onMute={() =>
            isMuted(c)
              ? setSetting({ mutedUntil: null }, { mutedUntil: null }, "Notificações reativadas.")
              : setSetting(
                  { mutedUntil: new Date(Date.now() + 8 * 3600_000).toISOString() },
                  { mutedUntil: new Date(Date.now() + 8 * 3600_000).toISOString() },
                  "Silenciada por 8 horas."
                )
          }
          onArchive={() =>
            setSetting(
              { archived: !c.archivedAt },
              { archivedAt: c.archivedAt ? null : new Date().toISOString() },
              c.archivedAt ? "Conversa desarquivada." : "Conversa arquivada."
            )
          }
          onDelete={() => setConfirmLeave(true)}
        />

        <MessageList
          conversationKey={c.id}
          messages={messages}
          meId={me.id}
          group={c.isGroup}
          members={memberMap}
          reactions={reactionMap}
          votes={voteMap}
          favorites={favorites}
          othersReadAt={othersReadAt}
          hasMore={hasMore}
          hasNewer={hasNewer}
          loading={loading}
          loadingMore={loadingMore}
          onLoadMore={loadOlder}
          onJumpToLatest={loadLatest}
          highlightId={highlightId}
          unreadFromId={unreadFromId}
          intro={
            <ChatIntro
              title={c.isGroup ? title : `Você e ${c.otherUser?.name.split(" ")[0] ?? "seu amigo"} são amigos no ÓrbitaX`}
              subtitle={
                c.isGroup
                  ? "Este é o começo do grupo."
                  : messages.length
                    ? "Este é o começo da conversa de vocês."
                    : "Mande a primeira mensagem, uma figurinha ou um áudio. ✨"
              }
              privateNote
            />
          }
          handlers={handlers}
        />

        {c.sendStatus === "ok" ? (
          <MessageComposer conversationId={c.id} replyTo={replyTo} replyName={replyName} onCancelReply={() => setReplyTo(null)} api={api} />
        ) : (
          <ComposerLocked status={c.sendStatus} username={c.otherUser?.username} name={c.otherUser?.name} />
        )}
      </section>

      {infoColumn && (
        <aside className="hidden h-full w-[320px] shrink-0 border-l border-white/10 bg-space-surface xl:block 2xl:w-[360px]">
          <ConversationInfo {...infoProps} />
        </aside>
      )}

      {drawerOpen && !infoColumn && (
        <div className="fixed inset-0 z-[65] flex justify-end bg-black/50 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && setDrawerOpen(false)}>
          <aside className={clsx("animate-pop-in h-full w-full max-w-[380px] border-l border-white/10 bg-space-surface shadow-2xl")} style={chatThemeStyle(c.theme)}>
            <ConversationInfo {...infoProps} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {!c.isGroup && c.otherUser && (
        <ProfileCard
          user={c.otherUser}
          conversationId={c.id}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onOpenMedia={(items, index) => setViewer({ items, index })}
          onJump={(id) => jumpTo(id)}
        />
      )}

      <MessageActionSheet
        m={sheetFor}
        mine={sheetFor?.senderId === me.id}
        favorite={!!sheetFor && favorites.has(sheetFor.id)}
        myReaction={sheetFor ? reactions.find((r) => r.messageId === sheetFor.id && r.userId === me.id)?.emoji ?? null : null}
        state={sheetFor ? deliveryState(sheetFor, othersReadAt) : null}
        onClose={() => setSheetFor(null)}
        onReact={(e) => sheetFor && react(sheetFor, e)}
        onAction={(a) => sheetFor && action(sheetFor, a)}
      />
      <DeleteDialog m={deleteFor} mine={deleteFor?.senderId === me.id} onClose={() => setDeleteFor(null)} onDelete={doDelete} />
      <ForwardDialog open={!!forwardFor} onClose={() => setForwardFor(null)} onForward={forward} currentId={c.id} />
      <PollDialog
        open={dialog === "poll"}
        onClose={() => setDialog(null)}
        onSend={(question, options, multiple) => {
          setDialog(null);
          queue({ type: "poll", content: "", attachments: [], meta: { question, options, multiple }, uploads: [] });
        }}
      />
      <LocationDialog
        open={dialog === "location"}
        onClose={() => setDialog(null)}
        onSend={(p) => {
          setDialog(null);
          queue({ type: "location", content: "", attachments: [], meta: p, uploads: [] });
        }}
      />
      <ContactDialog
        open={dialog === "contact"}
        onClose={() => setDialog(null)}
        onSend={(u) => {
          setDialog(null);
          queue({
            type: "contact",
            content: "",
            attachments: [],
            meta: { userId: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl, avatarFrame: u.avatarFrame ?? null },
            uploads: [],
          });
        }}
      />
      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={c.isGroup ? "Sair do grupo?" : "Excluir conversa?"}
        size="sm"
        footer={
          <>
            <GhostButton onClick={() => setConfirmLeave(false)}>Cancelar</GhostButton>
            <button type="button" onClick={leaveOrClear} className="rounded-full bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-snow hover:bg-red-500">
              {c.isGroup ? "Sair" : "Excluir"}
            </button>
          </>
        }
      >
        <p className="text-sm text-white/60">
          {c.isGroup
            ? "Você não vai mais receber as mensagens deste grupo."
            : `O histórico será apagado só para você. ${c.otherUser?.name.split(" ")[0] ?? "A outra pessoa"} continua com as mensagens.`}
        </p>
      </Modal>
      {viewer && <MediaViewer {...viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
