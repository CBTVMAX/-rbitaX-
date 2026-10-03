"use client";

import { clsx } from "clsx";

// Peças visuais do "Editar perfil" (compartilhadas com os editores de Mais informações).
export const inputClass =
  "w-full rounded-xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-orbit-purple/70";
export const selectClass = `${inputClass} appearance-none pr-[40px]`;
export const dateSelectClass =
  "w-full appearance-none rounded-xl border border-white/10 bg-space-bg/60 py-3 pl-3 pr-[28px] text-sm text-white outline-none transition focus:border-orbit-purple/70";

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  desktopOnly = false,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  desktopOnly?: boolean;
}) {
  return (
    <div className={clsx("mb-4 items-start gap-2.5 lg:mb-5 lg:gap-3", desktopOnly ? "hidden lg:flex" : "flex")}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orbit-blue lg:h-6 lg:w-6" />
      <div>
        <h2 className="text-base font-semibold text-orbit-blue lg:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 hidden text-xs text-white/55 lg:block">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
      <SectionHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="space-y-5 lg:space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  icon: Icon,
  stacked = false,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3",
        !stacked && "lg:grid-cols-[1.5rem_8.5rem_minmax(0,1fr)]"
      )}
    >
      <Icon className={clsx("mt-0.5 h-5 w-5 text-orbit-blue/80", !stacked && "lg:mt-3")} />
      <label className={clsx("mb-2 text-sm text-white/80", !stacked && "lg:mb-0 lg:mt-3")}>{label}</label>
      <div className={clsx("col-start-2", !stacked && "lg:col-start-3 lg:row-start-1")}>{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, icon: Icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-orbit-blue/80" />
      <span className="flex-1 text-sm text-white/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-orbit-gradient" : "bg-white/15"
        )}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-snow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function SelectWrap({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="relative">
      {children}
      <svg
        viewBox="0 0 20 20"
        className={clsx("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white/50", compact ? "right-2" : "right-3.5")} fill="currentColor" aria-hidden>
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </div>
  );
}

