"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Mail, MessageSquare, RotateCcw } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/safe-redirect";

type Status = {
  enabled: boolean;
  emailOn: boolean;
  email: string | null;
  phone: string | null;
  backupLeft: number;
  sessionOk: boolean;
  available: { email: boolean; sms: boolean };
};
type Channel = "email" | "sms";

const input =
  "w-full rounded-lg border border-white/10 bg-space-card py-2.5 pl-[36px] pr-3 text-center text-lg tracking-[0.45em] text-white outline-none focus:border-orbit-purple";

/** Segunda etapa ao entrar: código por SMS ou e-mail, ou um código de reserva. */
export function TwoFactorChallenge() {
  const params = useSearchParams();
  const destination = safeRedirect(params.get("redirect"));
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [mode, setMode] = useState<"code" | "backup">("code");
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = useCallback(async (ch: Channel) => {
    setSending(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/seguranca/2fa/codigo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "login", channel: ch }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { target?: string; message?: string; error?: string } | null;
    setSending(false);
    setChannel(ch);
    if (res?.ok) {
      setTarget(body?.target ?? null);
      setCooldown(45);
      setCode("");
      return;
    }
    if (body?.error === "wait") setCooldown(45);
    setError(body?.message ?? "Não foi possível enviar o código agora.");
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = await fetch("/api/seguranca/2fa", { cache: "no-store" }).catch(() => null);
      if (res?.status === 401) return window.location.replace("/entrar");
      const s = (await res?.json().catch(() => null)) as Status | null;
      if (!s) return setError("Não foi possível carregar a verificação. Atualize a página.");
      if (!s.enabled || s.sessionOk) return window.location.replace(destination);
      setStatus(s);
      // Celular primeiro (como no VK); sem ele, o e-mail.
      const first: Channel | null = s.phone && s.available.sms ? "sms" : s.emailOn && s.available.email ? "email" : null;
      if (first) send(first);
      else {
        setChannel(s.phone ? "sms" : "email");
        setError("O envio de códigos está indisponível no momento. Use um código de reserva.");
        setMode("backup");
      }
    })();
  }, [destination, send]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/seguranca/2fa/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "login", code, trust }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string; method?: string; backupLeft?: number } | null;
    if (res?.ok && body?.ok) {
      if (body.method === "backup" && typeof body.backupLeft === "number" && body.backupLeft <= 2) {
        setNotice(`Restam ${body.backupLeft} códigos de reserva. Gere novos em Configurações › Segurança.`);
        setTimeout(() => window.location.replace(destination), 2200);
        return;
      }
      window.location.replace(destination);
      return;
    }
    setBusy(false);
    setCode("");
    setError(body?.message ?? "Não foi possível confirmar agora.");
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/entrar");
  }

  const other: Channel | null =
    status && channel === "sms" && status.emailOn && status.available.email
      ? "email"
      : status && channel === "email" && status.phone && status.available.sms
        ? "sms"
        : null;

  const subtitle =
    mode === "backup"
      ? "Digite um dos códigos de reserva que você guardou (ex.: ABCD-1234)."
      : !target
        ? "Enviando o código de confirmação…"
        : channel === "sms"
          ? `Enviamos um código por SMS para ${target}.`
          : `Enviamos um código para o e-mail ${target}.`;

  return (
    <AuthShell
      title="Verificação"
      heading={
        <>
          Confirme que é <span className="orbit-text-gradient">você</span>
        </>
      }
      subtitle={subtitle}
    >
      {!status && !error ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <div className="relative">
            {mode === "backup" ? (
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            ) : channel === "sms" ? (
              <MessageSquare className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            ) : (
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            )}
            <input
              key={mode}
              required
              autoFocus
              inputMode={mode === "backup" ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              maxLength={mode === "backup" ? 9 : 6}
              value={code}
              onChange={(e) => setCode(mode === "backup" ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
              placeholder={mode === "backup" ? "XXXX-XXXX" : "000000"}
              className={input}
              aria-label={mode === "backup" ? "Código de reserva" : "Código de confirmação"}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55">
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
            Não pedir de novo neste aparelho por 30 dias
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {notice && <p className="text-xs text-amber-300">{notice}</p>}

          <button
            type="submit"
            disabled={busy || (mode === "code" ? code.length !== 6 : code.replace(/[^A-Z0-9]/g, "").length !== 8)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Confirmando..." : (
              <>
                Confirmar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="space-y-1.5 pt-1 text-center text-xs">
            {mode === "code" && channel && (
              <button
                type="button"
                onClick={() => send(channel)}
                disabled={sending || cooldown > 0}
                className="flex w-full items-center justify-center gap-1.5 text-orbit-cyan hover:underline disabled:text-white/35 disabled:no-underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {sending ? "Enviando…" : cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
              </button>
            )}
            {mode === "code" && other && (
              <button type="button" onClick={() => send(other)} disabled={sending || cooldown > 0} className="block w-full text-white/55 hover:text-white disabled:text-white/30">
                {other === "email" ? "Receber o código por e-mail" : "Receber o código por SMS"}
              </button>
            )}
            {status && status.backupLeft > 0 && (
              <button
                type="button"
                onClick={() => (setMode((m) => (m === "code" ? "backup" : "code")), setCode(""), setError(null))}
                className="block w-full text-white/55 hover:text-white"
              >
                {mode === "code" ? "Usar um código de reserva" : "Voltar para o código enviado"}
              </button>
            )}
            <button type="button" onClick={signOut} className="block w-full text-white/40 hover:text-white/70">
              Entrar com outra conta
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
