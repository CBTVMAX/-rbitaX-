"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Download, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { enablePush, pushStatus, syncPush, type PushStatus } from "@/lib/push-client";

/** Registers the service worker (offline screen + push) on every page. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

const DISMISS_KEY = "orbitax:push-prompt-dismissed";

/**
 * Invites the member to turn on notifications (messages, friend requests…) so they
 * arrive even with the app closed. Shown once; can be turned on later in Configurações.
 */
export function PushPrompt() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    syncPush(supabase);
    pushStatus().then(setStatus);
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(Date.now() - dismissedAt < 7 * 24 * 3600 * 1000);
    } catch {
      setHidden(false);
    }
  }, [supabase]);

  if (hidden || status !== "default") return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  };

  async function activate() {
    setBusy(true);
    try {
      const next = await enablePush(supabase);
      setStatus(next);
      if (next !== "enabled") dismiss();
    } catch {
      dismiss();
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 md:inset-x-auto md:bottom-5 md:right-5 md:w-96">
      <div className="flex items-start gap-3 rounded-2xl border border-orbit-purple/40 bg-space-surface/95 p-4 shadow-2xl backdrop-blur">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Ative as notificações</p>
          <p className="mt-0.5 text-xs text-white/60">
            Saiba na hora quando chegar mensagem ou pedido de amizade, mesmo com o ÓrbitaX fechado.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-snow shadow-glow disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Ativar
            </button>
            <button type="button" onClick={dismiss} className="rounded-full px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white">
              Agora não
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar" className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Instalar app" straight from the browser (Android/desktop Chrome, Edge…). */
export function InstallAppButton({
  className,
  label = "Instalar pelo navegador",
  hint,
}: {
  className?: string;
  label?: string;
  /** Shown above the button only when the browser offers installation. */
  hint?: string;
}) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="text-sm font-medium text-emerald-400">O ÓrbitaX já está instalado neste aparelho.</p>;
  }
  if (!event) return null;

  return (
    <>
    {hint && <p className="mb-2 text-xs text-white/45">{hint}</p>}
    <button
      type="button"
      onClick={async () => {
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === "accepted") setInstalled(true);
        setEvent(null);
      }}
      className={className}
    >
      <Download className="h-4 w-4" /> {label}
    </button>
    </>
  );
}
