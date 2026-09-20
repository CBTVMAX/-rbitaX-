"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { OrbitLogo, OrbitWordmarkImage } from "@/components/orbit-logo";
import {
  Bell,
  Compass,
  Gamepad2,
  Home,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
  Music2,
  Settings,
  Sparkles,
  Sticker,
  Store,
  User,
  Users,
  Video,
  Clapperboard,
  MoreHorizontal,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/comunidades", label: "Comunidades", icon: Users },
  { href: "/musica", label: "Música", icon: Music2 },
  { href: "/videos", label: "Vídeos", icon: Video },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/fotos", label: "Fotos", icon: ImageIcon, soon: true },
  { href: "/clipes", label: "Clipes", icon: Clapperboard, soon: true },
  { href: "/jogos", label: "Jogos", icon: Gamepad2, soon: true },
  { href: "/adesivos", label: "Adesivos", icon: Sticker, soon: true },
  { href: "/mercado", label: "Mercado", icon: Store, soon: true },
  { href: "/explorar", label: "Explorar", icon: Compass, soon: true },
];

export function AppSidebar({
  username,
  name,
  avatarUrl,
}: {
  username: string;
  name: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-space-surface/90 backdrop-blur md:flex">
      <Link href="/feed" className="flex items-center gap-2 px-6 py-6">
        <OrbitLogo size={30} />
        <OrbitWordmarkImage className="h-7 w-auto" />
      </Link>

      <nav className="orbit-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ href, label, icon: Icon, soon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={soon ? "#" : href}
              onClick={(e) => soon && e.preventDefault()}
              className={clsx(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : soon
                  ? "text-white/30"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4.5 w-4.5" />
                {label}
              </span>
              {soon && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-white/30">
                  em breve
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href={`/perfil/${username}`}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            pathname.startsWith("/perfil")
              ? "bg-white/10 text-white"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
        >
          <User className="h-4.5 w-4.5" />
          Perfil
        </Link>
        <Link
          href="/configuracoes/conta"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-4.5 w-4.5" />
          Configurações
        </Link>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/30"
          disabled
        >
          <MoreHorizontal className="h-4.5 w-4.5" />
          Mais
        </button>
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/feed"
          className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orbit-purple/20 to-orbit-pink/20 px-3 py-2.5 text-xs text-white/70"
        >
          <Sparkles className="h-4 w-4 text-orbit-pink" />
          <span>
            <strong className="text-white">Órbita IA</strong> — em breve
          </span>
        </Link>

        <div className="flex items-center gap-2 rounded-xl px-1 py-1">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-orbit-gradient text-xs font-bold text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-white/40">@{username}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sair"
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileTabBar({ username }: { username: string }) {
  const pathname = usePathname();
  const items = [
    { href: "/feed", icon: Home },
    { href: "/comunidades", icon: Users },
    { href: "/mensagens", icon: MessageCircle },
    { href: "/musica", icon: Music2 },
    { href: `/perfil/${username}`, icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-white/10 bg-space-surface/95 py-2 backdrop-blur md:hidden">
      {items.map(({ href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={clsx("rounded-full p-2", active ? "text-orbit-cyan" : "text-white/50")}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </nav>
  );
}
