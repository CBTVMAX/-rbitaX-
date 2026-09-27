"use client";

/**
 * Gráficos leves em SVG puro para o painel — sem biblioteca externa (mantém o bundle pequeno e o
 * visual alinhado ao Órbita X). Paleta da marca: roxo/ciano/rosa/âmbar sobre fundo escuro.
 */

export const ORBIT_SERIES = ["#8b5cf6", "#22d3ee", "#f472b6", "#f59e0b", "#34d399", "#60a5fa"];

/** Linha de área suave (crescimento). */
export function AreaChart({ points, height = 190, stroke = "#8b5cf6" }: { points: { label: string; value: number }[]; height?: number; stroke?: string }) {
  const w = 640;
  const pad = { t: 12, r: 8, b: 24, l: 8 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i * (w - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${height - pad.b} L${x(0).toFixed(1)},${height - pad.b} Z`;
  const id = `g-${stroke.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Gráfico de linha">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad.l} x2={w - pad.r} y1={pad.t + g * (height - pad.t - pad.b)} y2={pad.t + g * (height - pad.t - pad.b)} stroke="#ffffff" strokeOpacity="0.06" />
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === n - 1 ? 4 : 0} fill={stroke} />
      ))}
      {points.map((p, i) =>
        n <= 12 || i % Math.ceil(n / 8) === 0 ? (
          <text key={i} x={x(i)} y={height - 6} fill="#ffffff" fillOpacity="0.4" fontSize="11" textAnchor="middle">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

/** Rosca (donut) com legenda ao lado. */
export function DonutChart({ data, total, totalLabel }: { data: { label: string; count: number }[]; total?: number; totalLabel?: string }) {
  const sum = data.reduce((a, b) => a + b.count, 0) || 1;
  const size = 150;
  const r = 58;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="16" />
          {data.map((d, i) => {
            const frac = d.count / sum;
            const dash = frac * circ;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={ORBIT_SERIES[i % ORBIT_SERIES.length]}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-white">{(total ?? sum).toLocaleString("pt-BR")}</span>
          <span className="text-[10px] text-white/50">{totalLabel ?? "total"}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ORBIT_SERIES[i % ORBIT_SERIES.length] }} />
            <span className="min-w-0 flex-1 truncate text-white/75">{d.label}</span>
            <span className="shrink-0 font-semibold text-white">{Math.round((d.count / sum) * 100)}%</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-white/40">Sem dados ainda.</li>}
      </ul>
    </div>
  );
}

/** Barras verticais (estatísticas por dia). */
export function BarChart({ points, height = 180, color = "#8b5cf6" }: { points: { label: string; value: number }[]; height?: number; color?: string }) {
  const w = 640;
  const pad = { t: 10, b: 22 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length || 1;
  const bw = (w / n) * 0.6;
  const gap = (w / n) * 0.4;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Gráfico de barras">
      {points.map((p, i) => {
        const h = (p.value / max) * (height - pad.t - pad.b);
        const x = i * (w / n) + gap / 2;
        return <rect key={i} x={x} y={height - pad.b - h} width={bw} height={h} rx="3" fill={color} fillOpacity="0.85" />;
      })}
      {points.map((p, i) =>
        n <= 12 || i % Math.ceil(n / 10) === 0 ? (
          <text key={i} x={i * (w / n) + w / n / 2} y={height - 6} fill="#ffffff" fillOpacity="0.4" fontSize="11" textAnchor="middle">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
