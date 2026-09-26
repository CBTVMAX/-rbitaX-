"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export const inputCls =
  "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-orbit-purple/60 disabled:opacity-50";

export function Card({ title, desc, children, right, className }: { title?: React.ReactNode; desc?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-3xl border border-white/[0.08] bg-space-card/70 p-4 md:p-5", className)}>
      {(title || right) && (
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[15px] font-semibold text-white">{title}</h2>}
            {desc && <p className="mt-0.5 text-xs leading-relaxed text-white/50">{desc}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white/90">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-white/45">{desc}</span>}
      </span>
      <span className={clsx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-orbit-gradient shadow-[0_0_14px_rgb(var(--app-accent,139_92_246)/0.45)]" : "bg-white/15")}>
        <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function SaveButton({ busy, disabled, onClick, children = "Salvar alterações" }: { busy?: boolean; disabled?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow transition disabled:opacity-40 disabled:shadow-none"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

export function SubTabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition",
            value === t.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65 hover:text-white"
          )}
        >
          {t.label}
          {!!t.count && <span className={clsx("rounded-full px-1.5 text-[10px] tabular-nums", value === t.id ? "bg-black/20" : "bg-orbit-pink/80 text-snow")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5 text-xs text-amber-200/90">{children}</p>;
}
