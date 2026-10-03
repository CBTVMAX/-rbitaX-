"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  BarChart3,
  Bell,
  Flag,
  Music2,
  Gem,
  Gift,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Settings,
  Smile,
  Sparkles,
  Users,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import { OrbitLogo } from "@/components/orbit-logo";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push-client";
import { endPresenceForSignOut } from "@/components/presence-heartbeat";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: Home },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/conteudos", label: "Conteúdos", icon: LayoutGrid },
  { href: "/admin/comunidades", label: "Comunidades", icon: Users2 },
  { href: "/admin/denuncias", label: "Denúncias", icon: Flag },
  { href: "/admin/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/diamantes", label: "Diamantes", icon: Gem },
  { href: "/admin/presentes", label: "Presentes", icon: Gift },
  { href: "/admin/ia", label: "IA Assistente", icon: Sparkles },
  { href: "/admin/adesivos", label: "Adesivos", icon: Smile },
  { href: "/admin/musicas", label: "Músicas", icon: Music2 },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/admin/seguranca", label: "Logs de Sistema", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-9" />;
  return (
    <div className="text-right">
      <p className="text-[11px] capitalize text-white/50">{now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p className="font-display text-lg font-bold leading-none text-white">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Sistema Online
      </p>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <OrbitLogo size={34} />
      <div className="leading-none">
        <p className="font-display text-lg font-bold tracking-wide">
          <span className="orbit-text-gradient">ÓRBITA</span>
          <span className="text-white">X</span>
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/45">Painel administrativo</p>
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              active ? "bg-orbit-gradient text-snow shadow-glow" : "text-white/65 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BottomCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orbit-purple/20 via-space-card to-space-card p-4">
      <p className="font-display text-xs font-bold uppercase leading-relaxed tracking-[0.18em] text-white/85">
        Conectando<br />pessoas ideias<br />comunidades<br />em todo universo
      </p>
      <div className="my-3 h-px w-10 bg-orbit-gradient" />
      <p className="font-display text-[11px] font-bold tracking-wide">
        <span className="orbit-text-gradient">ÓRBITA</span> <span className="text-white">X</span>
      </p>
      <p className="text-[8px] uppercase tracking-[0.2em] text-white/40">Seu universo em conexão</p>
    </div>
  );
}

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [drawer, setDrawer] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);

  async function signOut() {
    setSigningOut(true);
    await disablePush(supabase).catch(() => {});
    await endPresenceForSignOut().catch(() => {});
    await supabase.auth.signOut();
    router.push("/entrar");
  }

  return (
    <div data-app-theme="dark" className="min-h-screen bg-space-bg bg-stars text-white">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-space-surface/80 backdrop-blur lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavList pathname={pathname} />
        </div>
        <div className="p-3">
          <BottomCard />
        </div>
      </aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <aside className="animate-sheet-up absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-space-surface">
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fechar" className="rounded-full p-1.5 text-white/60 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavList pathname={pathname} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="p-3">
              <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5">
                <LogOut className="h-4 w-4" /> Sair do painel
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:ml-[16rem]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-space-bg/85 px-4 py-3 backdrop-blur md:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Menu" className="rounded-full p-2 text-white/70 hover:bg-white/5 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <label className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-space-card/70 px-4 py-2.5 focus-within:border-orbit-purple/50 sm:flex md:max-w-xl">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              placeholder="Buscar usuários, comunidades, conteúdos…"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) router.push(`/admin/usuarios?q=${encodeURIComponent(v)}`);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </label>
          <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
            <Link href="/admin/denuncias" aria-label="Denúncias" className="relative rounded-full p-2 text-white/70 hover:bg-white/5">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card">
                {admin.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={admin.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-sm font-bold text-white/80">{admin.name.charAt(0)}</span>
                )}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-white">{admin.name}</p>
                <p className="text-[11px] text-white/50">Administrador</p>
              </div>
              <button type="button" onClick={signOut} aria-label="Sair" className="hidden rounded-full p-2 text-white/50 hover:bg-white/5 hover:text-white sm:block">
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              </button>
            </div>
            <div className="hidden md:block">
              <Clock />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
