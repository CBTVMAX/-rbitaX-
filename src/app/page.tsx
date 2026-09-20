import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitLogo } from "@/components/orbit-logo";
import { LandingAuthRow } from "@/components/landing-auth-row";
import { Compass, MessageCircle, PlayCircle, Sparkles, Users } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Users, title: "Conecte", subtitle: "Pessoas reais", color: "text-orbit-blue" },
  { icon: Compass, title: "Explore", subtitle: "Novos interesses", color: "text-orbit-purple" },
  { icon: PlayCircle, title: "Compartilhe", subtitle: "Seus momentos", color: "text-orbit-pink" },
  { icon: Users, title: "Participe", subtitle: "Comunidades", color: "text-orbit-cyan" },
  { icon: Sparkles, title: "Descubra", subtitle: "Mais de você", color: "text-orbit-pink" },
];

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <OrbitLogo size={36} />
          <div className="leading-none">
            <div className="font-display text-lg font-bold orbit-text-gradient">
              ÓRBITA<span className="text-white">X</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/40">
              Seu universo em conexão
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#inicio" className="hover:text-white">Início</a>
          <a href="#explorar" className="hover:text-white">Explorar</a>
          <a href="#comunidades" className="hover:text-white">Comunidades</a>
          <a href="#sobre" className="hover:text-white">Sobre</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/entrar"
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5"
          >
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-full bg-orbit-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
          >
            Criar uma conta →
          </Link>
        </div>
      </header>

      <main id="inicio" className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-6 md:pb-24 md:pt-10">
        {/* Earth photo bleeds past the right edge of the viewport, no frame */}
        <div className="pointer-events-none absolute -right-[8%] -top-10 hidden h-[42rem] w-[62%] md:block lg:h-[46rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-earth.webp" alt="" className="h-full w-full object-cover object-right" />
          <div className="absolute inset-0 bg-gradient-to-r from-space-bg via-transparent to-transparent" />
        </div>
        <p className="absolute right-6 top-24 hidden max-w-[8rem] text-right text-xs font-medium uppercase leading-tight tracking-[0.2em] text-white/60 md:block">
          Um lugar onde você pertence
        </p>

        <div className="relative max-w-xl">
          <div className="mb-8 border-l-2 border-orbit-cyan pl-3 text-xs uppercase leading-6 tracking-[0.2em] text-white/50">
            Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
          </div>

          <div className="mb-2 flex items-center gap-3">
            <OrbitLogo size={72} />
            <h1 className="font-display text-6xl font-bold leading-none orbit-text-gradient md:text-7xl">
              ÓRBITAX
            </h1>
          </div>
          <p className="mb-6 pl-1 text-sm uppercase tracking-[0.2em] text-white/50">
            Seu universo em conexão
          </p>
          <p className="mb-8 max-w-md text-white/70">
            Um lugar para pessoas reais, interesses verdadeiros e conteúdos que fazem sentido
            para você.
          </p>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Link
              href="/criar-conta"
              className="flex items-center gap-3 rounded-full bg-orbit-gradient py-3 pl-7 pr-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              Criar uma conta
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">→</span>
            </Link>
            <Link
              href="/entrar"
              className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            >
              Entrar
            </Link>
          </div>

          <div className="mb-5 flex max-w-md items-center gap-3 text-xs text-white/30">
            <div className="h-px flex-1 bg-white/10" />
            OU
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="max-w-md">
            <LandingAuthRow />
          </div>

          <p className="max-w-md text-xs text-white/40">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline hover:text-white/70">Termos de Uso</a> e a{" "}
            <a href="/privacidade" className="underline hover:text-white/70">Política de Privacidade</a>.
          </p>
        </div>
      </main>

      <section id="explorar" className="relative z-10 border-t border-white/10 bg-space-surface/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, subtitle, color }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <Icon className={`h-7 w-7 ${color}`} />
              <span className="text-sm font-semibold text-white">{title}</span>
              <span className="text-xs text-white/50">{subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="comunidades" className="sr-only" aria-hidden />
      <section id="sobre" className="sr-only" aria-hidden />
    </div>
  );
}
