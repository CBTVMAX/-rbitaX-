"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { presenceOf } from "@/lib/presence";
import { PresenceDot } from "@/components/presence-picker";
import { disablePush } from "@/lib/push-client";
import { endPresenceForSignOut } from "@/components/presence-heartbeat";
import { saveCover } from "@/lib/cover-upload";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import { saveAvatar } from "@/lib/avatar-upload";
import { AvatarEditor } from "@/components/avatar-editor";
import { verifyUpload } from "@/lib/upload-guard";
import {
  Archive,
  BarChart3,
  Camera,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

async function copyProfileLink(username: string) {
  const url = `${window.location.origin}/perfil/${username}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function ShareProfileButton({ username, compact = false }: { username: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/perfil/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meu perfil no Órbita X", url });
        return;
      } catch {
        // user cancelled or share unavailable: fall back to copying
      }
    }
    if (await copyProfileLink(username)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Compartilhar perfil"
      className={clsx(
        "flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 text-sm font-medium text-white transition hover:bg-white/5",
        compact ? "h-11 w-14" : "px-4 py-2.5"
      )}
    >
      <Share2 className="h-4 w-4" />
      {!compact && (copied ? "Link copiado" : "Compartilhar")}
    </button>
  );
}

async function shareProfile(username: string) {
  const url = `${window.location.origin}/perfil/${username}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Perfil no Órbita X", url });
      return;
    } catch {
      // cancelled: fall back to copying
    }
  }
  await copyProfileLink(username);
}

