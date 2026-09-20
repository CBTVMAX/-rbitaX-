import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitLogo } from "@/components/orbit-logo";
import { LandingAuthRow } from "@/components/landing-auth-row";
import { Compass, MessageCircle, Sparkles, Users, Music2 } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Users, title: "Conecte", subtitle: "Pessoas reais" },
  { icon: Compass, title: "Explore", subtitle: "Novos interesses" },
  { icon: MessageCircle, title: "Compartilhe", subtitle: "Seus momentos" },
  { icon: Users, title: "Participe", subtitle: "Comunidades" },
  { icon: Sparkles, title: "Descubra", subtitle: "Mais de você" },
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

      <main id="inicio" className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-16">
        <div>
          <div className="mb-8 border-l-2 border-orbit-cyan pl-3 text-xs uppercase leading-6 tracking-[0.2em] text-white/50">
            Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
          </div>

          <div className="mb-2 flex items-center gap-4">
            <OrbitLogo size={64} />
            <h1 className="font-display text-5xl font-bold leading-none orbit-text-gradient md:text-6xl">
              ÓRBITAX
            </h1>
          </div>
          <p className="mb-4 pl-1 text-sm uppercase tracking-[0.15em] text-white/50">
            Seu universo em conexão
          </p>
          <p className="mb-8 max-w-md text-white/70">
            Um lugar para pessoas reais, interesses verdadeiros e conteúdos que fazem sentido
            para você.
          </p>

          <div className="mb-5 flex flex-wrap gap-4">
            <Link
              href="/criar-conta"
              className="rounded-full bg-orbit-gradient px-7 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              Criar uma conta →
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

        <div className="relative hidden md:block">
          <div className="absolute inset-0 rounded-full bg-orbit-gradient opacity-10 blur-3xl" />
          <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-full border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-earth.webp" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 rounded-full border-2 border-orbit-purple/30 animate-orbit-spin" />
          </div>
          <p className="absolute right-0 top-6 max-w-[7rem] text-right text-[11px] font-medium uppercase leading-tight tracking-[0.15em] text-white/50">
            Um lugar onde você pertence
          </p>
        </div>
      </main>

      <section id="explorar" className="relative z-10 border-t border-white/10 bg-space-surface/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orbit-blue/20 via-orbit-purple/20 to-orbit-pink/20">
                <Icon className="h-5 w-5 text-orbit-cyan" />
              </div>
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
