import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { PrivacySettings } from "@/components/privacy-settings";
import type { PrivacyState } from "@/lib/privacy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacidade · Órbita X", robots: { index: false } };

export default async function PrivacySettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/configuracoes/privacidade");
  const { data } = await (await createClient()).rpc("my_privacy");

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
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Privacidade</h1>
          <p className="text-sm text-white/60">Escolha quem vê cada parte da sua página e quem pode falar com você.</p>
        </div>
      </div>
      {data ? (
        <PrivacySettings initial={data as unknown as PrivacyState} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 text-sm text-white/60">Não foi possível carregar sua privacidade agora. Atualize a página.</p>
      )}
    </div>
  );
}
