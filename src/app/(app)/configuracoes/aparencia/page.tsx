import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Palette } from "lucide-react";
import { APP_THEME_COOKIE, parseAppTheme } from "@/lib/app-theme";
import { AppearancePicker } from "@/components/appearance-picker";

export const dynamic = "force-dynamic";

export default function AppearancePage() {
  const theme = parseAppTheme(cookies().get(APP_THEME_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          aria-label="Voltar para Configurações"
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Aparência</h1>
          <p className="text-sm text-white/60">Escolha como o Órbita X aparece para você neste aparelho.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Tema do aplicativo</h2>
        <p className="mb-4 text-xs text-white/55">
          Muda o feed, o Messenger, as configurações e todo o restante do aplicativo.
        </p>
        <AppearancePicker initial={theme} />
      </section>

      <Link
        href="/configuracoes/personalizar"
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-surface/80 p-4 transition hover:border-orbit-purple/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
          <Palette className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">Personalizar perfil</span>
          <span className="block text-xs text-white/55">
            A cor e o estilo do seu perfil são separados do tema do aplicativo e aparecem para todos que visitam você.
          </span>
        </span>
      </Link>
    </div>
  );
}
