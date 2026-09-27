"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowRight,
  FileText,
  Flag,
  Loader2,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Users2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AreaChart, DonutChart } from "@/components/admin/charts";

type Metric = { total?: number; pending?: number; delta30: number; pct: number | null };
type Overview = {
  users: Metric;
  contents: Metric;
  communities: Metric;
  reports: Metric;
  onlineNow: number;
  onlineUsers: { id: string; name: string; avatarUrl: string | null; username: string }[];
  growth: { label: string; total: number }[];
  contentTypes: { label: string; count: number }[];
  reportReasons: { label: string; count: number }[];
  recent: { type: string; label: string; actor: string | null; at: string }[];
};

const nf = (n: number) => n.toLocaleString("pt-BR");
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
};

const RECENT_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new_user: { icon: UserPlus, color: "text-orbit-cyan" },
  post: { icon: FileText, color: "text-orbit-purple" },
  report: { icon: ShieldAlert, color: "text-red-300" },
  community: { icon: Users2, color: "text-orbit-pink" },
};

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  pct,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: number;
  pct: number | null;
  delta: number;
}) {
  const up = (pct ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-space-card/70 p-4 md:p-5">
      <div className="flex items-start justify-between">
        <span className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl", tint)}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <p className="mt-3 text-sm text-white/55">{label}</p>
      <p className="font-display text-2xl font-bold text-white md:text-3xl">{nf(value)}</p>
      <p className={clsx("mt-1 flex items-center gap-1 text-xs font-semibold", pct === null ? "text-white/40" : up ? "text-emerald-400" : "text-red-400")}>
        {pct !== null && (up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />)}
        {pct === null ? `+${nf(delta)} novos` : `${up ? "+" : ""}${pct}%`}
        <span className="font-normal text-white/40">nos últimos 30 dias</span>
      </p>
    </div>
  );
}

function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-space-bg bg-space-card ring-2 ring-space-bg"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-white/70">{name.charAt(0)}</span>
      )}
    </span>
  );
}

function Panel({ title, right, children, className }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-2xl border border-white/10 bg-space-card/70 p-4 md:p-5", className)}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-base font-bold text-white">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminOverview({ adminName }: { adminName: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_overview").then(({ data, error }) => {
      if (error || !data) return setError(true);
      setData(data as unknown as Overview);
    });
  }, [supabase]);

  if (error) return <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200">Não foi possível carregar o painel.</p>;
  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-5">
      {/* Banner de boas-vindas */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-space-card via-space-card to-orbit-purple/25 p-5 md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-orbit-purple/25 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">Bem-vindo ao Painel Órbita X</h1>
          <p className="mt-1 max-w-xl text-sm text-white/65">Monitore, gerencie e mantenha um universo mais seguro e conectado, {adminName.split(" ")[0]}.</p>
        </div>
      </section>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard icon={Users} tint="bg-orbit-cyan/15 text-orbit-cyan" label="Usuários" value={data.users.total ?? 0} pct={data.users.pct} delta={data.users.delta30} />
        <StatCard icon={FileText} tint="bg-orbit-purple/15 text-orbit-purple" label="Conteúdos" value={data.contents.total ?? 0} pct={data.contents.pct} delta={data.contents.delta30} />
        <StatCard icon={Users2} tint="bg-orbit-pink/15 text-orbit-pink" label="Comunidades" value={data.communities.total ?? 0} pct={data.communities.pct} delta={data.communities.delta30} />
        <StatCard icon={ShieldAlert} tint="bg-red-500/15 text-red-300" label="Denúncias" value={data.reports.pending ?? 0} pct={data.reports.pct} delta={data.reports.delta30} />
      </div>

      {/* Crescimento + Online agora */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Crescimento de Usuários" className="lg:col-span-2" right={<span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">Últimos 7 dias</span>}>
          <AreaChart points={data.growth.map((g) => ({ label: g.label, value: g.total }))} />
        </Panel>

        <Panel
          title="Usuários Online Agora"
          right={<span className="flex items-center gap-1.5 font-display text-lg font-bold text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />{nf(data.onlineNow)}</span>}
        >
          {data.onlineUsers.length > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {data.onlineUsers.slice(0, 6).map((u) => (
                  <Avatar key={u.id} name={u.name} url={u.avatarUrl} />
                ))}
              </div>
              <Link href="/admin/usuarios" className="ml-auto flex items-center gap-1 text-xs font-semibold text-orbit-cyan hover:underline">
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/45">Ninguém online neste momento.</p>
          )}

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-white/45">Atividades Recentes</h3>
          <ul className="space-y-2.5">
            {data.recent.map((r, i) => {
              const meta = RECENT_ICON[r.type] ?? RECENT_ICON.post;
              const Icon = meta.icon;
              return (
                <li key={i} className="flex items-center gap-2.5">
                  <Icon className={clsx("h-4 w-4 shrink-0", meta.color)} />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/80">{r.label}</span>
                  <span className="shrink-0 text-xs text-white/40">{timeAgo(r.at)}</span>
                </li>
              );
            })}
            {data.recent.length === 0 && <li className="text-sm text-white/40">Sem atividades ainda.</li>}
          </ul>
        </Panel>
      </div>

      {/* Donuts + IA */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Tipos de Conteúdo">
          <DonutChart data={data.contentTypes} total={data.contents.total} />
        </Panel>
        <Panel title="Denúncias">
          <DonutChart data={data.reportReasons} total={data.reports.pending} totalLabel="pendentes" />
        </Panel>
        <Panel>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="font-display text-base font-bold text-white">IA Assistente</h2>
            <span className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Em breve
            </span>
          </div>
          <p className="mt-3 text-sm text-white/60">Use a IA para ajudar a moderar conteúdos, analisar denúncias e obter insights da plataforma.</p>
          <Link href="/admin/ia" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-orbit-gradient py-2.5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90">
            Abrir Assistente IA <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/usuarios" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-orbit-purple/40 hover:text-white">
          <Users className="h-4 w-4 text-orbit-cyan" /> Gerenciar usuários <ArrowRight className="ml-auto h-4 w-4 text-white/30" />
        </Link>
        <Link href="/admin/conteudos" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-orbit-purple/40 hover:text-white">
          <FileText className="h-4 w-4 text-orbit-purple" /> Moderar conteúdos <ArrowRight className="ml-auto h-4 w-4 text-white/30" />
        </Link>
        <Link href="/admin/denuncias" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-orbit-purple/40 hover:text-white">
          <Flag className="h-4 w-4 text-red-300" /> Ver denúncias <ArrowRight className="ml-auto h-4 w-4 text-white/30" />
        </Link>
        <Link href="/admin/estatisticas" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-orbit-purple/40 hover:text-white">
          <Sparkles className="h-4 w-4 text-orbit-pink" /> Ver estatísticas <ArrowRight className="ml-auto h-4 w-4 text-white/30" />
        </Link>
      </div>
    </div>
  );
}
