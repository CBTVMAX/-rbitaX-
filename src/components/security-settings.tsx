"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  Copy,
  ExternalLink,
  History,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push-client";
import { endPresenceForSignOut } from "@/components/presence-heartbeat";
import { Confirm } from "@/components/community/ui";
import { passwordProblem } from "@/lib/password-policy";
import { authErrorMessage } from "@/lib/mfa";
import { TwoFactorOptions } from "@/components/two-factor-options";

type Device = { id: string; device: string; ip: string | null; createdAt: string; lastActiveAt: string; current: boolean; mfaVerified: boolean };
type SecurityEvent = { id: number; kind: string; severity: "info" | "warning" | "critical"; ip: string | null; details: Record<string, unknown>; createdAt: string };
type Enrollment = { factorId: string; qr: string; secret: string; uri: string };

const EVENT_LABEL: Record<string, string> = {
  login: "Entrada na conta",
  session_ended: "Sessão encerrada",
  session_revoked: "Aparelho desconectado",
  password_changed: "Senha alterada",
  email_changed: "E-mail alterado",
  email_change_requested: "Pedido de troca de e-mail",
  phone_changed: "Celular alterado",
  mfa_enabled: "Verificação em duas etapas ativada",
  mfa_disabled: "Verificação em duas etapas desativada",
  permission_changed: "Permissões da conta alteradas",
  account_ban_changed: "Situação da conta alterada",
  coins_grant: "Órbita Coins creditadas pela equipe",
  coins_refund: "Órbita Coins estornadas",
  coins_topup: "Recarga de Órbita Coins",
  admin_action: "Ação administrativa",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Card({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-purple/10 text-orbit-purple">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-white/60">{desc}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const input =
  "w-full rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none focus:border-orbit-purple";
const primary =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50";
const secondary =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5 disabled:opacity-50";

export function SecuritySettings() {
  const supabase = useMemo(() => createClient(), []);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const say = (text: string, error = false) => setFlash({ text, error });

  // --- password
  const [hasPassword, setHasPassword] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nonce, setNonce] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // --- two-step verification
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [codeOn, setCodeOn] = useState(false);
  const twoStepOn = Boolean(factorId) || codeOn;

  // --- devices & activity
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [events, setEvents] = useState<SecurityEvent[] | null>(null);
  const [busyDevice, setBusyDevice] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState<"others" | "global" | null>(null);
  const [allBusy, setAllBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: user }, factors, sessions, log] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.mfa.listFactors(),
      supabase.rpc("my_sessions"),
      supabase.from("SecurityEvent").select("id, kind, severity, ip, details, createdAt").order("createdAt", { ascending: false }).limit(20),
    ]);
    setHasPassword(!!user.user?.identities?.some((i) => i.provider === "email"));
    setFactorId(factors.data?.totp?.find((f) => f.status === "verified")?.id ?? null);
    setDevices((sessions.data ?? []) as Device[]);
    setEvents((log.data ?? []) as SecurityEvent[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(next, confirm);
    if (problem) return say(problem, true);
    if (hasPassword && !current) return say("Digite sua senha atual.", true);
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: next,
      ...(hasPassword ? { current_password: current } : {}),
      ...(nonce ? { nonce: nonce.trim() } : {}),
    });
    if (error?.code === "reauthentication_needed" || error?.code === "reauth_nonce_missing") {
      await supabase.auth.reauthenticate();
      setNonce("");
      setPwBusy(false);
      return say("Por segurança, enviamos um código para o seu e-mail. Digite-o abaixo e salve de novo.");
    }
    if (error) {
      setPwBusy(false);
      return say(
        error.code === "current_password_mismatch" || error.code === "invalid_credentials"
          ? "A senha atual não confere."
          : authErrorMessage(error, "Não foi possível trocar a senha agora.") ?? "",
        true
      );
    }
    await supabase.auth.signOut({ scope: "others" });
    setCurrent("");
    setNext("");
    setConfirm("");
    setNonce(null);
    setPwBusy(false);
    say("Senha alterada. As outras sessões da sua conta foram encerradas.");
    load();
  }

  async function startEnroll() {
    setMfaBusy(true);
    // A half-finished setup from before is discarded first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Órbita X",
      friendlyName: `Órbita X ${new Date().toISOString().slice(0, 16)}`,
    });
    if (error || !data) {
      setMfaBusy(false);
      return say(authErrorMessage(error, "Não foi possível iniciar a configuração agora.") ?? "", true);
    }
    // QR gerado aqui (PNG) — o SVG que o servidor devolve não aparece em alguns navegadores.
    const qr = await QRCode.toDataURL(data.totp.uri, { width: 360, margin: 1, errorCorrectionLevel: "M" }).catch(() => data.totp.qr_code);
    setMfaBusy(false);
    setEnroll({ factorId: data.id, qr, secret: data.totp.secret, uri: data.totp.uri });
    setCode("");
  }

  async function copySecret() {
    if (!enroll) return;
    try {
      await navigator.clipboard.writeText(enroll.secret);
      say("Chave copiada. Cole no app autenticador.");
    } catch {
      say("Não foi possível copiar. Toque e segure a chave para copiar.", true);
    }
  }

  async function finishEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.factorId, code: code.replace(/\D/g, "") });
    setMfaBusy(false);
    if (error) return say(authErrorMessage(error, "Código inválido. Confira o horário do celular e tente de novo.") ?? "", true);
    setEnroll(null);
    say("Verificação em duas etapas ativada. Novos acessos vão pedir o código do app.");
    load();
  }

  async function disableMfa() {
    if (!factorId) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    setConfirmDisable(false);
    if (error) return say(authErrorMessage(error, "Não foi possível desativar agora. Entre de novo e tente outra vez.") ?? "", true);
    await supabase.auth.refreshSession();
    say("Verificação em duas etapas desativada.");
    load();
  }

  async function revoke(d: Device) {
    setBusyDevice(d.id);
    const { data, error } = await supabase.rpc("revoke_session", { p_session: d.id });
    setBusyDevice(null);
    if (error || !data) return say("Não foi possível desconectar esse aparelho agora.", true);
    say(`${d.device} foi desconectado.`);
    load();
  }

  async function endAll(scope: "others" | "global") {
    setAllBusy(true);
    if (scope === "global") {
      await disablePush(supabase);
      await endPresenceForSignOut();
    }
    const { error } = await supabase.auth.signOut({ scope });
    setAllBusy(false);
    setConfirmAll(null);
    if (error) return say("Não foi possível encerrar as sessões agora.", true);
    if (scope === "global") {
      window.location.href = "/entrar";
      return;
    }
    say("Todas as outras sessões foram encerradas.");
    load();
  }

  const others = (devices ?? []).filter((d) => !d.current);

  return (
    <div className="space-y-4">
      {flash && (
        <p
          role="status"
          className={clsx(
            "rounded-xl border px-3 py-2 text-sm",
            flash.error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          )}
        >
          {flash.text}
        </p>
      )}

      <Card icon={KeyRound} title={hasPassword ? "Senha" : "Criar senha"} desc="Ao trocar a senha, as outras sessões abertas da sua conta são encerradas.">
        <form onSubmit={changePassword} className="space-y-2.5">
          {hasPassword && (
            <input type="password" autoComplete="current-password" placeholder="Senha atual" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          )}
          <input type="password" autoComplete="new-password" placeholder="Nova senha" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
          <input type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          {nonce !== null && (
            <input inputMode="numeric" autoComplete="one-time-code" placeholder="Código enviado ao seu e-mail" value={nonce} onChange={(e) => setNonce(e.target.value)} className={input} />
          )}
          <p className="text-[11px] text-white/40">Mínimo de 8 caracteres, com letras e números.</p>
          <button type="submit" disabled={pwBusy} className={primary}>
            {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar senha
          </button>
        </form>
      </Card>

      <Card
        icon={twoStepOn ? ShieldCheck : ShieldAlert}
        title="Verificação em duas etapas"
        desc="Ao entrar em um aparelho novo, além da senha, pedimos um código. Escolha onde receber: no celular, no e-mail ou num app de códigos."
      >
        <TwoFactorOptions
          say={say}
          onChange={setCodeOn}
          totp={{ on: Boolean(factorId), loading: factorId === undefined, busy: mfaBusy, onConnect: startEnroll, onDisconnect: () => setConfirmDisable(true) }}
          totpPanel={
            enroll ? (
              <form onSubmit={finishEnroll} className="space-y-3">
                <p className="text-sm text-white/70">1. No app autenticador, adicione o Órbita X:</p>
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold text-white/80">Pelo celular</p>
                  <a href={enroll.uri} className={clsx(primary, "w-full justify-center sm:hidden")}>
                    <ExternalLink className="h-4 w-4" /> Abrir no app autenticador
                  </a>
                  <p className="text-[11px] leading-relaxed text-white/45">
                    Se o botão não abrir o app (ou se você está no computador), copie a chave abaixo. No app, toque em <span className="text-white/70">+</span> →{" "}
                    <span className="text-white/70">Inserir chave de configuração</span>, cole a chave, use “Órbita X” como nome e deixe o tipo
                    “Baseado em tempo”.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg bg-space-card px-3 py-2 font-mono text-xs tracking-wider text-white/85 select-all">
                      {enroll.secret.replace(/(.{4})/g, "$1 ").trim()}
                    </code>
                    <button type="button" onClick={copySecret} className={secondary} aria-label="Copiar chave">
                      <Copy className="h-4 w-4" /> Copiar
                    </button>
                  </div>
                </div>
                <div className="hidden items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={enroll.qr} alt="QR code da verificação em duas etapas" width={176} height={176} className="shrink-0 rounded-xl bg-white p-2" />
                  <p className="text-xs leading-relaxed text-white/55">
                    <span className="font-semibold text-white/80">Em outro aparelho:</span> abra o app autenticador no celular, toque em{" "}
                    <span className="text-white/70">+</span> → <span className="text-white/70">Ler QR code</span> e aponte a câmera para este código.
                  </p>
                </div>
                <p className="text-sm text-white/70">2. Digite o código de 6 dígitos que o app mostra.</p>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} className={`${input} tracking-[0.3em]`} />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={mfaBusy} className={primary}>
                    {mfaBusy && <Loader2 className="h-4 w-4 animate-spin" />} Ativar
                  </button>
                  <button type="button" onClick={() => setEnroll(null)} className={secondary}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : undefined
          }
        />
      </Card>

      <Card icon={MonitorSmartphone} title="Aparelhos conectados" desc="Onde sua conta está aberta agora. Desconecte o que você não reconhecer.">
        {devices === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10">
              {devices.map((d) => {
                const Icon = /Android|iPhone|iPad/.test(d.device) ? Smartphone : Laptop;
                return (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-3">
                    <Icon className="h-5 w-5 shrink-0 text-white/50" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {d.device}
                        {d.current && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Este aparelho</span>}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {d.ip ? `${d.ip} · ` : ""}ativo {when(d.lastActiveAt)} · desde {when(d.createdAt)}
                      </p>
                    </div>
                    {!d.current && (
                      <button
                        type="button"
                        onClick={() => revoke(d)}
                        disabled={busyDevice === d.id}
                        aria-label={`Desconectar ${d.device}`}
                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-red-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        {busyDevice === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sair
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {others.length > 0 && (
                <button type="button" onClick={() => setConfirmAll("others")} className={secondary}>
                  Encerrar as outras sessões
                </button>
              )}
              <button type="button" onClick={() => setConfirmAll("global")} className={secondary}>
                Sair de todos os aparelhos
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card icon={History} title="Atividade de segurança" desc="Entradas, trocas de senha e outras mudanças importantes na sua conta.">
        {events === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        ) : events.length === 0 ? (
          <p className="text-sm text-white/45">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", ev.severity === "info" ? "bg-emerald-400" : ev.severity === "warning" ? "bg-amber-400" : "bg-red-400")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {EVENT_LABEL[ev.kind] ?? "Atividade da conta"}
                    {ev.details?.newDevice === true && <span className="ml-2 text-[11px] font-semibold text-amber-300">aparelho novo</span>}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {typeof ev.details?.device === "string" ? `${ev.details.device} · ` : ""}
                    {ev.ip ? `${ev.ip} · ` : ""}
                    {when(ev.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Confirm
        open={confirmDisable}
        busy={mfaBusy}
        title="Desativar a verificação em duas etapas?"
        message="Sua conta volta a ser protegida só pela senha."
        confirmLabel="Desativar"
        onConfirm={disableMfa}
        onClose={() => setConfirmDisable(false)}
      />
      <Confirm
        open={!!confirmAll}
        busy={allBusy}
        title={confirmAll === "global" ? "Sair de todos os aparelhos?" : "Encerrar as outras sessões?"}
        message={confirmAll === "global" ? "Sua conta será desconectada em todos os lugares, inclusive aqui." : "Só este aparelho continua conectado."}
        confirmLabel={confirmAll === "global" ? "Sair de todos" : "Encerrar"}
        onConfirm={() => confirmAll && endAll(confirmAll)}
        onClose={() => setConfirmAll(null)}
      />
    </div>
  );
}
