import Link from "next/link";
import { clsx } from "clsx";
import { ChevronDown, Compass, Globe, Instagram, MessageCircle, Sparkles, Twitter, Users, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OrbitLogo, OrbitWordmarkImage } from "@/components/orbit-logo";

const NAV = [
  { href: "/explorar", label: "Explorar" },
  { href: "/comunidades", label: "Comunidades" },
  { href: "/sobre", label: "Sobre" },
];

const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Users, title: "Conecte-se", text: "Com pessoas reais", color: "text-orbit-pink" },
  { icon: MessageCircle, title: "Compartilhe", text: "Ideias e momentos", color: "text-orbit-cyan" },
  { icon: Compass, title: "Explore", text: "Comunidades", color: "text-orbit-purple" },
  { icon: Sparkles, title: "Descubra", text: "Um universo de conteúdo", color: "text-orbit-blue" },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.3 5.3A17.6 17.6 0 0 0 15.9 4c-.2.4-.4.9-.6 1.3a16.3 16.3 0 0 0-4.9 0A9 9 0 0 0 9.8 4a17.5 17.5 0 0 0-4.4 1.3C2.6 9 1.9 12.6 2.2 16.2a17.7 17.7 0 0 0 5.3 2.6c.4-.6.8-1.2 1.1-1.9-.6-.2-1.2-.5-1.7-.9l.4-.3c3.3 1.5 6.9 1.5 10.2 0l.4.3c-.6.4-1.1.6-1.7.9.3.7.7 1.3 1.1 1.9a17.6 17.6 0 0 0 5.3-2.6c.4-4.2-.7-7.7-2.3-10.9ZM9.7 14c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

const SOCIALS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: DiscordIcon as unknown as LucideIcon, label: "Discord", href: "#" },
  { icon: Twitter, label: "X", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
];

export function AuthShell({
  children,
  title,
  heading,
  subtitle,
  eyebrow,
  topRight,
  activeTab,
}: {
  children: React.ReactNode;
  title: string;
  heading?: React.ReactNode;
  subtitle: string;
  eyebrow?: string;
  topRight?: React.ReactNode;
  activeTab?: "entrar" | "criar-conta";
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-space-bg bg-stars px-4 py-6">
      <div className="pointer-events-none absolute inset-0 bg-nebula" />
      <div className="pointer-events-none absolute inset-0 bg-stars-deep opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <div className="relative z-10 hidden w-full max-w-7xl items-center justify-between md:flex">
        <Link href="/" className="flex items-center gap-2">
          <OrbitLogo size={30} />
          <OrbitWordmarkImage className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-6 text-sm text-white/70">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className="transition hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <span className="flex items-center gap-1.5 text-sm text-white/50">
            <Globe className="h-4 w-4" /> Português <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-space-surface/80 shadow-2xl backdrop-blur md:min-h-[75vh]">
        <div
          className="pointer-events-none absolute inset-0 hidden bg-cover bg-no-repeat md:block"
          style={{ backgroundImage: "url(/hero-astronaut-desktop.webp)", backgroundPosition: "center center" }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{ background: "linear-gradient(270deg, rgba(5,6,15,0.9) 0%, rgba(5,6,15,0.6) 32%, rgba(5,6,15,0.15) 55%, transparent 70%)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-logo-lockup.webp"
          alt="Órbita X — Seu universo em conexão"
          className="pointer-events-none absolute left-10 top-1/2 hidden h-auto w-full max-w-sm -translate-y-1/2 mix-blend-screen drop-shadow-[0_0_30px_rgba(79,139,255,0.35)] md:block"
        />

        <div className="relative flex min-h-full flex-col p-8 md:flex-row md:items-center md:justify-end md:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <OrbitLogo size={28} />
            <OrbitWordmarkImage className="h-7 w-auto" />
          </div>

          <div className="w-full md:max-w-md md:rounded-2xl md:border md:border-white/10 md:bg-space-surface/70 md:p-8 md:shadow-2xl md:backdrop-blur-xl">
            {activeTab && (
              <div className="mb-6 flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
                <Link
                  href="/entrar"
                  className={clsx(
                    "flex-1 rounded-full py-2 text-center font-medium transition",
                    activeTab === "entrar" ? "bg-orbit-gradient text-white shadow-glow" : "text-white/50 hover:text-white"
                  )}
                >
                  Entrar
                </Link>
                <Link
                  href="/criar-conta"
                  className={clsx(
                    "flex-1 rounded-full py-2 text-center font-medium transition",
                    activeTab === "criar-conta" ? "bg-orbit-gradient text-white shadow-glow" : "text-white/50 hover:text-white"
                  )}
                >
                  Criar conta
                </Link>
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {eyebrow && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-orbit-pink">{eyebrow}</p>
                )}
                <h1 className="mb-0.5 font-display text-2xl font-bold text-white">
                  {heading ?? (
                    <>
                      {title} no <span className="orbit-text-gradient">ÓrbitaX</span>
                    </>
                  )}
                </h1>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Seu universo em conexão
                </p>
              </div>
              {topRight && <div className="hidden shrink-0 text-right md:block">{topRight}</div>}
            </div>
            <p className="mb-6 text-sm text-white/60">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>

      <div className="relative z-10 grid w-full max-w-7xl grid-cols-2 gap-6 px-2 sm:grid-cols-4">
        {HIGHLIGHTS.map(({ icon: Icon, title: hTitle, text, color }) => (
          <div key={hTitle} className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
            <Icon className={clsx("h-6 w-6 shrink-0", color)} />
            <div>
              <p className="text-sm font-semibold text-white">{hTitle}</p>
              <p className="text-xs text-white/50">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 px-2 pt-5 text-xs text-white/40 sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/termos" className="transition hover:text-white/70">Termos de Uso</Link>
          <span className="text-white/15">|</span>
          <Link href="/privacidade" className="transition hover:text-white/70">Política de Privacidade</Link>
          <span className="text-white/15">|</span>
          <Link href="/termos" className="transition hover:text-white/70">Regras da Comunidade</Link>
          <span className="text-white/15">|</span>
          <Link href="/contato" className="transition hover:text-white/70">Ajuda</Link>
        </div>
        <div className="flex items-center gap-4">
          {SOCIALS.map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} aria-label={label} className="text-white/50 transition hover:text-white">
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
        <p>© {new Date().getFullYear()} Órbita X. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
