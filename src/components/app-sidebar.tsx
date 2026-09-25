"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CoinIcon, formatCoins } from "@/components/coins";
import { useCoinBalance } from "@/components/store/coin-balance";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push-client";
import { OrbitWordmarkThemed } from "@/components/orbit-logo";
import { PresenceDot, PresenceList } from "@/components/presence-picker";
import { CountBadge, useLiveCounts, type LiveCounts } from "@/components/live-activity";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  Coins,
  Compass,
  Download,
  Gamepad2,
  Grid2x2,
  Home,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Newspaper,
  Phone,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Smile,
  Store,
  User,
  UserRound,
  Users,
  Video,
  Vote,
  X,
} from "lucide-react";

type Icon = React.ComponentType<{ className?: string }>;

type NavItem = { href: string | null; label: string; icon: Icon; badge?: keyof LiveCounts };

function sidebarItems(username: string): NavItem[] {
  return [
    { href: `/perfil/${username}`, label: "Perfil", icon: UserRound },
    { href: "/feed", label: "Feed", icon: Newspaper },
    { href: "/mensagens", label: "Messenger", icon: MessageCircle, badge: "messages" },
    { href: null, label: "Chamadas", icon: Phone },
    { href: "/amigos", label: "Amigos", icon: Users, badge: "friendRequests" },
    { href: "/comunidades", label: "Comunidades", icon: Users },
    { href: null, label: "Fotos", icon: ImageIcon },
    { href: "/musica", label: "Música", icon: Music2 },
    { href: "/videos", label: "Vídeos", icon: Video },
    { href: null, label: "Clipes", icon: Clapperboard },
    { href: null, label: "Jogos", icon: Gamepad2 },
    { href: null, label: "Adesivos", icon: Smile },
    { href: null, label: "Mercado", icon: Store },
    { href: null, label: "Serviços", icon: Grid2x2 },
    { href: null, label: "Eventos", icon: CalendarDays },
    { href: null, label: "Votos", icon: Vote },
  ];
}

const TOP_NAV: { href: string; label: string; icon: Icon; badge?: keyof LiveCounts }[] = [
  { href: "/feed", label: "Início", icon: Home },
  { href: "/explorar", label: "Explorar", icon: Music2 },
  { href: "/comunidades", label: "Comunidades", icon: Users },
  { href: "/mensagens", label: "Messenger", icon: MessageCircle, badge: "messages" },
  { href: "/notificacoes", label: "Notificações", icon: Bell, badge: "notifications" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

async function signOut() {
  const supabase = createClient();
  await disablePush(supabase); // this device stops receiving this account's notifications
  await supabase.auth.signOut();
  window.location.href = "/";
}

function UserAvatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl: string | null; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <User className="h-1/2 w-1/2 text-orbit-blue/80" />
      )}
    </span>
  );
}

