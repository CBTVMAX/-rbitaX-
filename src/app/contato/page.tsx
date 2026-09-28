import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { OrbitLogo } from "@/components/orbit-logo";
import { ArrowLeft, LifeBuoy, MessageCircle, Settings, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Contato e ajuda · Órbita X",
  description: "Fale com a equipe do Órbita X e encontre ajuda.",
};

const CHANNELS = [
  { icon: LifeBuoy, title: "Central de ajuda", text: "Dúvidas sobre conta, privacidade e uso do Órbita X.", href: "/sobre", cta: "Sobre o Órbita X" },
  { icon: Settings, title: "Configurações e conta", text: "Ajuste seu perfil, segurança e preferências.", href: "/configuracoes", cta: "Abrir configurações" },
  { icon: ShieldCheck, title: "Segurança e privacidade", text: "Sessões, verificação em duas etapas e controle dos seus dados.", href: "/configuracoes/seguranca", cta: "Segurança" },
  { icon: Users, title: "Comunidades", text: "Participe e fale com a comunidade oficial.", href: "/comunidades", cta: "Ver comunidades" },
];

export default function ContatoPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <div className="mb-10 flex flex-col items-center text-center">
          <OrbitLogo className="mb-4 h-14 w-14" />
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Contato e ajuda</h1>
          <p className="mt-3 max-w-xl text-sm text-white/60">
            Estamos aqui para ajudar. Escolha um dos canais abaixo — a maioria das dúvidas se resolve direto pelo app.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-space-surface/60 p-5 transition hover:border-orbit-purple/40 hover:bg-space-surface"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
                <c.icon className="h-5 w-5" />
              </span>
              <span className="mt-1 text-base font-semibold text-white">{c.title}</span>
              <span className="text-sm text-white/55">{c.text}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-orbit-cyan">
                {c.cta}
                <MessageCircle className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-space-surface/40 p-5 text-center text-sm text-white/55">
          Também dá para conferir os{" "}
          <Link href="/termos" className="text-orbit-cyan hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-orbit-cyan hover:underline">
            Política de Privacidade
          </Link>
          .
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
