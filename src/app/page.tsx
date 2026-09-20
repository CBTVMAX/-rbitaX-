import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitLogo, OrbitLockup } from "@/components/orbit-logo";
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

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-2">
          <OrbitLogo size={32} />
          <div className="min-w-0 leading-none">
            <div className="font-display text-base font-bold orbit-text-gradient sm:text-lg">
              ÓRBITA<span className="text-white">X</span>
            </div>
            <div className="hidden text-[9px] uppercase tracking-[0.25em] text-white/40 sm:block">
              Seu universo em conexão
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-white/70 lg:flex">
          <a href="#inicio" className="hover:text-white">Início</a>
          <a href="#explorar" className="hover:text-white">Explorar</a>
          <a href="#comunidades" className="hover:text-white">Comunidades</a>
          <a href="#sobre" className="hover:text-white">Sobre</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/entrar"
            className="hidden rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-full bg-orbit-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90 sm:px-5 sm:text-sm"
          >
            Criar uma conta →
          </Link>
        </div>
      </header>

      <section
        id="inicio"
        className="relative min-h-[85vh] overflow-hidden bg-cover bg-no-repeat md:min-h-[80vh]"
        style={{ backgroundImage: "url('/hero-earth.webp')", backgroundPosition: "center right" }}
      >
        {/* dark fade so the text stays legible without hiding the Earth */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,6,15,0.55) 0%, rgba(5,6,15,0.88) 55%, rgba(5,6,15,0.97) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(5,6,15,0.9) 0%, rgba(5,6,15,0.55) 40%, rgba(5,6,15,0.05) 75%)",
          }}
        />

        <p className="absolute right-6 top-8 z-10 hidden max-w-[9rem] rounded-xl border border-white/10 bg-space-bg/70 px-3 py-2 text-right text-xs font-semibold uppercase leading-tight tracking-[0.2em] text-white shadow-lg backdrop-blur-sm md:block">
          Um lugar onde você pertence
        </p>

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-20">
          <div className="max-w-xl">
            <div className="mb-8 inline-block rounded-xl border border-orbit-cyan/40 bg-space-bg/70 py-2 pl-4 pr-5 text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white shadow-lg backdrop-blur-sm">
              <span className="border-l-2 border-orbit-cyan pl-3">
                Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
              </span>
            </div>

            <OrbitLockup className="mb-8 h-auto w-full max-w-sm sm:max-w-md" />

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
        </div>
      </section>

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
