import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { MessageCircle, Shield, Sparkles, Users, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Users, title: "Pessoas", text: "Encontre pessoas com interesses semelhantes." },
  { icon: Compass, title: "Explorar", text: "Descubra conteúdos, perfis e novos interesses." },
  { icon: Users, title: "Comunidades", text: "Participe de espaços criados em torno de assuntos que você gosta." },
  { icon: MessageCircle, title: "Conexões", text: "Converse e compartilhe momentos." },
  { icon: Sparkles, title: "Música", text: "Descubra e compartilhe música." },
  { icon: Shield, title: "Privacidade", text: "Você no controle de quem vê o seu conteúdo." },
];

export default async function SobrePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <PublicHeader authed={!!user} />

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-6 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Sobre o ÓrbitaX</h1>
        <p className="mt-2 orbit-text-gradient text-lg font-semibold">Seu universo em conexão.</p>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          O ÓrbitaX é uma rede social criada para conectar pessoas, interesses, comunidades e
          conteúdos em um único espaço. Aqui, você encontra liberdade para ser quem é, explorar
          novos mundos e fazer parte de algo maior.
        </p>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold text-white">Nossa proposta</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Criar um espaço onde as pessoas possam descobrir novos interesses, compartilhar
            momentos, participar de comunidades e construir conexões reais.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold text-white">O que você encontra no ÓrbitaX</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {!user && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-space-surface/60 p-6 text-center backdrop-blur sm:p-8">
            <h2 className="mb-2 font-display text-xl font-bold text-white">Pronto para entrar em órbita?</h2>
            <p className="mb-5 text-sm text-white/60">Crie sua conta e comece a se conectar hoje mesmo.</p>
            <a
              href="/criar-conta"
              className="inline-flex rounded-full bg-orbit-gradient px-7 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              Criar uma conta
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
