import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { NotificationSettings } from "@/components/notification-settings";
import { NotificationPrefs } from "@/components/notification-prefs";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPrefsState } from "@/lib/notification-prefs";

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/configuracoes/notificacoes");
  const { data } = await (await createClient()).rpc("my_notification_prefs");
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
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Notificações</h1>
          <p className="text-sm text-white/60">Escolha como e sobre o que o Órbita X avisa você.</p>
        </div>
      </div>
      <NotificationSettings />
      {data ? (
        <NotificationPrefs initial={data as unknown as NotificationPrefsState} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 text-sm text-white/60">Não foi possível carregar suas preferências agora. Atualize a página.</p>
      )}
    </div>
  );
}
