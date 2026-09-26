"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { communityError, compactNumber } from "@/lib/communities";
import { useCommunity } from "../context";
import { Card } from "./fields";

type Daily = { day: string; joins: number; leaves: number; views: number; likes: number; comments: number; posts: number };
type Stats = {
  members: number;
  newMembers: number;
  lostMembers: number;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
  discussions: number;
  videoViews: number;
  clipViews: number;
  openReports: number;
  pending: number;
  daily: Daily[];
};

/*
 * Chart colors — validated with the dataviz palette checker against the card surface in both app themes
 * (dark #11152a, light #eaecf6): series 1–3 pass CVD and normal-vision separation; in light mode orange/aqua sit
 * below 3:1, so every chart also has a legend, a tooltip and the table view.
 */
const VIZ_CSS = `
.cviz{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--neg:#e66767;--grid:rgb(255 255 255/.07);--axis:rgb(255 255 255/.14);--ring:rgb(17 21 42)}
[data-app-theme="light"] .cviz{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--neg:#e34948;--grid:rgb(17 20 43/.08);--axis:rgb(17 20 43/.18);--ring:rgb(234 236 246)}
@media (prefers-color-scheme: light){[data-app-theme="auto"] .cviz{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--neg:#e34948;--grid:rgb(17 20 43/.08);--axis:rgb(17 20 43/.18);--ring:rgb(234 236 246)}}
`;