function SearchBox({ className }: { className?: string }) {
  return (
    <form action="/explorar" method="get" className={clsx("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        name="q"
        placeholder="Pesquisar pessoas, comunidades, conteúdos..."
        className="w-full rounded-xl border border-white/10 bg-space-card/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-orbit-purple/60"
      />
    </form>
  );
}

export function AppTopBar({
  userId,
  username,
  name,
  avatarUrl,
  presence,
}: {
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  presence: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { counts } = useLiveCounts();

  return (
    <header className="fixed inset-x-0 top-0 z-30 hidden h-16 items-center border-b border-white/10 bg-space-bg/90 backdrop-blur md:flex">
      <Link href="/feed" className="flex w-64 shrink-0 items-center px-5">
        <OrbitWordmarkThemed className="h-10 w-auto" />
      </Link>

      <SearchBox className="w-full max-w-sm lg:max-w-md" />

      <nav className="ml-auto flex items-center gap-1 lg:gap-3">
        {TOP_NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[11px] transition lg:px-3",
                active ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
              {badge && <CountBadge count={counts[badge]} className="absolute -top-1 left-1/2 ml-1" />}
              {active && <span className="absolute -bottom-[9px] left-2 right-2 h-0.5 rounded-full bg-orbit-gradient" />}
            </Link>
          );
        })}
      </nav>

      <div className="relative ml-3 mr-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full p-0.5 text-white/60 transition hover:text-white"
          aria-label="Menu da conta"
        >
          <span className="relative">
            <UserAvatar name={name} avatarUrl={avatarUrl} />
            <PresenceDot value={presence} className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-space-bg" />
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-white/10 bg-space-surface shadow-2xl">
            <PresenceList userId={userId} initial={presence} />
            <div className="my-1 border-t border-white/10" />
            <Link href={`/perfil/${username}`} className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5">
              <UserRound className="h-4 w-4" /> Meu perfil
            </Link>
            <Link href="/configuracoes" className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5">
              <Settings className="h-4 w-4" /> Configurações
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function AppSidebar({ username }: { username: string; name: string; avatarUrl: string | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { counts } = useLiveCounts();

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-64 flex-col border-r border-white/10 bg-space-bg/80 backdrop-blur md:flex">
      <nav className="orbit-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {sidebarItems(username).map(({ href, label, icon: Icon, badge }) => {
          const active = href ? isActive(pathname, href) : false;
          const classes = clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            active
              ? "border border-orbit-purple/40 bg-gradient-to-r from-orbit-blue/30 to-orbit-purple/20 text-white shadow-glow"
              : href
              ? "text-white/75 hover:bg-white/5 hover:text-white"
              : "cursor-default text-white/45"
          );
          return href ? (
            <Link key={label} href={href} className={classes}>
              <Icon className="h-5 w-5" /> {label}
              {badge && <CountBadge count={counts[badge]} className="ml-auto" />}
            </Link>
          ) : (
            <span key={label} title="Em breve" className={classes}>
              <Icon className="h-5 w-5" /> {label}
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
        >
          <MoreHorizontal className="h-5 w-5" /> Mais
          {!moreOpen && <CountBadge count={counts.notifications} className="ml-auto" />}
        </button>
        {moreOpen && (
          <div className="space-y-0.5 pl-4">
            <Link href="/notificacoes" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
              <Bell className="h-4 w-4" /> Notificações
              <CountBadge count={counts.notifications} className="ml-auto" />
            </Link>
            <Link href="/configuracoes" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
              <Settings className="h-4 w-4" /> Configurações
            </Link>
            <Link href="/app" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
              <Download className="h-4 w-4" /> Baixar o app
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        )}
      </nav>

      <CoinsCard />
    </aside>
  );
}

function CoinBadge() {
  const balance = useCoinBalance();
  return balance === null ? null : (
    <span className="ml-auto flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-400">
      <CoinIcon className="h-3.5 w-3.5" />
      {formatCoins(balance)}
    </span>
  );
}

/** Real balance (CoinWallet) and the way into the Órbita X Store. */
function CoinsCard() {
  const balance = useCoinBalance();
  return (
    <div className="m-3 rounded-2xl border border-white/10 bg-space-surface/80 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Coins className="h-5 w-5 text-amber-400" /> Órbita Coins
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-amber-400">
        <CoinIcon className="h-4 w-4" />
        {balance === null ? "…" : `${formatCoins(balance)} Coins`}
      </p>
      <Link
        href="/loja"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2 text-sm font-semibold text-snow shadow-glow transition hover:opacity-95"
      >
        <ShoppingBag className="h-4 w-4" /> Órbita X Store
      </Link>
      <p className="mt-2 text-center text-[11px] text-white/40">Compra de Coins em breve</p>
    </div>
  );
}

export function MobileHeader({ userId, username, presence }: { userId: string; username: string; presence: string }) {
  const [open, setOpen] = useState(false);
  const { counts } = useLiveCounts();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-space-bg/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/feed">
          <OrbitWordmarkThemed className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-4 text-white">
          <Link href="/explorar" aria-label="Pesquisar">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/notificacoes" aria-label="Notificações" className="relative">
            <Bell className="h-5 w-5" />
            <CountBadge count={counts.notifications} className="absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px]" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="relative"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {!open &&
              (counts.friendRequests > 0 ? (
                <CountBadge count={counts.friendRequests} className="absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px]" />
              ) : (
                <PresenceDot value={presence} className="absolute -right-1 -top-1 h-2.5 w-2.5 border-2 border-space-bg" />
              ))}
          </button>
        </div>
      </div>

      {open && (
        <nav className="max-h-[75vh] space-y-0.5 overflow-y-auto border-t border-white/10 px-3 py-3">
          <div className="-mx-3 mb-2 border-b border-white/10 pb-2">
            <PresenceList userId={userId} initial={presence} />
          </div>
          {sidebarItems(username).map(({ href, label, icon: Icon, badge }) =>
            href ? (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                <Icon className="h-5 w-5" /> {label}
                {badge && <CountBadge count={counts[badge]} className="ml-auto" />}
              </Link>
            ) : (
              <span key={label} title="Em breve" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40">
                <Icon className="h-5 w-5" /> {label}
              </span>
            )
          )}
          <Link
            href="/loja"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            <ShoppingBag className="h-5 w-5" /> Órbita X Store
            <CoinBadge />
          </Link>
          <Link
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            <Settings className="h-5 w-5" /> Configurações
          </Link>
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            <Download className="h-5 w-5" /> Baixar o app
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
          >
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </nav>
      )}
    </header>
  );
}

export function MobileTabBar({ username }: { username: string }) {
  const pathname = usePathname();
  const { counts } = useLiveCounts();
  const items: { href: string; label: string; icon: Icon; badge?: keyof LiveCounts }[] = [
    { href: "/feed", label: "Início", icon: Home },
    { href: "/explorar", label: "Explorar", icon: Compass },
    { href: "/mensagens", label: "Messenger", icon: MessageCircle, badge: "messages" },
    { href: `/perfil/${username}`, label: "Perfil", icon: UserRound },
  ];

  const tab = ({ href, label, icon: Icon, badge }: (typeof items)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex flex-1 flex-col items-center gap-0.5 text-[11px]",
          active ? "text-orbit-blue" : "text-white/60"
        )}
      >
        <span className="relative">
          <Icon className="h-6 w-6" />
          {badge && <CountBadge count={counts[badge]} className="absolute -right-3 -top-1.5 h-4 min-w-4 px-1 text-[10px]" />}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-white/10 bg-space-bg/95 px-2 pb-2 pt-2 backdrop-blur md:hidden">
      {items.slice(0, 2).map(tab)}
      <div className="flex flex-1 justify-center">
        <Link
          href={`/perfil/${username}#composer`}
          aria-label="Criar publicação"
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow"
        >
          <Plus className="h-7 w-7" />
        </Link>
      </div>
      {items.slice(2).map(tab)}
    </nav>
  );
}
