import Link from "next/link";
import { clsx } from "clsx";
import { ChevronDown, Globe } from "lucide-react";
import { OrbitLogo, OrbitWordmarkImage } from "@/components/orbit-logo";

const NAV = [
  { href: "/explorar", label: "Explorar" },
  { href: "/comunidades", label: "Comunidades" },
  { href: "/sobre", label: "Sobre" },
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

      <div className="relative z-10 hidden w-full max-w-6xl items-center justify-between md:flex">
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

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-space-surface/80 shadow-2xl backdrop-blur md:min-h-[75vh] md:grid-cols-[1.15fr_1fr]">
        <div
          className="relative hidden items-center justify-center overflow-hidden bg-cover bg-no-repeat p-10 md:flex"
          style={{ backgroundImage: "url(/hero-astronaut-desktop.webp)", backgroundPosition: "center center" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(0deg, rgba(5,6,15,0.55) 0%, transparent 45%)" }}
          />
          <OrbitWordmarkImage className="relative h-auto w-full max-w-sm drop-shadow-[0_0_30px_rgba(79,139,255,0.35)]" />
        </div>

        <div className="flex flex-col justify-center p-8 md:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <OrbitLogo size={28} />
            <OrbitWordmarkImage className="h-7 w-auto" />
          </div>

          {activeTab && (
            <div className="mb-6 hidden gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm md:flex">
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
              <h1 className="mb-1 font-display text-2xl font-bold text-white">
                {heading ?? (
                  <>
                    {title} no <span className="orbit-text-gradient">ÓrbitaX</span>
                  </>
                )}
              </h1>
            </div>
            {topRight && <div className="hidden shrink-0 text-right md:block">{topRight}</div>}
          </div>
          <p className="mb-6 text-sm text-white/60">{subtitle}</p>
          {children}
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-2 text-xs text-white/40 sm:flex-row">
        <p>© {new Date().getFullYear()} ÓrbitaX. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <Link href="/termos" className="transition hover:text-white/70">Termos de Uso</Link>
          <Link href="/privacidade" className="transition hover:text-white/70">Política de Privacidade</Link>
          <Link href="/contato" className="transition hover:text-white/70">Suporte</Link>
        </div>
      </div>
    </div>
  );
}
