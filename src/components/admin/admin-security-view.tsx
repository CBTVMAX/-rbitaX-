"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  Activity,
  AlertTriangle,
  Coins,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Overview = {
  since: string;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
  riskyLogins: number;
  activeSessions: number;
  mfaUsers: number;
  admins: number;
  adminsWithMfa: number;
  rateLimitedBuckets: number;
  coinsMismatches: number;
};
type SecurityEvent = {
  id: number;
  kind: string;
  severity: "info" | "warning" | "critical";
  ip: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  result: string;
};

const KIND_LABEL: Record<string, string> = {
  login: "Entrada na conta",
  session_ended: "Sessão encerrada",
  session_revoked: "Aparelho desconectado",
  password_changed: "Senha alterada",
  email_changed: "E-mail alterado",
  email_change_requested: "Pedido de troca de e-mail",
  phone_changed: "Celular alterado",
  mfa_enabled: "2FA ativada",
  mfa_disabled: "2FA desativada",
  permission_changed: "Permissões da conta alteradas",
  account_ban_changed: "Situação da conta alterada",
  coins_grant: "Coins creditadas pela equipe",
  coins_refund: "Coins estornadas",
  coins_topup: "Recarga de Coins",
  admin_action: "Ação administrativa",
  community_owner_changed: "Proprietário de comunidade alterado",
  community_admin_changed: "Admin de comunidade alterado",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
      <div className="flex items-center gap-2 text-white/50">
        <Icon className={clsx("h-4 w-4", tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-orbit-cyan")} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={clsx("mt-2 font-display text-2xl font-bold", tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-white")}>{value}</p>
    </div>
  );
}

export function AdminSecurityView() {
  const supabase = useMemo(() => createClient(), []);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<SecurityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [ov, log] = await Promise.all([
      supabase.rpc("admin_security_overview", { p_hours: hours }),
      supabase
        .from("SecurityEvent")
        .select("id, kind, severity, ip, details, createdAt, actorId, resourceType, resourceId, result")
        .order("createdAt", { ascending: false })
        .limit(60),
    ]);
    setRefreshing(false);
    if (ov.error) {
      setError(/admin_mfa_required/.test(ov.error.message) ? "mfa" : "forbidden");
      return;
    }
    setError(null);
    setOverview(ov.data as unknown as Overview);
    setEvents((log.data ?? []) as SecurityEvent[]);
  }, [supabase, hours]);

  useEffect(() => {
    load();
  }, [load]);

  if (error === "mfa") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <Lock className="mx-auto mb-2 h-6 w-6 text-amber-300" />
        <p className="text-sm text-amber-100">
          O painel de segurança exige verificação em duas etapas. Ative em{" "}
          <a href="/configuracoes/seguranca" className="font-semibold underline">Configurações › Segurança</a> e entre de novo.
        </p>
      </div>
    );
  }
  if (error === "forbidden") {
    return <p className="rounded-2xl border border-white/10 bg-space-surface/80 p-6 text-center text-sm text-white/60">Sem permissão de administrador.</p>;
  }
  if (!overview || !events) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  const adminsUnprotected = overview.admins - overview.adminsWithMfa;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[24, 168, 720].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHours(h)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                hours === h ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:bg-white/5"
              )}
            >
              {h === 24 ? "24 h" : h === 168 ? "7 dias" : "30 dias"}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} aria-label="Atualizar" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/5">
          <RefreshCw className={clsx("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={AlertTriangle} label="Logins de risco" value={String(overview.riskyLogins)} tone={overview.riskyLogins > 0 ? "warn" : undefined} />
        <Stat icon={Smartphone} label="Sessões ativas" value={String(overview.activeSessions)} />
        <Stat icon={ShieldCheck} label="Contas com 2FA" value={String(overview.mfaUsers)} />
        <Stat icon={Coins} label="Carteiras divergentes" value={String(overview.coinsMismatches)} tone={overview.coinsMismatches > 0 ? "bad" : undefined} />
        <Stat icon={UserCog} label="Administradores" value={String(overview.admins)} />
        <Stat icon={ShieldAlert} label="Admins sem 2FA" value={String(adminsUnprotected)} tone={adminsUnprotected > 0 ? "bad" : undefined} />
        <Stat icon={Activity} label="Eventos críticos" value={String(overview.bySeverity.critical ?? 0)} tone={(overview.bySeverity.critical ?? 0) > 0 ? "bad" : undefined} />
        <Stat icon={Activity} label="Avisos" value={String(overview.bySeverity.warning ?? 0)} tone={(overview.bySeverity.warning ?? 0) > 0 ? "warn" : undefined} />
      </div>

      {adminsUnprotected > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {adminsUnprotected === 1 ? "1 administrador ainda não" : `${adminsUnprotected} administradores ainda não`} ativaram a verificação em duas etapas.
          Sem ela, eles não conseguem executar ações administrativas.
        </div>
      )}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Atividade recente</h2>
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
              <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", ev.severity === "info" ? "bg-emerald-400" : ev.severity === "warning" ? "bg-amber-400" : "bg-red-400")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  {KIND_LABEL[ev.kind] ?? ev.kind}
                  {ev.result !== "success" && <span className="ml-2 text-[11px] font-semibold text-red-300">{ev.result === "denied" ? "negado" : "falhou"}</span>}
                  {ev.details?.newDevice === true && <span className="ml-2 text-[11px] font-semibold text-amber-300">aparelho novo</span>}
                  {(ev.details?.risk as number) >= 2 && <span className="ml-2 text-[11px] font-semibold text-red-300">risco alto</span>}
                </p>
                <p className="truncate text-xs text-white/45">
                  {typeof ev.details?.device === "string" ? `${ev.details.device} · ` : ""}
                  {ev.ip ? `${ev.ip} · ` : ""}
                  {ev.resourceType ? `${ev.resourceType} · ` : ""}
                  {when(ev.createdAt)}
                </p>
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="px-4 py-6 text-center text-sm text-white/45">Nenhum evento no período.</li>}
        </ul>
      </section>
    </div>
  );
}
