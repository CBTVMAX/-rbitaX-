"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { CheckCircle2, ChevronRight, Copy, Download, KeyRound, ListChecks, Loader2, Mail, Smartphone, X } from "lucide-react";
import { Confirm } from "@/components/community/ui";

type Status = {
  enabled: boolean;
  emailOn: boolean;
  email: string | null;
  phone: string | null;
  totp: boolean;
  backupLeft: number;
  devices: number;
  sessionOk: boolean;
  available: { email: boolean; sms: boolean };
};
type Channel = "email" | "sms";

const input =
  "w-full rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none focus:border-orbit-purple";
const primary =
  "flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50";
const secondary =
  "flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5 disabled:opacity-50";

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { message?: string; error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = ((await res?.json().catch(() => null)) ?? {}) as T & { message?: string; error?: string };
  return { ok: Boolean(res?.ok), data };
}

function Row({
  icon: Icon,
  title,
  sub,
  on,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: React.ReactNode;
  on?: boolean;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", on ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-orbit-cyan")}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className={clsx("line-clamp-2 text-xs leading-snug", on ? "text-emerald-300/90" : "text-white/50")}>{sub}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {children && <div className="mt-3 sm:pl-[52px]">{children}</div>}
    </div>
  );
}

function LinkButton({ children, onClick, disabled, tone = "cyan" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "cyan" | "muted" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-semibold transition disabled:opacity-40",
        tone === "cyan" ? "text-orbit-cyan hover:bg-orbit-cyan/10" : "text-white/55 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Verificação em duas etapas no formato do VK: Telefone (SMS), E-mail e Aplicativo de códigos como
 * opções de confirmação; Códigos de reserva como opção adicional. O app autenticador vem pronto
 * de fora (props), porque usa o fator nativo do Supabase.
 */
export function TwoFactorOptions({
  say,
  onChange,
  totp,
  totpPanel,
}: {
  say: (text: string, error?: boolean) => void;
  onChange?: (codeOn: boolean) => void;
  totp: { on: boolean; loading: boolean; busy: boolean; onConnect: () => void; onDisconnect: () => void };
  totpPanel?: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Channel | null>(null);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [disconnect, setDisconnect] = useState<Channel | null>(null);
  const [backup, setBackup] = useState<string[] | null>(null);
  const [confirmBackup, setConfirmBackup] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/seguranca/2fa", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const s = (await res.json()) as Status;
    setStatus(s);
    onChange?.(s.enabled);
  }, [onChange]);

  // Recarrega também quando o app autenticador é conectado ou removido (a sessão muda de nível).
  useEffect(() => {
    load();
  }, [load, totp.on]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function openSetup(ch: Channel) {
    setSetup(ch);
    setSentTo(null);
    setCode("");
    setPhone("");
  }

  async function sendSetup() {
    if (!setup) return;
    setBusy(true);
    const { ok, data } = await post<{ target?: string }>("/api/seguranca/2fa/codigo", { purpose: "setup", channel: setup, phone });
    setBusy(false);
    if (!ok) {
      if (data.error === "wait") setCooldown(45);
      return say(data.message ?? "Não foi possível enviar o código agora.", true);
    }
    setSentTo(data.target ?? null);
    setCooldown(45);
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const wasEnabled = status?.enabled;
    const { ok, data } = await post("/api/seguranca/2fa/verificar", { purpose: "setup", code });
    setBusy(false);
    if (!ok) {
      setCode("");
      return say(data.message ?? "Código incorreto.", true);
    }
    const label = setup === "sms" ? "Celular conectado" : "E-mail conectado";
    setSetup(null);
    await load();
    if (!wasEnabled) {
      say(`${label}. A verificação em duas etapas está ativa — guarde agora seus códigos de reserva.`);
      await generateBackup();
    } else say(`${label}.`);
  }

  async function doDisconnect() {
    if (!disconnect) return;
    setBusy(true);
    const { ok, data } = await post<{ enabled?: boolean }>("/api/seguranca/2fa/desativar", { channel: disconnect });
    setBusy(false);
    setDisconnect(null);
    if (!ok) return say(data.error === "verify_first" ? "Confirme o código desta sessão antes de mudar a verificação." : "Não foi possível desconectar agora.", true);
    await load();
    say(data.enabled ? "Opção desconectada." : "Verificação por código desativada.");
  }

  async function generateBackup() {
    setConfirmBackup(false);
    setBusy(true);
    const { ok, data } = await post<{ codes?: string[] }>("/api/seguranca/2fa/reserva", {});
    setBusy(false);
    if (!ok || !data.codes) return say(data.message ?? "Não foi possível gerar os códigos agora.", true);
    setBackup(data.codes);
    load();
  }

  function copyBackup() {
    if (!backup) return;
    navigator.clipboard.writeText(backup.join("\n")).then(
      () => say("Códigos copiados. Guarde em um lugar seguro."),
      () => say("Não foi possível copiar. Anote os códigos.", true)
    );
  }

  function downloadBackup() {
    if (!backup) return;
    const text = `Órbita X — códigos de reserva\nGerados em ${new Date().toLocaleString("pt-BR")}\n\nCada código pode ser usado uma vez para entrar sem receber o código por SMS ou e-mail.\n\n${backup.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orbitax-codigos-de-reserva.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!status) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;

  const active = status.enabled || totp.on;
  const locked = active && !status.sessionOk;
  const soon = <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/45">Em breve</span>;

  const setupPanel = (ch: Channel) =>
    setup === ch && (
      <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {!sentTo ? (
          <>
            {ch === "sms" ? (
              <input
                autoFocus
                inputMode="tel"
                autoComplete="tel"
                placeholder="DDD + número (ex.: 11 91234-5678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={input}
              />
            ) : (
              <p className="text-sm text-white/70">Vamos enviar um código para {status.email} para confirmar.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={sendSetup} disabled={busy || cooldown > 0 || (ch === "sms" && phone.replace(/\D/g, "").length < 10)} className={primary}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {cooldown > 0 ? `Aguarde ${cooldown}s` : "Enviar código"}
              </button>
              <button type="button" onClick={() => setSetup(null)} className={secondary}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={confirmSetup} className="space-y-2.5">
            <p className="text-sm text-white/70">
              Digite o código de 6 dígitos enviado para <span className="text-white">{sentTo}</span>.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${input} text-center tracking-[0.4em]`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className={primary}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
              </button>
              <button type="button" onClick={sendSetup} disabled={busy || cooldown > 0} className="px-2 text-xs text-white/55 hover:text-white disabled:text-white/30">
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
              </button>
              <button type="button" onClick={() => setSetup(null)} className="px-2 text-xs text-white/40 hover:text-white/70">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-white/55"
          )}
        >
          {active && <CheckCircle2 className="h-3.5 w-3.5" />} {active ? "Ativa" : "Inativa"}
        </span>
        {locked && <span className="text-xs text-amber-300">Confirme o código desta sessão para mudar as opções.</span>}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Opções de confirmação de login</p>
        <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
          <Row
            icon={Smartphone}
            title="Telefone"
            on={Boolean(status.phone)}
            sub={status.phone ? `Conectado · ${status.phone}` : "Receba o código por SMS no celular"}
            action={
              status.phone ? (
                <LinkButton tone="muted" onClick={() => setDisconnect("sms")} disabled={locked}>
                  Desconectar
                </LinkButton>
              ) : !status.available.sms ? (
                soon
              ) : (
                <LinkButton onClick={() => openSetup("sms")} disabled={locked || setup === "sms"}>
                  Conectar <ChevronRight className="h-4 w-4" />
                </LinkButton>
              )
            }
          >
            {setupPanel("sms")}
          </Row>
          <Row
            icon={Mail}
            title="E-mail"
            on={status.emailOn}
            sub={status.emailOn ? `Conectado · ${status.email}` : status.email ? `Receba o código em ${status.email}` : "Sua conta não tem e-mail"}
            action={
              status.emailOn ? (
                <LinkButton tone="muted" onClick={() => setDisconnect("email")} disabled={locked}>
                  Desconectar
                </LinkButton>
              ) : !status.available.email ? (
                soon
              ) : (
                <LinkButton onClick={() => openSetup("email")} disabled={locked || !status.email || setup === "email"}>
                  Conectar <ChevronRight className="h-4 w-4" />
                </LinkButton>
              )
            }
          >
            {setupPanel("email")}
          </Row>
          <Row
            icon={KeyRound}
            title="Aplicativo de códigos"
            on={totp.on}
            sub={totp.on ? "Conectado" : "Google Authenticator, Microsoft Authenticator…"}
            action={
              totp.loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              ) : totp.on ? (
                <LinkButton tone="muted" onClick={totp.onDisconnect} disabled={locked}>
                  Desconectar
                </LinkButton>
              ) : (
                <LinkButton onClick={totp.onConnect} disabled={totp.busy || locked || Boolean(totpPanel)}>
                  {totp.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Conectar <ChevronRight className="h-4 w-4" /></>}
                </LinkButton>
              )
            }
          >
            {totpPanel}
          </Row>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Opções adicionais</p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
          <Row
            icon={ListChecks}
            title="Códigos de reserva"
            sub={
              active
                ? status.backupLeft > 0
                  ? `${status.backupLeft} ${status.backupLeft === 1 ? "código disponível" : "códigos disponíveis"} para entrar sem o celular`
                  : "Para entrar quando o celular ou o e-mail não estiverem à mão"
                : "Disponível depois de ativar uma opção acima"
            }
            action={
              <LinkButton onClick={() => (status.backupLeft > 0 ? setConfirmBackup(true) : generateBackup())} disabled={!active || locked || busy}>
                {status.backupLeft > 0 ? "Gerar novos" : "Gerar"}
              </LinkButton>
            }
          >
            {backup && (
              <div className="space-y-3 rounded-xl border border-orbit-purple/30 bg-orbit-purple/[0.07] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-relaxed text-white/75">
                    Guarde estes códigos em um lugar seguro. Cada um entra <span className="text-white">uma única vez</span>, quando você não receber o código. Eles não serão mostrados de novo.
                  </p>
                  <button type="button" onClick={() => setBackup(null)} aria-label="Fechar" className="rounded-full p-1 text-white/50 hover:bg-white/5 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm tracking-wider text-white">
                  {backup.map((c) => (
                    <span key={c} className="rounded-lg bg-space-card px-3 py-2 text-center select-all">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyBackup} className={secondary}>
                    <Copy className="h-4 w-4" /> Copiar
                  </button>
                  <button type="button" onClick={downloadBackup} className={secondary}>
                    <Download className="h-4 w-4" /> Baixar .txt
                  </button>
                </div>
              </div>
            )}
          </Row>
        </div>
      </div>

      <Confirm
        open={!!disconnect}
        title={disconnect === "sms" ? "Desconectar o celular?" : "Desconectar o e-mail?"}
        message={
          (disconnect === "sms" ? status.emailOn : status.phone)
            ? "Os códigos passam a ir só para a outra opção conectada."
            : "Sem celular nem e-mail conectados, a verificação por código é desligada e os códigos de reserva deixam de valer."
        }
        confirmLabel="Desconectar"
        busy={busy}
        onConfirm={doDisconnect}
        onClose={() => setDisconnect(null)}
      />
      <Confirm
        open={confirmBackup}
        title="Gerar novos códigos?"
        message="Os códigos de reserva atuais deixam de valer."
        confirmLabel="Gerar novos"
        danger={false}
        busy={busy}
        onConfirm={generateBackup}
        onClose={() => setConfirmBackup(false)}
      />
    </div>
  );
}
