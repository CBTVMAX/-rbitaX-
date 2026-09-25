"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE, type Presence } from "@/lib/presence";
import {
  Archive,
  BarChart3,
  Camera,
  ChevronDown,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  MoreHorizontal,
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
              <Link href="/configuracoes/conta" className={item}>
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

export function PresenceStatus({ userId, initial, editable }: { userId: string; initial: Presence; editable: boolean }) {
  const [presence, setPresence] = useState<Presence>(initial);
  const [open, setOpen] = useState(false);
  const current = PRESENCE[presence];

  async function choose(next: Presence) {
    setOpen(false);
    if (next === presence) return;
    const previous = presence;
    setPresence(next);
    const supabase = createClient();
    const { error } = await supabase.from("User").update({ presence: next }).eq("id", userId);
    if (error) setPresence(previous);
  }

  const label = (
    <>
      <span className={clsx("h-2.5 w-2.5 rounded-full", current.dot)} />
      <span className={current.text}>{current.label}</span>
    </>
  );

  if (!editable) return <p className="mt-1.5 flex items-center gap-2 text-sm">{label}</p>;

  return (
    <div className="relative mt-1.5 inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Alterar status"
        className="flex items-center gap-2 rounded-lg text-sm transition hover:opacity-80"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-white/40" />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 w-52 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
          {(Object.keys(PRESENCE) as Presence[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5"
            >
              <span className={clsx("h-2.5 w-2.5 rounded-full", PRESENCE[key].dot)} />
              {key === "offline" ? "Definir como offline" : PRESENCE[key].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RailCard({
  title,
  icon: Icon,
  heading,
  text,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
      <h2 className="mb-6 text-sm font-semibold text-white">{title}</h2>
      <div className="flex flex-col items-center px-2 pb-4 text-center">
        <Icon className="mb-4 h-11 w-11 text-orbit-blue/80" />
        <p className="mb-2 text-sm font-semibold text-white">{heading}</p>
        <p className="text-xs leading-relaxed text-white/50">{text}</p>
        {action}
      </div>
    </section>
  );
}

const RAIL_KEY = "orbitax:profile-rail-collapsed";

export function ProfileRightRail() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      // storage unavailable: keep default
    }
  }, []);

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
    <aside className="hidden w-[250px] shrink-0 space-y-4 2xl:block">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/50 transition hover:text-white"
        >
          <PanelRightClose className="h-3.5 w-3.5" /> Recolher
        </button>
      </div>
      <RailCard
        title="Amigos online"
        icon={UsersRound}
        heading="Nenhum amigo online no momento."
        text="Quando seus amigos estiverem online, eles aparecerão aqui."
      />
      <RailCard
        title="Conversas recentes"
        icon={MessageCircle}
        heading="Nenhuma conversa ainda."
        text="Quando você conversar com alguém, suas conversas aparecerão aqui."
      />
      <RailCard
        title="Comunidades sugeridas"
        icon={OrbitIcon}
        heading="Nenhuma comunidade por enquanto."
        text="Explore comunidades e encontre conteúdos que você gosta."
        action={
          <Link
            href="/comunidades"
            className="mt-5 w-full rounded-xl border border-orbit-blue/60 py-2.5 text-sm font-medium text-orbit-blue transition hover:bg-orbit-blue/10"
          >
            Explorar comunidades
          </Link>
        }
      />
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
  children,
}: {
  userId: string;
  field: "avatarUrl" | "coverUrl";
  className: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem precisa ter no máximo 10 MB.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const folder = field === "avatarUrl" ? "avatar" : "cover";
    const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (uploadError) {
      setBusy(false);
      setError("Não foi possível enviar a imagem.");
      return;
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("User")
      .update(field === "avatarUrl" ? { avatarUrl: pub.publicUrl } : { coverUrl: pub.publicUrl })
      .eq("id", userId);
    setBusy(false);
    if (updateError) {
      setError("Não foi possível salvar a imagem.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={ariaLabel}
        className={className}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
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
