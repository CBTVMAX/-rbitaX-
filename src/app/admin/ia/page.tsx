import type { Metadata } from "next";
import Link from "next/link";
import { Flag, LayoutGrid, Sparkles, Users } from "lucide-react";
import { AdminPageHead } from "@/components/admin/page-head";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "IA Assistente · Painel · Órbita X", robots: { index: false } };

const PLANNED = [
  { icon: Flag, title: "Triagem de denúncias", text: "A IA lê a denúncia e o conteúdo, sugere uma decisão e explica o motivo — você aprova com um clique." },
  { icon: LayoutGrid, title: "Moderação de conteúdo", text: "Detecção de spam, discurso de ódio e conteúdo impróprio nas publicações e comentários, antes de virarem denúncia." },
  { icon: Users, title: "Insights da plataforma", text: "Perguntas em linguagem natural sobre crescimento, retenção e comunidades em alta." },
];

export default function Page() {
  return (
    <div>
      <AdminPageHead title="IA Assistente" subtitle="Um copiloto para moderar e entender a plataforma." />
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-orbit-purple/30 bg-gradient-to-r from-orbit-purple/15 to-space-card p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orbit-gradient text-snow">
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
            Assistente de IA
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Em breve</span>
          </p>
          <p className="text-sm text-white/60">Estamos preparando o assistente. Enquanto isso, a moderação manual (usuários, conteúdos e denúncias) já está no ar.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLANNED.map((p) => (
          <div key={p.title} className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
            <p.icon className="h-5 w-5 text-orbit-cyan" />
            <p className="mt-2 font-semibold text-white">{p.title}</p>
            <p className="mt-1 text-sm text-white/55">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/denuncias" className="rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow shadow-glow">Moderar denúncias manualmente</Link>
        <Link href="/admin/conteudos" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5">Revisar conteúdos</Link>
      </div>
    </div>
  );
}
