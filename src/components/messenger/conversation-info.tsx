"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Camera,
  ChevronRight,
  Crown,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  LogOut,
  MoreVertical,
  Palette,
  Phone,
  Search,
  Settings2,
  Shield,
  Star,
  Timer,
  Trash2,
  UserPlus,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { PRESENCE, presenceOf } from "@/lib/presence";
import { useSignedUrl } from "@/lib/messenger/media";
import { formatBytes, formatTime, messagePreview, toDate, URL_PATTERN } from "@/lib/messenger/format";
import { conversationTitle, isMuted, toMessage, type Attachment, type ChatMessage, type Conversation, type Member } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { AddMembersDialog } from "./dialogs";
import { uploadGroupPhoto } from "./new-conversation";
import { ThemeSelector, WallpaperSelector } from "./theme-selector";
import { ChatAvatar, ConversationAvatar, GhostButton, MenuItem, Modal, Popover, PrimaryButton } from "./ui";

const TTL_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Desativadas" },
  { value: 3600, label: "1 hora" },
  { value: 86400, label: "24 horas" },
  { value: 604800, label: "7 dias" },
  { value: 2592000, label: "30 dias" },
];

function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("border-t border-white/[0.07] px-5 py-4", className)}>
      {title && <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h3>}
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition",
        danger ? "text-red-400 hover:bg-red-500/10" : "text-white/85 hover:bg-white/[0.05]"
      )}
    >
      <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", danger ? "bg-red-500/10" : "bg-chat/15 text-chat")}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className={clsx("block truncate text-xs", danger ? "text-red-400/70" : "text-white/45")}>{hint}</span>}
      </span>
      {right ?? (onClick && !danger && <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />)}
    </button>
  );
}

function Thumb({ a, onClick }: { a: Attachment; onClick: () => void }) {
  const src = useSignedUrl(a.kind === "video" ? a.thumbPath ?? null : a.path);
  return (
    <button type="button" onClick={onClick} className="relative aspect-square overflow-hidden rounded-lg bg-white/[0.06]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full animate-pulse" />
      )}
      {a.kind === "video" && <Video className="absolute bottom-1 left-1 h-3.5 w-3.5 text-snow drop-shadow" />}
    </button>
  );
}

