import type { Metadata } from "next";
import { Apple, Bell, Download, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-header";
import { InstallAppButton } from "@/components/pwa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Baixe o app ÓrbitaX",
  description: "Instale o ÓrbitaX no Android (APK), iPhone ou computador e receba notificações na hora.",
};

// Latest APK built by GitHub Actions (.github/workflows/android.yml).
const APK_URL = "https://github.com/CBTVMAX/-rbitaX-/releases/latest/download/orbitax.apk";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-white/75">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orbit-purple/20 text-xs font-bold text-orbit-purple">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export default async function AppDownloadPage() {
  const {
    data: { user },
  } = await createClient().auth.getUser();

  const secondary =
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/5";

  return (
    <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />
      <div className="relative z-10">
        <PublicHeader authed={!!user} />

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
          <section className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-512.png"
              alt="ÓrbitaX"
              className="h-24 w-24 rounded-[1.6rem] shadow-[0_0_48px_rgba(139,92,246,0.45)] sm:h-28 sm:w-28"
            />
            <h1 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
              ÓrbitaX no seu <span className="orbit-text-gradient">celular</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
              Instale o app para abrir o ÓrbitaX direto da tela inicial, em tela cheia, e receber mensagens e pedidos de
              amizade na hora — mesmo com o app fechado.
            </p>
          </section>

          <section className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-orbit-purple/40 bg-space-card p-6 shadow-[0_0_40px_rgba(139,92,246,0.15)] lg:col-span-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Smartphone className="h-5 w-5 text-orbit-cyan" /> Android
              </p>
              <a
                href={APK_URL}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Baixar APK
              </a>
              <ol className="mt-5 space-y-3">
                <Step n={1}>Toque em <strong className="text-white">Baixar APK</strong>.</Step>
                <Step n={2}>Abra o arquivo <strong className="text-white">orbitax.apk</strong> nos downloads.</Step>
                <Step n={3}>
                  Se o celular pedir, permita <strong className="text-white">instalar apps desta fonte</strong>.
                </Step>
                <Step n={4}>Toque em <strong className="text-white">Instalar</strong> e entre com sua conta.</Step>
              </ol>
              <div className="mt-5 empty:hidden">
                <InstallAppButton className={secondary} hint="Prefere sem baixar arquivo?" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-space-card p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Apple className="h-5 w-5 text-orbit-cyan" /> iPhone e iPad
              </p>
              <ol className="mt-4 space-y-3">
                <Step n={1}>Abra <strong className="text-white">orbitax.social.br</strong> no Safari.</Step>
                <Step n={2}>
                  Toque em <strong className="text-white">Compartilhar</strong> (o quadrado com a seta).
                </Step>
                <Step n={3}>
                  Escolha <strong className="text-white">Adicionar à Tela de Início</strong> e confirme.
                </Step>
                <Step n={4}>Abra pelo ícone do ÓrbitaX e ative as notificações.</Step>
              </ol>
            </div>

            <div className="rounded-2xl border border-white/10 bg-space-card p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Monitor className="h-5 w-5 text-orbit-cyan" /> Computador
              </p>
              <p className="mt-4 text-sm text-white/65">
                No Chrome ou no Edge, clique no ícone de instalar na barra de endereço, ou use o botão abaixo.
              </p>
              <div className="mt-4">
                <InstallAppButton
                  className={secondary}
                  label="Instalar no computador"
                />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-space-card/70 p-5">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-orbit-pink" />
              <div>
                <p className="text-sm font-semibold text-white">Notificações na hora</p>
                <p className="text-xs text-white/55">
                  Mensagens, pedidos de amizade e avisos chegam no celular mesmo com o app fechado. Ative quando o
                  ÓrbitaX perguntar ou em Configurações → Notificações.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-space-card/70 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">App oficial</p>
                <p className="text-xs text-white/55">
                  Assinado pelo ÓrbitaX e ligado ao endereço orbitax.social.br. As atualizações instalam por cima,
                  sem perder sua conta.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
