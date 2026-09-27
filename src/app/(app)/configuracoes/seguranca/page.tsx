import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { SecuritySettings } from "@/components/security-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Segurança · Órbita X", robots: { index: false } };

export default async function SecuritySettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/configuracoes/seguranca");

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          aria-label="Voltar para Configurações"
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Segurança</h1>
          <p className="text-sm text-white/60">Senha, verificação em duas etapas e aparelhos conectados.</p>
        </div>
      </div>
      <SecuritySettings />
    </div>
  );
}