/** Mídia · Links · Arquivos shared in a conversation (info panel and profile card). */
export function SharedContent({
  conversationId,
  onOpenMedia,
  onJump,
  compact,
}: {
  conversationId: string;
  onOpenMedia: (items: Attachment[], index: number) => void;
  onJump: (messageId: string) => void;
  compact?: boolean;
}) {
  const { supabase } = useMessenger();
  const [tab, setTab] = useState<"media" | "links" | "files">("media");
  const [media, setMedia] = useState<{ a: Attachment; messageId: string }[] | null>(null);
  const [links, setLinks] = useState<{ url: string; messageId: string; createdAt: string }[] | null>(null);
  const [files, setFiles] = useState<{ a: Attachment; messageId: string; createdAt: string }[] | null>(null);

  useEffect(() => {
    setMedia(null);
    setLinks(null);
    setFiles(null);
  }, [conversationId]);

  useEffect(() => {
    if (tab === "media" && media === null) {
      supabase
        .from("Message")
        .select("id, attachments")
        .eq("conversationId", conversationId)
        .in("type", ["media", "gif"])
        .is("deletedAt", null)
        .order("createdAt", { ascending: false })
        .limit(40)
        .then(({ data }) =>
          setMedia(
            (data ?? []).flatMap((r) =>
              ((Array.isArray(r.attachments) ? r.attachments : []) as Attachment[])
                .filter((a) => a.kind === "image" || a.kind === "video")
                .map((a) => ({ a, messageId: r.id }))
            )
          )
        );
    }
    if (tab === "links" && links === null) {
      supabase
        .from("Message")
        .select("id, content, createdAt")
        .eq("conversationId", conversationId)
        .ilike("content", "%http%")
        .is("deletedAt", null)
        .order("createdAt", { ascending: false })
        .limit(40)
        .then(({ data }) =>
          setLinks(
            (data ?? []).flatMap((r) => Array.from(r.content.matchAll(URL_PATTERN)).map((m) => ({ url: m[0], messageId: r.id, createdAt: r.createdAt })))
          )
        );
    }
    if (tab === "files" && files === null) {
      supabase
        .from("Message")
        .select("id, attachments, createdAt")
        .eq("conversationId", conversationId)
        .in("type", ["file", "music"])
        .is("deletedAt", null)
        .order("createdAt", { ascending: false })
        .limit(40)
        .then(({ data }) =>
          setFiles(
            (data ?? []).flatMap((r) =>
              ((Array.isArray(r.attachments) ? r.attachments : []) as Attachment[]).map((a) => ({ a, messageId: r.id, createdAt: r.createdAt }))
            )
          )
        );
    }
  }, [tab, media, links, files, conversationId, supabase]);

  const limit = compact ? 6 : 40;
  const loading = <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-white/35" />;
  const empty = (text: string) => <p className="py-4 text-center text-xs text-white/40">{text}</p>;

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {(
          [
            ["media", "Mídia", ImageIcon],
            ["links", "Links", Link2],
            ["files", "Arquivos", FileText],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition",
              tab === id ? "bg-space-surface text-white shadow" : "text-white/50 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      {tab === "media" &&
        (media === null
          ? loading
          : media.length === 0
            ? empty("Fotos e vídeos enviados aparecem aqui.")
            : (
              <div className="grid grid-cols-3 gap-1">
                {media.slice(0, limit).map((m, i) => (
                  <Thumb key={m.a.path} a={m.a} onClick={() => onOpenMedia(media.map((x) => x.a), i)} />
                ))}
              </div>
            ))}
      {tab === "links" &&
        (links === null
          ? loading
          : links.length === 0
            ? empty("Links compartilhados aparecem aqui.")
            : (
              <div className="space-y-1">
                {links.slice(0, limit).map((l, i) => (
                  <a
                    key={`${l.messageId}-${i}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-white/[0.05]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chat/15 text-chat">
                      <Link2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-white">{l.url.replace(/^https?:\/\//, "")}</span>
                      <span className="text-[11px] text-white/40">{toDate(l.createdAt).toLocaleDateString("pt-BR")}</span>
                    </span>
                  </a>
                ))}
              </div>
            ))}
      {tab === "files" &&
        (files === null
          ? loading
          : files.length === 0
            ? empty("Arquivos e músicas enviados aparecem aqui.")
            : (
              <div className="space-y-1">
                {files.slice(0, limit).map((f) => (
                  <button
                    key={f.a.path}
                    type="button"
                    onClick={() => onJump(f.messageId)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chat/15 text-chat">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-white">{f.a.name ?? "Arquivo"}</span>
                      <span className="text-[11px] text-white/40">
                        {formatBytes(f.a.size)} · {toDate(f.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
    </div>
  );
}

function FavoritesList({ conversationId, onJump, version }: { conversationId: string; onJump: (id: string) => void; version: number }) {
  const { supabase, me } = useMessenger();
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: favs } = await supabase
        .from("MessageFavorite")
        .select("messageId")
        .eq("conversationId", conversationId)
        .order("createdAt", { ascending: false })
        .limit(50);
      const ids = (favs ?? []).map((f) => f.messageId);
      if (!ids.length) {
        if (!cancel) setItems([]);
        return;
      }
      const { data } = await supabase
        .from("Message")
        .select("id, conversationId, senderId, content, type, attachments, meta, replyToId, deletedAt, deliveredAt, expiresAt, createdAt, isRead")
        .in("id", ids);
      if (!cancel) setItems((data ?? []).map((r) => toMessage(r as Record<string, unknown>)).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)));
    })();
    return () => {
      cancel = true;
    };
  }, [conversationId, supabase, version]);

  return (
    <>
      <Row icon={Star} label="Mensagens favoritas" hint={items === null ? "Carregando…" : items.length ? `${items.length} salvas` : "Nenhuma ainda"} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Mensagens favoritas">
        {!items?.length ? (
          <p className="py-8 text-center text-sm text-white/45">
            Use “Favoritar” no menu de uma mensagem para guardá-la aqui. Só você vê seus favoritos.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onJump(m.id);
                }}
                className="flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-300 text-amber-300" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-white/85">{messagePreview(m.type, m.content, m.meta, m.attachments)}</span>
                  <span className="text-[11px] text-white/40">
                    {m.senderId === me.id ? "Você" : ""} {toDate(m.createdAt).toLocaleDateString("pt-BR")} {formatTime(m.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function GroupSettingsDialog({ open, onClose, c }: { open: boolean; onClose: () => void; c: Conversation }) {
  const { supabase, me, reloadConversations, toast } = useMessenger();
  const [name, setName] = useState(c.name ?? "");
  const [description, setDescription] = useState(c.description ?? "");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(c.name ?? "");
    setDescription(c.description ?? "");
    setPhoto(null);
    setRemovePhoto(false);
  }, [open, c]);

  async function save() {
    setBusy(true);
    let avatarUrl = removePhoto ? null : c.avatarUrl;
    if (photo) avatarUrl = await uploadGroupPhoto(supabase, me.id, photo.file);
    const { error } = await supabase.rpc("update_group", {
      p_conversation_id: c.id,
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_avatar_url: avatarUrl,
    });
    setBusy(false);
    if (error) {
      toast("Não foi possível salvar as alterações.", "error");
      return;
    }
    await reloadConversations();
    toast("Grupo atualizado.");
    onClose();
  }

  const preview = photo?.url ?? (removePhoto ? null : c.avatarUrl);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações do grupo"
      footer={
        <>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton disabled={!name.trim() || busy} onClick={save}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </PrimaryButton>
        </>
      }
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) {
            setPhoto({ file: f, url: URL.createObjectURL(f) });
            setRemovePhoto(false);
          }
        }}
      />
      <div className="flex flex-col items-center">
        <button type="button" onClick={() => input.current?.click()} className="relative" aria-label="Trocar foto do grupo">
          <ChatAvatar name={name} url={preview} size={96} group />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-space-surface bg-orbit-gradient text-snow">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        {preview && (
          <button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true); }} className="mt-2 text-xs text-white/50 hover:text-red-400">
            Remover foto
          </button>
        )}
      </div>
      <label className="mt-4 block text-xs font-medium text-white/55">Nome</label>
      <input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
      />
      <label className="mt-4 block text-xs font-medium text-white/55">Descrição</label>
      <textarea
        value={description}
        maxLength={300}
        rows={3}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Sobre o que é este grupo?"
        className="mt-1.5 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
      />
    </Modal>
  );
}

function MemberRow({ m, c, onChanged }: { m: Member; c: Conversation; onChanged: () => void }) {
  const { supabase, me, toast } = useMessenger();
  const [menu, setMenu] = useState(false);
  const isMe = m.id === me.id;
  const canManage = !isMe && m.role !== "owner" && (c.role === "owner" || (c.role === "admin" && m.role === "member"));

  async function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setMenu(false);
    const { error } = await fn();
    if (error) toast("Não foi possível concluir.", "error");
    else {
      toast(ok);
      onChanged();
    }
  }

  return (
    <div className="relative flex items-center gap-3 py-1.5">
      <Link href={`/perfil/${m.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ChatAvatar name={m.name} url={m.avatarUrl} size={38} presence={m.presence ?? "offline"} ringClass="border-space-surface" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">
            {isMe ? "Você" : m.name}
          </span>
          <span className="block truncate text-xs text-white/40">@{m.username}</span>
        </span>
      </Link>
      {m.role === "owner" && (
        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <Crown className="h-3 w-3" /> Dono
        </span>
      )}
      {m.role === "admin" && (
        <span className="flex items-center gap-1 rounded-full bg-chat/15 px-2 py-0.5 text-[10px] font-semibold text-chat">
          <Shield className="h-3 w-3" /> Admin
        </span>
      )}
      {canManage && (
        <div className="relative">
          <button type="button" onClick={() => setMenu((v) => !v)} aria-label={`Opções para ${m.name}`} className="rounded-full p-1.5 text-white/45 hover:bg-white/5 hover:text-white">
            <MoreVertical className="h-4 w-4" />
          </button>
          <Popover open={menu} onClose={() => setMenu(false)} className="right-0 top-full mt-1 w-52">
            {c.role === "owner" && (
              <MenuItem
                icon={Shield}
                label={m.role === "admin" ? "Remover admin" : "Tornar admin"}
                onClick={() =>
                  run(
                    () => supabase.rpc("set_group_admin", { p_conversation_id: c.id, p_user_id: m.id, p_admin: m.role !== "admin" }),
                    m.role === "admin" ? `${m.name.split(" ")[0]} não é mais admin.` : `${m.name.split(" ")[0]} agora é admin.`
                  )
                }
              />
            )}
            <MenuItem
              icon={X}
              label="Remover do grupo"
              danger
              onClick={() =>
                run(() => supabase.rpc("remove_group_member", { p_conversation_id: c.id, p_user_id: m.id }), `${m.name.split(" ")[0]} foi removido.`)
              }
            />
          </Popover>
        </div>
      )}
    </div>
  );
}

export function ConversationInfo({
  c,
  members,
  favoritesVersion,
  onClose,
  onSearch,
  onJump,
  onOpenMedia,
  onMembersChanged,
  onLeft,
}: {
  c: Conversation;
  members: Member[];
  favoritesVersion: number;
  onClose?: () => void;
  onSearch: () => void;
  onJump: (id: string) => void;
  onOpenMedia: (items: Attachment[], index: number) => void;
  onMembersChanged: () => void;
  onLeft: () => void;
}) {
  const { supabase, me, toast, patchConversation, reloadConversations } = useMessenger();
  const [muteOpen, setMuteOpen] = useState(false);
  const [ttlOpen, setTtlOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "clear" | "leave">(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const muted = isMuted(c);
  const other = c.otherUser;
  const admin = c.role === "owner" || c.role === "admin";
  const canTtl = !c.isGroup || admin;
  const presence = PRESENCE[presenceOf(other?.presence)];

  async function setting(patch: Record<string, unknown>, local: Partial<Conversation>, ok?: string) {
    patchConversation(c.id, local);
    const { error } = await supabase.rpc("update_conversation_setting", { conversation_id: c.id, patch: patch as never });
    if (error) {
      toast("Não foi possível salvar. Tente novamente.", "error");
      reloadConversations();
    } else if (ok) toast(ok);
  }

  function mute(hours: number | null) {
    setMuteOpen(false);
    const until = hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
    setting({ mutedUntil: until }, { mutedUntil: until }, until ? "Conversa silenciada." : "Notificações reativadas.");
  }

  async function setTtl(value: number | null) {
    setTtlOpen(false);
    const { error } = await supabase.rpc("set_conversation_ttl", { p_conversation_id: c.id, p_seconds: value });
    if (error) toast("Só administradores podem mudar isso neste grupo.", "error");
    else {
      patchConversation(c.id, { messageTtlSeconds: value });
      toast(value ? "Mensagens temporárias ativadas." : "Mensagens temporárias desativadas.");
    }
  }

  async function destructive() {
    const kind = confirm;
    setConfirm(null);
    const { error } =
      kind === "leave"
        ? await supabase.rpc("remove_group_member", { p_conversation_id: c.id, p_user_id: me.id })
        : await supabase.rpc("clear_conversation", { conversation_id: c.id });
    if (error) {
      toast("Não foi possível concluir.", "error");
      return;
    }
    toast(kind === "leave" ? "Você saiu do grupo." : "Conversa excluída.");
    onLeft();
    reloadConversations();
  }

  const sortedMembers = [...members].sort(
    (a, b) => ["owner", "admin", "member"].indexOf(a.role) - ["owner", "admin", "member"].indexOf(b.role) || a.name.localeCompare(b.name)
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className="text-sm font-semibold text-white/80">{c.isGroup ? "Informações do grupo" : "Informações do contato"}</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar informações" className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col items-center px-5 pb-5 pt-4 text-center">
          {c.isGroup ? (
            <ConversationAvatar c={c} size={96} />
          ) : (
            <ChatAvatar name={other?.name ?? "?"} url={other?.avatarUrl} size={96} frame={other?.avatarFrame} />
          )}
          <h2 className="mt-4 font-display text-xl font-bold text-white">{conversationTitle(c)}</h2>
          {c.isGroup ? (
            <p className="mt-0.5 text-sm text-white/50">Grupo · {c.memberCount} membros</p>
          ) : (
            <>
              <p className="text-sm text-white/50">@{other?.username}</p>
              <p className={clsx("mt-1 flex items-center gap-1.5 text-xs font-medium", presence.text)}>
                <span className={clsx("h-2 w-2 rounded-full", presence.dot)} /> {presence.label}
              </p>
            </>
          )}
          {c.isGroup && c.description && <p className="mt-3 max-w-xs text-sm text-white/65">{c.description}</p>}

          <div className="mt-5 grid w-full grid-cols-3 gap-2">
            {[
              { icon: Phone, label: "Áudio", onClick: () => toast("Chamadas de voz chegam em breve ao ÓrbitaX.") },
              { icon: Video, label: "Vídeo", onClick: () => toast("Chamadas de vídeo chegam em breve ao ÓrbitaX.") },
              { icon: Search, label: "Buscar", onClick: onSearch },
            ].map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 text-xs font-medium text-white/75 transition hover:border-chat/40 hover:bg-chat/10 hover:text-white"
              >
                <Icon className="h-5 w-5 text-chat" /> {label}
              </button>
            ))}
          </div>
          {!c.isGroup && other && (
            <Link href={`/perfil/${other.username}`} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-chat hover:underline">
              <UserRound className="h-4 w-4" /> Ver perfil
            </Link>
          )}
        </div>

        <Section title="Mídia, links e arquivos">
          <SharedContent conversationId={c.id} onOpenMedia={onOpenMedia} onJump={onJump} compact />
        </Section>

        <Section>
          <FavoritesList conversationId={c.id} onJump={onJump} version={favoritesVersion} />
          <div className="relative">
            <Row
              icon={muted ? BellOff : Bell}
              label="Notificações"
              hint={muted ? "Silenciada" : "Ativadas"}
              onClick={() => setMuteOpen((v) => !v)}
            />
            <Popover open={muteOpen} onClose={() => setMuteOpen(false)} className="left-0 right-0 top-full">
              {muted && <MenuItem icon={Bell} label="Reativar notificações" onClick={() => mute(null)} />}
              <MenuItem icon={BellOff} label="Silenciar por 8 horas" onClick={() => mute(8)} />
              <MenuItem icon={BellOff} label="Silenciar por 1 semana" onClick={() => mute(24 * 7)} />
              <MenuItem icon={BellOff} label="Silenciar sempre" onClick={() => mute(24 * 365 * 70)} />
            </Popover>
          </div>
          <div className="relative">
            <Row
              icon={Timer}
              label="Mensagens temporárias"
              hint={TTL_OPTIONS.find((o) => o.value === (c.messageTtlSeconds ?? null))?.label ?? "Desativadas"}
              onClick={canTtl ? () => setTtlOpen((v) => !v) : () => toast("Só administradores podem mudar isso neste grupo.")}
            />
            <Popover open={ttlOpen} onClose={() => setTtlOpen(false)} className="left-0 right-0 top-full">
              <p className="px-4 pb-1 pt-1.5 text-[11px] text-white/45">Novas mensagens somem para todos após:</p>
              {TTL_OPTIONS.map((o) => (
                <MenuItem
                  key={String(o.value)}
                  icon={Timer}
                  label={o.label}
                  hint={(c.messageTtlSeconds ?? null) === o.value ? "atual" : undefined}
                  onClick={() => setTtl(o.value)}
                />
              ))}
            </Popover>
          </div>
        </Section>

        <Section title="Tema da conversa">
          <div className="mb-3 flex items-center gap-2 text-xs text-white/45">
            <Palette className="h-3.5 w-3.5" /> Muda só esta conversa, para você.
          </div>
          <ThemeSelector value={c.theme} onChange={(id) => setting({ theme: id }, { theme: id })} />
          <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Papel de parede</p>
          <WallpaperSelector value={c.wallpaper} onChange={(id) => setting({ wallpaper: id }, { wallpaper: id })} />
        </Section>

        {c.isGroup && (
          <Section title={`Membros · ${members.length}`}>
            {admin && (
              <>
                <Row icon={UserPlus} label="Adicionar pessoas" onClick={() => setAddOpen(true)} />
                <Row icon={Settings2} label="Configurações do grupo" hint="Nome, foto e descrição" onClick={() => setSettingsOpen(true)} />
                <div className="my-2 h-px bg-white/[0.06]" />
              </>
            )}
            {(showAllMembers ? sortedMembers : sortedMembers.slice(0, 8)).map((m) => (
              <MemberRow key={m.id} m={m} c={c} onChanged={onMembersChanged} />
            ))}
            {sortedMembers.length > 8 && !showAllMembers && (
              <button type="button" onClick={() => setShowAllMembers(true)} className="mt-1 text-sm font-semibold text-chat hover:underline">
                Ver todos os {sortedMembers.length}
              </button>
            )}
          </Section>
        )}

        <Section>
          <Row
            icon={c.archivedAt ? ArchiveRestore : Archive}
            label={c.archivedAt ? "Desarquivar conversa" : "Arquivar conversa"}
            onClick={() =>
              setting(
                { archived: !c.archivedAt },
                { archivedAt: c.archivedAt ? null : new Date().toISOString() },
                c.archivedAt ? "Conversa desarquivada." : "Conversa arquivada."
              )
            }
          />
          {c.isGroup ? (
            <Row icon={LogOut} label="Sair do grupo" hint="Você deixa de receber as mensagens" danger onClick={() => setConfirm("leave")} />
          ) : (
            <Row icon={Trash2} label="Excluir conversa" hint="Apaga o histórico só para você" danger onClick={() => setConfirm("clear")} />
          )}
        </Section>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "leave" ? "Sair do grupo?" : "Excluir conversa?"}
        size="sm"
        footer={
          <>
            <GhostButton onClick={() => setConfirm(null)}>Cancelar</GhostButton>
            <button type="button" onClick={destructive} className="rounded-full bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-snow hover:bg-red-500">
              {confirm === "leave" ? "Sair" : "Excluir"}
            </button>
          </>
        }
      >
        <p className="text-sm text-white/60">
          {confirm === "leave"
            ? "Você não vai mais receber as mensagens deste grupo. Um administrador pode adicionar você de novo."
            : `O histórico desta conversa será apagado só para você. ${other?.name.split(" ")[0] ?? "A outra pessoa"} continua com as mensagens.`}
        </p>
      </Modal>

      {c.isGroup && (
        <>
          <AddMembersDialog
            open={addOpen}
            onClose={() => setAddOpen(false)}
            existing={members.map((m) => m.id)}
            onAdd={async (ids) => {
              const { error } = await supabase.rpc("add_group_members", { p_conversation_id: c.id, p_member_ids: ids });
              if (error) toast("Não foi possível adicionar. Só amigos podem entrar no grupo.", "error");
              else {
                toast(ids.length > 1 ? "Pessoas adicionadas." : "Pessoa adicionada.");
                setAddOpen(false);
                onMembersChanged();
                reloadConversations();
              }
            }}
          />
          <GroupSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} c={c} />
        </>
      )}
    </div>
  );
}