const fmt = new Intl.NumberFormat("pt-BR");
function parseDay(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd);
}
const dayShort = (d: string) => parseDay(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const dayLong = (d: string) => {
  const t = parseDay(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function Tooltip({ x, w, children }: { x: number; w: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x - 80, 0), Math.max(0, w - 160));
  return (
    <div className="pointer-events-none absolute top-0 z-10 w-40 rounded-2xl border border-white/10 bg-space-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur" style={{ left }}>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; kind: "line" | "rect" }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.kind === "line" ? <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} /> : <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

const PAD = { l: 34, r: 14, t: 14, b: 24 };

/** Lines over days, with crosshair + tooltip listing every series (keyboard: ← →). */
function LineChart({ days, series, height = 190, area = false, label }: { days: string[]; series: { label: string; color: string; values: number[] }[]; height?: number; area?: boolean; label: string }) {
  const { ref, w } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const n = days.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const xTicks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  function pick(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD.l) / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-orbit-purple/50"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
          }}
        >
          <defs>
            {area && (
              <linearGradient id={`a${gid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={series[0].color} stopOpacity="0.16" />
                <stop offset="1" stopColor={series[0].color} stopOpacity="0.02" />
              </linearGradient>
            )}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
              <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-white/40 text-[10px] tabular-nums">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-white/40 text-[10px]">
              {dayShort(days[i])}
            </text>
          ))}
          {area && series[0] && (
            <path d={`M${x(0)},${y(0)} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(n - 1)},${y(0)} Z`} fill={`url(#a${gid})`} />
          )}
          {series.map((s) => (
            <path key={s.label} d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hover === null &&
            series.length === 1 &&
            n > 0 && <circle cx={x(n - 1)} cy={y(series[0].values[n - 1])} r={4} fill={series[0].color} stroke="var(--ring)" strokeWidth={2} />}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--axis)" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.label} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="var(--ring)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} w={w}>
          <p className="mb-1 text-[11px] text-white/50">{dayLong(days[hover])}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              <strong className="font-semibold tabular-nums text-white">{fmt.format(s.values[hover])}</strong>
              <span className="truncate text-white/50">{s.label}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/** Joins above the baseline, exits below — one column pair per day, each column its own hover target. */
function DivergingBars({ days, up, down, height = 190 }: { days: string[]; up: number[]; down: number[]; height?: number }) {
  const { ref, w } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = days.length;
  const max = niceMax(Math.max(1, ...up, ...down));
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const mid = PAD.t + ih / 2;
  const half = ih / 2;
  const step = iw / Math.max(1, n);
  const bw = Math.max(1, Math.min(24, step - 2));
  const cx = (i: number) => PAD.l + step * i + step / 2;
  const h = (v: number) => (v / max) * half;
  const r = Math.min(4, bw / 2);
  // 4px rounded data-end, square at the baseline.
  const upPath = (x0: number, hh: number) => `M${x0},${mid} V${mid - hh + r} Q${x0},${mid - hh} ${x0 + r},${mid - hh} H${x0 + bw - r} Q${x0 + bw},${mid - hh} ${x0 + bw},${mid - hh + r} V${mid} Z`;
  const downPath = (x0: number, hh: number) => `M${x0},${mid} V${mid + hh - r} Q${x0},${mid + hh} ${x0 + r},${mid + hh} H${x0 + bw - r} Q${x0 + bw},${mid + hh} ${x0 + bw},${mid + hh - r} V${mid} Z`;
  const xTicks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  return (
    <div ref={ref} className="relative">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Entradas e saídas de membros por dia" onPointerLeave={() => setHover(null)} className="touch-pan-y">
          {[max, 0, max].map((t, k) => {
            const yy = k === 0 ? PAD.t : k === 1 ? mid : PAD.t + ih;
            return (
              <g key={k}>
                <line x1={PAD.l} x2={w - PAD.r} y1={yy} y2={yy} stroke={k === 1 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={PAD.l - 8} y={yy} dy="0.32em" textAnchor="end" className="fill-white/40 text-[10px] tabular-nums">
                  {k === 2 ? `−${compactNumber(t)}` : compactNumber(t)}
                </text>
              </g>
            );
          })}
          {days.map((d, i) => {
            const x0 = cx(i) - bw / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={d} opacity={dim ? 0.45 : 1}>
                {up[i] > 0 && <path d={upPath(x0, Math.max(h(up[i]), r * 2))} fill="var(--s1)" />}
                {down[i] > 0 && <path d={downPath(x0, Math.max(h(down[i]), r * 2))} fill="var(--neg)" />}
                <rect
                  x={PAD.l + step * i}
                  y={PAD.t}
                  width={step}
                  height={ih}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${dayLong(d)}: ${up[i]} entradas, ${down[i]} saídas`}
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          {xTicks.map((i) => (
            <text key={i} x={cx(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-white/40 text-[10px]">
              {dayShort(days[i])}
            </text>
          ))}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={cx(hover)} w={w}>
          <p className="mb-1 text-[11px] text-white/50">{dayLong(days[hover])}</p>
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--s1)" }} />
            <strong className="font-semibold tabular-nums text-white">{up[hover]}</strong> <span className="text-white/50">entraram</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--neg)" }} />
            <strong className="font-semibold tabular-nums text-white">{down[hover]}</strong> <span className="text-white/50">saíram</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-white" title={fmt.format(value)}>
        {compactNumber(value)}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>}
    </div>
  );
}

const PERIODS = [7, 30, 90] as const;

export function StatsSection() {
  const { community, supabase, toast } = useCommunity();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.rpc("community_stats", { p_community: community.id, p_days: days }).then(({ data, error }) => {
      if (!alive) return;
      setLoading(false);
      if (error) return toast(communityError(error.message), true);
      setStats(data as unknown as Stats);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, community.id, supabase]);

  const daily = stats?.daily ?? [];
  const dayKeys = daily.map((d) => d.day);
  const net = stats ? stats.newMembers - stats.lostMembers : 0;

  return (
    <div className="cviz space-y-4">
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Período" className="flex rounded-full border border-white/10 bg-space-card/70 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={days === p}
              onClick={() => setDays(p)}
              className={clsx("min-h-[36px] rounded-full px-4 text-xs font-semibold transition", days === p ? "bg-orbit-gradient text-snow" : "text-white/60 hover:text-white")}
            >
              <span className="hidden sm:inline">Últimos </span>
              {p} dias
            </button>
          ))}
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {!stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className={clsx("space-y-4 transition-opacity", loading && "opacity-60")}>
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs text-white/50">Membros hoje</p>
                <p className="font-display text-5xl font-semibold text-white">{fmt.format(stats.members)}</p>
                <p className="mt-1 text-sm text-white/60">
                  <span className={net >= 0 ? "text-emerald-400" : "text-red-300"}>
                    {net >= 0 ? "▲" : "▼"} {net >= 0 ? "+" : "−"}
                    {fmt.format(Math.abs(net))}
                  </span>{" "}
                  nos últimos {days} dias
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:w-72">
                <Tile label="Novos membros" value={stats.newMembers} />
                <Tile label="Saíram ou removidos" value={stats.lostMembers} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            <Tile label="Visualizações" value={stats.views} />
            <Tile label="Alcance" value={stats.reach} sub="pessoas diferentes" />
            <Tile label="Curtidas" value={stats.likes} />
            <Tile label="Comentários" value={stats.comments} sub="inclui respostas" />
            <Tile label="Compartilhamentos" value={stats.shares} />
            <Tile label="Publicações" value={stats.posts} />
            <Tile label="Discussões" value={stats.discussions} />
            <Tile label="Views de vídeos" value={stats.videoViews} />
            <Tile label="Views de clipes" value={stats.clipViews} />
            <Tile label="Denúncias abertas" value={stats.openReports} sub={stats.pending ? `${stats.pending} aguardando aprovação` : undefined} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Crescimento de membros" desc="Entradas acima da linha, saídas e remoções abaixo.">
              <Legend
                items={[
                  { label: "Entraram", color: "var(--s1)", kind: "rect" },
                  { label: "Saíram", color: "var(--neg)", kind: "rect" },
                ]}
              />
              <div className="mt-3">
                <DivergingBars days={dayKeys} up={daily.map((d) => d.joins)} down={daily.map((d) => d.leaves)} />
              </div>
            </Card>
            <Card title="Visualizações por dia" desc="Cada pessoa conta uma vez por publicação.">
              <LineChart days={dayKeys} area label="Visualizações por dia" series={[{ label: "visualizações", color: "var(--s1)", values: daily.map((d) => d.views) }]} />
            </Card>
          </div>

          <Card title="Engajamento por dia">
            <Legend
              items={[
                { label: "Curtidas", color: "var(--s1)", kind: "line" },
                { label: "Comentários", color: "var(--s2)", kind: "line" },
                { label: "Publicações", color: "var(--s3)", kind: "line" },
              ]}
            />
            <div className="mt-3">
              <LineChart
                days={dayKeys}
                height={220}
                label="Curtidas, comentários e publicações por dia"
                series={[
                  { label: "curtidas", color: "var(--s1)", values: daily.map((d) => d.likes) },
                  { label: "comentários", color: "var(--s2)", values: daily.map((d) => d.comments) },
                  { label: "publicações", color: "var(--s3)", values: daily.map((d) => d.posts) },
                ]}
              />
            </div>
          </Card>

          <details className="group rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white/80">Ver dados em tabela</summary>
            <div className="orbit-scrollbar mt-3 max-h-96 overflow-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="sticky top-0 bg-space-card text-white/50">
                  <tr>
                    {["Dia", "Entraram", "Saíram", "Visualizações", "Curtidas", "Comentários", "Publicações"].map((h) => (
                      <th key={h} className="px-2 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums text-white/80">
                  {[...daily].reverse().map((d) => (
                    <tr key={d.day} className="border-t border-white/[0.05]">
                      <td className="px-2 py-1.5 text-white/60">{dayShort(d.day)}</td>
                      <td className="px-2 py-1.5">{d.joins}</td>
                      <td className="px-2 py-1.5">{d.leaves}</td>
                      <td className="px-2 py-1.5">{d.views}</td>
                      <td className="px-2 py-1.5">{d.likes}</td>
                      <td className="px-2 py-1.5">{d.comments}</td>
                      <td className="px-2 py-1.5">{d.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
