import Link from "next/link";
import { ChevronDown, Compass, Globe, Infinity as InfinityIcon, Users, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OrbitLogo, OrbitWordmarkImage } from "@/components/orbit-logo";

const FEATURES: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Users, title: "Conecte-se", text: "Conheça pessoas com interesses semelhantes.", color: "border-orbit-blue/40 text-orbit-blue" },
  { icon: Compass, title: "Explore", text: "Descubra novos conteúdos, perfis e comunidades.", color: "border-orbit-purple/40 text-orbit-purple" },
  { icon: UsersRound, title: "Participe", text: "Compartilhe seus momentos e faça parte de comunidades.", color: "border-orbit-purple/40 text-orbit-purple" },
  { icon: InfinityIcon, title: "Viva novos mundos", text: "Do cotidiano ao extraordinário.", color: "border-orbit-pink/40 text-orbit-pink" },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-space-bg bg-stars px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <span className="absolute right-6 top-6 z-10 hidden items-center gap-1.5 text-sm text-white/50 sm:flex">
        <Globe className="h-4 w-4" /> Português <ChevronDown className="h-3.5 w-3.5" />
      </span>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-space-surface/80 shadow-2xl backdrop-blur md:grid-cols-[1.15fr_1fr]">
        <div
          className="relative hidden flex-col justify-between overflow-hidden bg-cover p-10 md:flex"
          style={{ backgroundImage: "url(/entrar-hero.webp)", backgroundPosition: "center center" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(5,6,15,0.97) 0%, rgba(5,6,15,0.92) 42%, rgba(5,6,15,0.5) 75%, rgba(5,6,15,0.15) 100%)" }}
          />

          <div className="relative">
            <Link href="/" className="mb-10 flex items-center gap-2">
              <OrbitLogo size={36} />
              <OrbitWordmarkImage className="h-9 w-auto" />
            </Link>
            <h2 className="mb-6 max-w-md font-display text-2xl font-semibold leading-tight text-white">
              Um lugar para pessoas reais, interesses verdadeiros e conteúdos que{" "}
              <span className="orbit-text-gradient">fazem sentido</span> para você.
            </h2>
            <ul className="space-y-4">
              {FEATURES.map(({ icon: Icon, title: featTitle, text, color }) => (
                <li key={featTitle} className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{featTitle}</p>
                    <p className="text-xs text-white/50">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-10 max-w-xs">
            <p className="text-xs font-semibold uppercase leading-relaxed tracking-[0.1em] text-white/40">
              &ldquo;Grandes conexões começam com interesses em comum.&rdquo;
            </p>
            <span className="mt-2 block h-0.5 w-8 bg-orbit-pink" />
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <OrbitLogo size={28} />
            <OrbitWordmarkImage className="h-7 w-auto" />
          </div>
          <h1 className="mb-1 font-display text-2xl font-bold text-white">
            {title} no <span className="orbit-text-gradient">ÓrbitaX</span>
          </h1>
          <p className="mb-6 text-sm text-white/50">{subtitle}</p>
          {children}
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-2 text-xs text-white/30 sm:flex-row">
        <p>© {new Date().getFullYear()} ÓrbitaX. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <Link href="/termos" className="transition hover:text-white/60">Termos de Uso</Link>
          <Link href="/privacidade" className="transition hover:text-white/60">Política de Privacidade</Link>
          <Link href="/contato" className="transition hover:text-white/60">Suporte</Link>
        </div>
      </div>
    </div>
  );
}
