import Link from "next/link";
import { redirect } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { LandingAuthRow } from "@/components/landing-auth-row";
import { PublicHeader } from "@/components/public-header";
import { ArrowRight, Lightbulb, LogIn, Orbit, PlayCircle, User, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MOBILE_PILL: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: User, label: "Pessoas", color: "text-orbit-cyan" },
  { icon: Lightbulb, label: "Ideias", color: "text-orbit-cyan" },
  { icon: PlayCircle, label: "Conteúdos", color: "text-orbit-pink" },
  { icon: Orbit, label: "Em órbita", color: "text-orbit-cyan" },
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
        className="relative hidden min-h-[calc(100vh-167px)] overflow-hidden bg-cover bg-no-repeat md:block"
        style={{ backgroundImage: "url('/hero-astronaut-desktop.webp')", backgroundPosition: "center center" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(5,6,15,0.85) 0%, rgba(5,6,15,0.45) 32%, rgba(5,6,15,0.1) 48%, transparent 58%)" }}
        />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6 py-16">
          <div className="w-full max-w-md">
            <div className="mb-5 inline-block rounded-lg border border-orbit-cyan/40 bg-space-bg/70 py-1.5 pl-3.5 pr-4 text-xs font-semibold uppercase leading-5 tracking-[0.15em] text-white shadow-lg backdrop-blur-sm">
              <span className="border-l-2 border-orbit-cyan pl-2.5">
                Pessoas<br />Ideias<br />Conteúdos<br />Em órbita
              </span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-logo-lockup.webp"
              alt="Órbita X — Seu universo em conexão"
              className="mb-5 h-auto w-full drop-shadow-[0_0_28px_rgba(79,139,255,0.5)]"
            />

            <p className="mb-6 text-sm text-white/80">
              Seu universo em conexão: pessoas, ideias e conteúdos girando em torno de você.
            </p>

            <div className="mb-4 flex flex-col gap-2.5">
              <Link
                href="/criar-conta"
                className="flex items-center justify-between rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Criar uma conta
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/entrar"
                className="flex items-center justify-between rounded-full border border-white/15 bg-space-bg/40 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Entrar
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mb-4 flex items-center gap-3 text-xs text-white/50">
              <div className="h-px flex-1 bg-white/10" />
              OU
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <LandingAuthRow />

            <p className="text-xs text-white/60">
              Ao continuar, você concorda com os{" "}
              <a href="/termos" className="underline hover:text-white/80">Termos de Uso</a> e a{" "}
              <a href="/privacidade" className="underline hover:text-white/80">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ===== MOBILE HERO — astronaut-centric universe, full-bleed ===== */}
      <section
        className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-cover bg-no-repeat md:hidden"
        style={{ backgroundImage: "url('/hero-astronaut-mobile.webp')", backgroundPosition: "center top" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,6,15,0.55) 0%, rgba(5,6,15,0.15) 22%, rgba(5,6,15,0.15) 46%, rgba(5,6,15,0.8) 74%, rgba(5,6,15,0.97) 100%)",
          }}
        />

        <div className="relative z-10 px-5 pt-4">
          <div className="inline-flex flex-col gap-2 rounded-2xl border border-white/15 bg-space-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lg backdrop-blur-sm">
            {MOBILE_PILL.map(({ icon: Icon, label, color }, i) => (
              <div
                key={label}
                className={clsx("flex items-center gap-2.5", i !== 0 && "border-t border-white/10 pt-2")}
              >
                <Icon className={clsx("h-4 w-4 shrink-0", color)} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-auto flex flex-col items-center px-6 pb-8 pt-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-logo-lockup.webp"
            alt="Órbita X — Seu universo em conexão"
            className="mb-4 h-auto w-full max-w-[19rem] drop-shadow-[0_0_28px_rgba(79,139,255,0.5)]"
          />

          <p className="mb-6 text-sm text-white/80">
            Seu universo em conexão: pessoas, ideias e conteúdos girando em torno de você.
          </p>

          <div className="mb-4 flex w-full flex-col gap-2.5">
            <Link
              href="/criar-conta"
              className="flex items-center justify-between rounded-full bg-orbit-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Criar uma conta
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/entrar"
              className="flex items-center justify-between rounded-full border border-white/15 bg-space-bg/40 px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" /> Entrar
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-4 flex w-full items-center gap-3 text-xs text-white/50">
            <div className="h-px flex-1 bg-white/10" />
            OU
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <LandingAuthRow pill />

          <p className="text-xs text-white/60">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline hover:text-white/80">Termos de Uso</a> e a{" "}
            <a href="/privacidade" className="underline hover:text-white/80">Política de Privacidade</a>.
          </p>
        </div>
      </section>

    </div>
  );
}
