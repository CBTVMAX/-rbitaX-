import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, Palette, ScrollText, ShieldCheck, Smile } from "lucide-react";
import { AdminPageHead } from "@/components/admin/page-head";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configurações · Painel · Órbita X", robots: { index: false } };

const ITEMS = [
  { href: "/configuracoes/seguranca", icon: ShieldCheck, label: "Minha segurança", hint: "Senha, verificação em duas etapas e aparelhos conectados" },
  { href: "/admin/seguranca", icon: ScrollText, label: "Logs de sistema", hint: "Eventos de segurança e integridade da plataforma" },
  { href: "/admin/adesivos", icon: Smile, label: "Adesivos", hint: "Packs, uploads, moderação e estatísticas" },
  { href: "/configuracoes/notificacoes", icon: Bell, label: "Notificações", hint: "No celular e no computador" },
  { href: "/configuracoes/aparencia", icon: Palette, label: "Aparência do app", hint: "Tema do seu aplicativo (o painel é sempre escuro)" },
];

export default function Page() {
  return (
    <div>
      <AdminPageHead title="Configurações" subtitle="Atalhos de administração e da sua própria conta." />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-card/70">
        {ITEMS.map((it, i) => (
          <Link key={it.label} href={it.href} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/5 ${i ? "border-t border-white/[0.06]" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orbit-purple/10 text-orbit-purple">
              <it.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">{it.label}</span>
              <span className="block truncate text-xs text-white/50">{it.hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
          </Link>
        ))}
      </div>
      <p className="mt-4 rounded-2xl border border-white/10 bg-space-card/50 p-4 text-xs text-white/45">
        Dica de segurança: ative a verificação em duas etapas na sua conta. Ações destrutivas do painel (suspender contas,
        excluir conteúdo, resolver denúncias, creditar Órbita Coins) exigem 2FA.
      </p>
    </div>
  );
}
