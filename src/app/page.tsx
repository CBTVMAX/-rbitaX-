import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrbitLockup } from "@/components/orbit-logo";
import { LandingAuthRow } from "@/components/landing-auth-row";
import { PublicHeader } from "@/components/public-header";
import { ArrowRight, Compass, LogIn, PlayCircle, Sparkles, UserPlus, Users } from "lucide-react";

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

      <PublicHeader />

      {/* ===== DESKTOP HERO — astronaut-centric universe ===== */}
      <section
        className="relative hidden min-h-[88vh] overflow-hidden bg-cover bg-no-repeat md:block"
        style={{ backgroundImage: "url('/hero-astronaut-desktop.webp')", backgroundPosition: "center center" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(5,6,15,0.85) 0%, rgba(5,6,15,0.45) 32%, rgba(5,6,15,0.1) 48%, transparent 58%)" }}
        />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6 py-16">
          <div className="w-full max-w-lg">
            <div className="mb-6 inline-block rounded-xl border border-orbit-cyan/40 bg-space-bg/70 py-2 pl-4 pr-5 text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white shadow-lg backdrop-blur-sm">
              <span className="border-l-2 border-orbit-cyan pl-3">
                Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
              </span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-logo-lockup.webp"
              alt="Órbita X — Seu universo em conexão"
              className="mb-6 h-auto w-full max-w-lg mix-blend-screen drop-shadow-[0_0_30px_rgba(79,139,255,0.35)]"
            />

            <p className="mb-7 max-w-md text-sm text-white/80">
              Seu universo em conexão: pessoas, ideias e conteúdos girando em torno de você.
            </p>

            <div className="mb-5 flex max-w-md flex-col gap-3">
              <Link
                href="/criar-conta"
                className="flex items-center justify-between rounded-full bg-orbit-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Criar uma conta
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/entrar"
                className="flex items-center justify-between rounded-full border border-white/15 bg-space-bg/40 px-6 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Entrar
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mb-5 flex max-w-md items-center gap-3 text-xs text-white/50">
              <div className="h-px flex-1 bg-white/10" />
              OU
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="max-w-md">
              <LandingAuthRow />
            </div>

            <p className="max-w-md text-xs text-white/60">
              Ao continuar, você concorda com os{" "}
              <a href="/termos" className="underline hover:text-white/80">Termos de Uso</a> e a{" "}
              <a href="/privacidade" className="underline hover:text-white/80">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ===== MOBILE HERO — image banner + solid action zone ===== */}
      <section className="relative overflow-hidden md:hidden">
        <div
          className="relative aspect-[941/1672] w-full overflow-hidden bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/hero-astronaut-mobile.webp')", backgroundPosition: "center top" }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1/3"
            style={{ background: "linear-gradient(180deg, rgba(5,6,15,0.75) 0%, transparent 100%)" }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-space-bg via-space-bg/50 to-transparent" />

          <div className="relative z-10 px-6 pt-8">
            <div className="mb-6 inline-block rounded-xl border border-orbit-cyan/40 bg-space-bg/70 py-2 pl-4 pr-5 text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white shadow-lg backdrop-blur-sm">
              <span className="border-l-2 border-orbit-cyan pl-3">
                Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
              </span>
            </div>
            <OrbitLockup className="h-auto w-full max-w-[15rem]" />
          </div>
        </div>

        <div className="relative z-10 bg-space-bg px-6 pb-10 pt-2">
          <div className="mb-5 flex flex-col gap-3">
            <Link
              href="/criar-conta"
              className="flex items-center justify-center gap-2 rounded-full bg-orbit-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              Criar uma conta →
            </Link>
            <Link
              href="/entrar"
              className="flex items-center justify-center rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            >
              Entrar
            </Link>
          </div>

          <div className="mb-5 flex items-center gap-3 text-xs text-white/50">
            <div className="h-px flex-1 bg-white/10" />
            OU
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <LandingAuthRow />

          <p className="text-center text-xs text-white/60">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline hover:text-white/80">Termos de Uso</a> e a{" "}
            <a href="/privacidade" className="underline hover:text-white/80">Política de Privacidade</a>.
          </p>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-space-surface/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, subtitle, color }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <Icon className={`h-7 w-7 ${color}`} />
              <span className="text-sm font-semibold text-white">{title}</span>
              <span className="text-xs text-white/70">{subtitle}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