export function ProfileMoreMenu({
  username,
  userId,
  isMe,
  compact = false,
}: {
  username: string;
  userId: string;
  isMe: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await disablePush(supabase);
    await endPresenceForSignOut();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const item = "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5";
  const soon = "flex w-full cursor-default items-center gap-2.5 px-4 py-2 text-left text-sm text-white/35";
  const divider = <div className="my-1 border-t border-white/10" />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais opções"
        aria-expanded={open}
        className={clsx(
          "flex items-center justify-center rounded-xl border border-white/15 bg-space-bg/40 text-white transition hover:bg-white/5",
          compact ? "h-11 w-14" : "h-[42px] w-11"
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
          {isMe && (
            <>
              <Link href="/configuracoes/conta" className={item}>
                <Pencil className="h-4 w-4" /> Editar perfil
              </Link>
              <Link href="/configuracoes/personalizar" className={item}>
                <Palette className="h-4 w-4" /> Personalizar perfil
              </Link>
              <ProfileImageUpload userId={userId} field="avatarUrl" ariaLabel="Alterar foto" className={item}>
                <Camera className="h-4 w-4" /> Alterar foto
              </ProfileImageUpload>
              <ProfileImageUpload userId={userId} field="coverUrl" ariaLabel="Alterar capa" className={item}>
                <ImageIcon className="h-4 w-4" /> Alterar capa
              </ProfileImageUpload>
            </>
          )}
          <button type="button" onClick={() => shareProfile(username)} className={item}>
            <Share2 className="h-4 w-4" /> Compartilhar perfil
          </button>
          <button
            type="button"
            onClick={async () => {
              if (await copyProfileLink(username)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className={item}
          >
            <Link2 className="h-4 w-4" /> {copied ? "Link copiado" : "Copiar link"}
          </button>
          {isMe && (
            <>
              {divider}
              <span title="Em breve" className={soon}>
                <BarChart3 className="h-4 w-4" /> Estatísticas
              </span>
              <span title="Em breve" className={soon}>
                <Search className="h-4 w-4" /> Pesquisar publicações
              </span>
              <span title="Em breve" className={soon}>
                <Archive className="h-4 w-4" /> Arquivo
              </span>
              {divider}
              <Link href="/configuracoes" className={item}>
                <Settings className="h-4 w-4" /> Configurações
              </Link>
              <Link href="/configuracoes/conta" className={item}>
                <Lock className="h-4 w-4" /> Privacidade
              </Link>
              <span title="Em breve" className={soon}>
                <ShieldCheck className="h-4 w-4" /> Segurança
              </span>
              {divider}
              <span title="Em breve" className={soon}>
                <UserPlus className="h-4 w-4" /> Adicionar conta
              </span>
              <button type="button" onClick={signOut} className={clsx(item, "text-red-400")}>
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


const RAIL_KEY = "orbitax:profile-rail-collapsed";

type RailFriend = { id: string; name: string; username: string; avatarUrl: string | null; presence: string };
type RailConv = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  isGroup: boolean;
  unread: number;
  otherUser: { username?: string; name?: string; avatarUrl?: string | null } | null;
  lastMessage: { preview?: string; content?: string; type?: string } | null;
};

function convPreview(m: RailConv["lastMessage"]): string {
  if (!m) return "";
  if (m.preview) return m.preview;
  if (m.type && m.type !== "text") {
    const map: Record<string, string> = { image: "📷 Foto", video: "🎬 Vídeo", audio: "🎵 Áudio", sticker: "Figurinha", file: "📎 Arquivo", gift: "🎁 Presente" };
    return map[m.type] ?? "Mensagem";
  }
  return m.content ?? "";
}

export function ProfileRightRail() {
  const supabase = useMemo(() => createClient(), []);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [friends, setFriends] = useState<RailFriend[]>([]);
  const [convs, setConvs] = useState<RailConv[]>([]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      // storage unavailable: keep default
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (alive) setReady(true);
        return;
      }
      if (alive) setSignedIn(true);
      const [{ data: fr }, { data: cv }] = await Promise.all([
        supabase.from("Friendship").select("requesterId, addresseeId").eq("status", "accepted").or(`requesterId.eq.${uid},addresseeId.eq.${uid}`).limit(200),
        supabase.rpc("my_conversations"),
      ]);
      const ids = (fr ?? []).map((f) => (f.requesterId === uid ? f.addresseeId : f.requesterId));
      let online: RailFriend[] = [];
      if (ids.length) {
        const { data: us } = await supabase.from("User").select("id, name, username, avatarUrl, presence").in("id", ids.slice(0, 200));
        online = ((us ?? []) as RailFriend[]).filter((u) => presenceOf(u.presence) === "online");
      }
      const conversations = ((cv as unknown as RailConv[]) ?? []).slice(0, 6);
      if (alive) {
        setFriends(online);
        setConvs(conversations);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  function toggle() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }

  // Rail é decoração opcional de telas largas; sem login (ou antes de carregar) não aparece.
  if (!ready || !signedIn) return null;

  if (collapsed) {
    return (
      <aside className="hidden w-10 shrink-0 2xl:block">
        <button
          type="button"
          onClick={toggle}
          title="Mostrar painel"
          className="sticky top-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-space-surface/80 text-white/70 transition hover:text-white"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[260px] shrink-0 space-y-4 2xl:block">
      <div className="sticky top-20 space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/50 transition hover:text-white"
          >
            <PanelRightClose className="h-3.5 w-3.5" /> Recolher
          </button>
        </div>

        {/* Amigos online (dados reais) */}
        <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <UsersRound className="h-4 w-4 text-orbit-cyan" /> Amigos online
              {friends.length > 0 && <span className="text-xs font-normal text-white/45">({friends.length})</span>}
            </h2>
          </div>
          {friends.length === 0 ? (
            <p className="px-1 text-xs text-white/50">Nenhum amigo online agora.</p>
          ) : (
            <>
              <ul className="space-y-1">
                {friends.slice(0, 8).map((f) => (
                  <li key={f.id}>
                    <Link href={`/perfil/${f.username}`} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition hover:bg-white/5">
                      <span className="relative shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-space-card">
                          {f.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UsersRound className="h-4 w-4 text-white/40" />
                          )}
                        </span>
                        <PresenceDot value={f.presence} userId={f.id} className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-space-surface" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-white">{f.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/amigos" className="mt-2 block rounded-lg py-1.5 text-center text-xs font-medium text-orbit-cyan hover:underline">
                Mostrar todos
              </Link>
            </>
          )}
        </section>

        {/* Conversas recentes (Messenger real) */}
        <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
            <MessageCircle className="h-4 w-4 text-orbit-cyan" /> Conversas
          </h2>
          {convs.length === 0 ? (
            <p className="px-1 text-xs text-white/50">Nenhuma conversa ainda.</p>
          ) : (
            <>
              <ul className="space-y-1">
                {convs.map((c) => {
                  const name = c.isGroup ? c.name ?? "Grupo" : c.otherUser?.name ?? "Conversa";
                  const avatar = c.isGroup ? c.avatarUrl : c.otherUser?.avatarUrl ?? null;
                  const href = c.isGroup
                    ? `/mensagens?c=${encodeURIComponent(c.id)}`
                    : c.otherUser?.username
                      ? `/mensagens?com=${encodeURIComponent(c.otherUser.username)}`
                      : "/mensagens";
                  return (
                    <li key={c.id}>
                      <Link href={href} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition hover:bg-white/5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-white/40" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">{name}</span>
                          <span className="block truncate text-[11px] text-white/45">{convPreview(c.lastMessage)}</span>
                        </span>
                        {c.unread > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orbit-pink px-1.5 text-[11px] font-bold text-snow">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href="/mensagens" className="mt-2 block rounded-lg py-1.5 text-center text-xs font-medium text-orbit-cyan hover:underline">
                Ver todas as conversas
              </Link>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}

export function OrbitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="orbit-icon-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2b6cff" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="15" stroke="url(#orbit-icon-grad)" strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="29" ry="9" transform="rotate(-20 32 32)" stroke="url(#orbit-icon-grad)" strokeWidth="3" />
    </svg>
  );
}

export function ProfileImageUpload({
  userId,
  field,
  className,
  ariaLabel,
  currentUrl,
  children,
}: {
  userId: string;
  field: "avatarUrl" | "coverUrl";
  className: string;
  ariaLabel: string;
  /** Only for avatarUrl: keeps the user's current frame mode when the photo is replaced. */
  currentUrl?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  async function applyCover(blob: Blob) {
    await saveCover(userId, blob);
    setCoverFile(null);
    router.refresh();
  }

  async function applyAvatar(blob: Blob, ratio: number) {
    await saveAvatar(userId, blob, ratio);
    setAvatarFile(null);
    router.refresh();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    const limitMb = field === "coverUrl" ? 20 : 10;
    if (file.size > limitMb * 1024 * 1024) {
      setError(`A imagem precisa ter no máximo ${limitMb} MB.`);
      return;
    }
    // Both fields go through an editor first, so nothing is cropped for the user.
    setError(null);
    // The declared MIME type is not trusted — check the real bytes before the editor opens.
    try {
      await verifyUpload(file, ["image"], file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imagem inválida.");
      return;
    }
    if (field === "coverUrl") setCoverFile(file);
    else setAvatarFile(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {coverFile && <CoverCropDialog file={coverFile} onCancel={() => setCoverFile(null)} onConfirm={applyCover} />}
      {avatarFile && <AvatarEditor file={avatarFile} onCancel={() => setAvatarFile(null)} onConfirm={applyAvatar} />}
      {error && (
        <button
          type="button"
          role="alert"
          onClick={() => setError(null)}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-500/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl md:bottom-6"
        >
          {error}
        </button>
      )}
    </>
  );
}
