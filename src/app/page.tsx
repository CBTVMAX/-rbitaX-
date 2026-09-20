import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitLogo, OrbitWordmark } from "@/components/orbit-logo";
import { Compass, MessageCircle, Share2, Sparkles, Users } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Users, title: "Conecte", subtitle: "Pessoas reais" },
  { icon: Compass, title: "Explore", subtitle: "Novos interesses" },
  { icon: Share2, title: "Compartilhe", subtitle: "Seus momentos" },
  { icon: MessageCircle, title: "Participe", subtitle: "Comunidades" },
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
          <OrbitLogo size={32} />
          <OrbitWordmark className="text-xl" />
        </div>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#inicio" className="hover:text-white">Início</a>
          <a href="#recursos" className="hover:text-white">Recursos</a>
          <a href="#seguranca" className="hover:text-white">Segurança</a>
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

      <main id="inicio" className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <div className="mb-8 flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-white/50">
            <div className="border-l-2 border-orbit-cyan pl-3 leading-5">
              Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <OrbitLogo size={72} />
            <h1 className="font-display text-5xl font-bold leading-none orbit-text-gradient md:text-6xl">
              ÓRBITAX
            </h1>
          </div>
          <p className="mb-2 text-lg text-white/60">Seu universo em conexão</p>
          <p className="mb-10 max-w-md text-white/70">
            Um lugar para pessoas reais, interesses verdadeiros e conteúdos que fazem sentido
            para você.
          </p>

          <div className="mb-6 flex flex-wrap gap-4">
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
          <p className="max-w-md text-xs text-white/40">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline hover:text-white/70">Termos de Uso</a> e a{" "}
            <a href="/privacidade" className="underline hover:text-white/70">Política de Privacidade</a>.
          </p>
        </div>

        <div className="relative hidden md:block">
          <div className="absolute inset-0 rounded-full bg-orbit-gradient opacity-20 blur-3xl" />
          <div className="relative mx-auto h-80 w-80 rounded-full border border-white/10">
            <div className="absolute inset-8 rounded-full border border-orbit-purple/40 animate-orbit-spin" />
            <div className="absolute inset-16 rounded-full bg-gradient-to-br from-orbit-blue/30 via-orbit-purple/30 to-orbit-pink/30 backdrop-blur-sm" />
          </div>
        </div>
      </main>

      <section id="recursos" className="relative z-10 border-t border-white/10 bg-space-surface/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <Icon className="h-6 w-6 text-orbit-cyan" />
              <span className="text-sm font-semibold text-white">{title}</span>
              <span className="text-xs text-white/50">{subtitle}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
