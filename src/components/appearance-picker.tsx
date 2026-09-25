"use client";

import { clsx } from "clsx";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/app-theme";
import type { AppTheme } from "@/lib/app-theme";

const OPTIONS: {
  id: AppTheme;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dark", label: "Escuro", hint: "O visual clássico do Órbita X", icon: Moon },
  { id: "light", label: "Claro", hint: "Fundo claro para ambientes iluminados", icon: Sun },
  { id: "auto", label: "Automático", hint: "Acompanha a configuração do seu aparelho", icon: Monitor },
];

/** Miniature of the app in a given palette (fixed colors, independent of the current theme). */
function Mini({ light }: { light: boolean }) {
  const bg = light ? "#f2f3fa" : "#05060f";
  const surface = light ? "#ffffff" : "#0b0e1c";
  const line = light ? "rgba(17,20,43,0.14)" : "rgba(255,255,255,0.14)";
  const ink = light ? "rgba(17,20,43,0.55)" : "rgba(255,255,255,0.55)";
  return (
    <div className="flex h-full w-full gap-1.5 p-2" style={{ backgroundColor: bg }}>
      <div className="w-1/4 space-y-1 rounded-md p-1.5" style={{ backgroundColor: surface, border: `1px solid ${line}` }}>
        <span className="block h-1.5 w-full rounded-full bg-gradient-to-r from-[#2b6cff] to-[#8b5cf6]" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-1 w-3/4 rounded-full" style={{ backgroundColor: ink }} />
        ))}
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="h-7 rounded-md bg-gradient-to-br from-[#2b6cff]/60 to-[#ec4899]/50" />
        <div className="space-y-1 rounded-md p-1.5" style={{ backgroundColor: surface, border: `1px solid ${line}` }}>
          <span className="block h-1 w-2/3 rounded-full" style={{ backgroundColor: ink }} />
          <span className="block h-1 w-1/2 rounded-full" style={{ backgroundColor: ink }} />
        </div>
      </div>
    </div>
  );
}

export function AppearancePicker({ initial }: { initial: AppTheme }) {
  const { theme, change } = useAppTheme(initial);

  return (
    <div role="radiogroup" aria-label="Aparência do aplicativo" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ id, label, hint, icon: Icon }) => {
        const selected = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => change(id)}
            className={clsx(
              "group flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:flex-col sm:items-stretch sm:p-3.5",
              selected
                ? "border-orbit-purple bg-orbit-purple/10 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                : "border-white/10 bg-space-surface/80 hover:border-white/25"
            )}
          >
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-24 sm:w-full">
              {id === "auto" ? (
                <div className="flex h-full">
                  <div className="w-1/2 overflow-hidden">
                    <div className="h-full w-[200%]">
                      <Mini light={false} />
                    </div>
                  </div>
                  <div className="relative w-1/2 overflow-hidden">
                    <div className="absolute inset-y-0 right-0 h-full w-[200%]">
                      <Mini light />
                    </div>
                  </div>
                </div>
              ) : (
                <Mini light={id === "light"} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", selected ? "text-orbit-purple" : "text-white/60")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-white/55">{hint}</p>
              </div>
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25"
                )}
              >
                {selected && <Check className="h-3 w-3" />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
