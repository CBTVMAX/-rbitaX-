"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BellOff, BellRing, CheckCircle2, Download, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push-client";

export function NotificationSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    pushStatus().then(setStatus);
  }, []);

  async function toggle() {
    setBusy(true);
    if (status === "enabled") {
      await disablePush(supabase);
      setStatus("default");
    } else {
      try {
        setStatus(await enablePush(supabase));
      } catch {
        setStatus(await pushStatus());
      }
    }
    setBusy(false);
  }

  async function test() {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("ÓrbitaX", {
      body: "Tudo certo! É assim que as notificações vão aparecer.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: "/notificacoes" },
    });
    setTested(true);
  }

  const enabled = status === "enabled";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              enabled ? "bg-orbit-gradient text-snow" : "bg-white/10 text-white/60"
            )}
          >
            {enabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">Notificações neste aparelho</h2>
            <p className="mt-0.5 text-sm text-white/60">
              Mensagens, pedidos de amizade, pedidos aceitos, curtidas e comentários — mesmo com o ÓrbitaX fechado.
            </p>
            <p className="mt-2 text-xs font-medium">
              {status === null && <span className="text-white/40">Verificando…</span>}
              {enabled && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ativadas
                </span>
              )}
              {status === "default" && <span className="text-white/50">Desativadas</span>}
              {status === "denied" && (
                <span className="text-amber-300">
                  Bloqueadas pelo navegador. Libere em Configurações do site (cadeado ao lado do endereço) e volte aqui.
                </span>
              )}
              {status === "unsupported" && (
                <span className="text-amber-300">
                  Este navegador não recebe notificações. No iPhone, instale o ÓrbitaX na Tela de Início primeiro.
                </span>
              )}
            </p>
          </div>
        </div>

        {(status === "default" || enabled) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className={clsx(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60",
                enabled ? "border border-white/15 text-white/85 hover:bg-white/5" : "bg-orbit-gradient text-snow shadow-glow"
              )}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {enabled ? "Desativar neste aparelho" : "Ativar notificações"}
            </button>
            {enabled && (
              <button
                type="button"
                onClick={test}
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/5"
              >
                <Send className="h-4 w-4" /> {tested ? "Enviada!" : "Enviar teste"}
              </button>
            )}
          </div>
        )}
      </section>

      <Link
        href="/app"
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-surface/80 p-4 transition hover:border-orbit-purple/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
          <Download className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">Baixe o app ÓrbitaX</span>
          <span className="block text-xs text-white/55">Android (APK), iPhone e computador.</span>
        </span>
      </Link>
    </div>
  );
}
