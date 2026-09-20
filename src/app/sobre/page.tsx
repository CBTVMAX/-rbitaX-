import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { OrbitLogo } from "@/components/orbit-logo";
import {
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  Compass,
  Globe,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STATS: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Users, title: "Conexões reais", text: "Pessoas de todo o Brasil e além das fronteiras.", color: "text-orbit-cyan" },
  { icon: Globe, title: "Interesses sem limites", text: "Do cotidiano ao extraordinário.", color: "text-orbit-blue" },
  { icon: Users, title: "Comunidades ativas", text: "Espaços para todos os gostos.", color: "text-orbit-purple" },
  { icon: Star, title: "Um universo em expansão", text: "Sempre evoluindo com você.", color: "text-orbit-cyan" },
];

const PILLARS: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Users, title: "Pessoas", text: "Encontre pessoas com interesses semelhantes.", color: "border-orbit-blue/40 text-orbit-blue" },
  { icon: Compass, title: "Explorar", text: "Descubra conteúdos, perfis e novos interesses.", color: "border-orbit-purple/40 text-orbit-purple" },
  { icon: Users, title: "Comunidades", text: "Participe de espaços criados em torno de assuntos que você gosta.", color: "border-orbit-cyan/40 text-orbit-cyan" },
  { icon: MessageCircle, title: "Conexões", text: "Converse, compartilhe momentos e faça novas amizades.", color: "border-orbit-pink/40 text-orbit-pink" },
  { icon: Sparkles, title: "Música", text: "Descubra e compartilhe músicas, playlists e artistas.", color: "border-orbit-pink/40 text-orbit-pink" },
  { icon: Shield, title: "Privacidade", text: "Você no controle de quem vê o seu conteúdo.", color: "border-orbit-cyan/40 text-orbit-cyan" },
];

export default async function SobrePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <section
        className="relative overflow-hidden bg-cover bg-no-repeat"
        style={{ backgroundImage: "url(/explore-hero.webp)", backgroundPosition: "right center" }}
      >
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: "linear-gradient(180deg, rgba(5,6,15,0.75) 0%, rgba(5,6,15,0.93) 60%, rgba(5,6,15,0.98) 100%)" }}
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ background: "linear-gradient(90deg, rgba(5,6,15,0.96) 0%, rgba(5,6,15,0.8) 35%, rgba(5,6,15,0.25) 65%, rgba(5,6,15,0.05) 85%)" }}
        />

        <div className="relative z-10">
          <PublicHeader authed={!!user} />

          <p className="absolute right-6 top-24 hidden max-w-[9rem] rotate-[-3deg] font-script text-xl leading-snug text-white/70 lg:block">
            Conecte
            <br />
            Explore
            <br />
            Compartilhe
            <br />
            Viva novos
            <br />
            mundos.
          </p>

          <div className="absolute bottom-10 right-6 hidden text-right lg:block">
            <p className="text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-white/70">
              Pessoas
              <br />
              Ideias
              <br />
              Comunidades
              <br />
              Sem fronteiras
            </p>
            <span className="mt-2 ml-auto block h-0.5 w-8 bg-orbit-pink" />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-16 pt-2 sm:px-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
              <span className="text-orbit-cyan">|</span> Sobre o ÓrbitaX
            </p>
            <div className="max-w-xl">
              <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
                Seu universo
                <br />
                <span className="orbit-text-gradient">em conexão.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
                O ÓrbitaX é uma rede social criada para conectar pessoas, ideias, interesses e
                comunidades em um só lugar. Aqui, você encontra liberdade para ser quem é,
                explorar novos mundos e fazer parte de algo maior.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/criar-conta"
                  className="inline-flex items-center gap-2 rounded-full bg-orbit-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  Criar uma conta →
                </Link>
                <Link
                  href="/explorar"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
                >
                  Explorar agora
                </Link>
              </div>
              <p className="mt-5 text-xs text-white/40">
                Mais que uma rede social. Um universo de possibilidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-space-surface/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
          {STATS.map(({ icon: Icon, title, text, color }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center">
              <Icon className={`h-7 w-7 ${color}`} />
              <span className="text-sm font-semibold text-white">{title}</span>
              <span className="text-xs text-white/50">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6">
        <section className="mb-16 grid items-center gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
              <span className="text-orbit-purple">|</span> Nossa proposta
            </p>
            <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              Criar conexões que <span className="orbit-text-gradient">fazem sentido.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
              Acreditamos que a internet pode ser um lugar mais humano, criativo e livre. Por
              isso, o ÓrbitaX foi criado para ser um espaço onde você pode descobrir novos
              interesses, compartilhar momentos, participar de comunidades e construir conexões
              reais.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sobre-proposta.webp"
            alt="Pessoa observando a Terra do espaço"
            className="w-full rounded-2xl border border-white/10 object-cover"
          />
        </section>

        <section className="mb-16">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
            <span className="text-orbit-cyan">|</span> O que você encontra no ÓrbitaX
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text, color }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-space-card p-5 transition hover:border-white/20"
              >
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full border-2 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-space-card">
          <div className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-space-bg">
                <OrbitLogo size={32} />
              </div>
              <div>
                <h3 className="mb-1 text-xl font-bold text-white">Pronto para fazer parte?</h3>
                <p className="max-w-md text-sm text-white/60">
                  Crie sua conta agora e comece a explorar o seu universo.
                </p>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-6 sm:w-auto">
              <Link
                href="/criar-conta"
                className="inline-flex items-center gap-2 rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                Criar uma conta →
              </Link>
              <p className="shrink-0 text-right text-xs font-semibold uppercase tracking-wide text-white/30">
                Ideias
                <br />
                Pessoas
                <br />
                Comunidades
                <br />
                Sempre.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
