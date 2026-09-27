"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BadgeCheck, Ban, Flag, Loader2, Lock, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BarChart } from "@/components/admin/charts";

type Stats = {
  days: number;
  series: { label: string; users: number; posts: number; reports: number }[];
  topCommunities: { name: string; members: number }[];
  verifiedUsers: number;
  suspendedUsers: number;
  privateCommunities: number;
  totalReports: number;
  resolvedReports: number;
};

const nf = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");
const SERIES = [
  { key: "users", label: "Novos usuários", color: "#22d3ee" },
  { key: "posts", label: "Publicações", color: "#8b5cf6" },
  { key: "reports", label: "Denúncias", color: "#f472b6" },
] as const;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-card/70 p-4 md:p-5">
      <h2 className="mb-4 font-display text-base font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function AdminStatsView() {
  const supabase = useMemo(() => createClient(), []);
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<(typeof SERIES)[number]["key"]>("users");
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    supabase.rpc("admin_stats", { p_days: days }).then(({ data }) => data && setData(data as unknown as Stats));
  }, [supabase, days]);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  const active = SERIES.find((s) => s.key === metric)!;
  const counters = [
    { icon: BadgeCheck, label: "Usuários verificados", value: data.verifiedUsers, color: "text-orbit-cyan" },
    { icon: Ban, label: "Usuários suspensos", value: data.suspendedUsers, color: "text-red-300" },
    { icon: Lock, label: "Comunidades privadas", value: data.privateCommunities, color: "text-white/70" },
    { icon: Flag, label: "Denúncias resolvidas", value: `${nf(data.resolvedReports)}/${nf(data.totalReports)}`, color: "text-emerald-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={clsx("rounded-full px-3 py-2 text-xs font-semibold transition", days === d ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:bg-white/5")}>
              {d === 7 ? "7 dias" : d === 30 ? "30 dias" : "90 dias"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {SERIES.map((s) => (
            <button key={s.key} type="button" onClick={() => setMetric(s.key)} className={clsx("flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition", metric === s.key ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5")}>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counters.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
            <c.icon className={clsx("h-5 w-5", c.color)} />
            <p className="mt-2 font-display text-2xl font-bold text-white">{typeof c.value === "number" ? nf(c.value) : c.value}</p>
            <p className="text-xs text-white/50">{c.label}</p>
          </div>
        ))}
      </div>

      <Panel title={`${active.label} por dia`}>
        <BarChart points={data.series.map((s) => ({ label: s.label, value: s[metric] }))} color={active.color} />
      </Panel>

      <Panel title="Maiores comunidades">
        <ul className="space-y-2">
          {data.topCommunities.map((c, i) => {
            const max = Math.max(1, ...data.topCommunities.map((x) => x.members ?? 0));
            return (
              <li key={i} className="flex items-center gap-3">
                <Users2 className="h-4 w-4 shrink-0 text-white/40" />
                <span className="w-40 shrink-0 truncate text-sm text-white/80">{c.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <span className="block h-full rounded-full bg-orbit-gradient" style={{ width: `${((c.members ?? 0) / max) * 100}%` }} />
                </span>
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-white">{nf(c.members)}</span>
              </li>
            );
          })}
          {data.topCommunities.length === 0 && <li className="text-sm text-white/40">Sem comunidades ainda.</li>}
        </ul>
      </Panel>
    </div>
  );
}
