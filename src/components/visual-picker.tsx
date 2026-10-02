"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import { useAppVisual } from "@/components/app-theme";
import type { AppVisual } from "@/lib/app-theme";

const OPTIONS: { id: AppVisual; label: string; hint: string }[] = [
  { id: "completo", label: "Completo", hint: "Estrelas, brilhos e papéis de parede espaciais" },
  { id: "simples", label: "Simples", hint: "Tela limpa: fundo liso, sem estrelas nem enfeites" },
];

/** Miniatura do Messenger em cada visual (cores fixas, só para comparar). */
function Mini({ simple }: { simple: boolean }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-end gap-1.5 p-2.5"
      style={
        simple
          ? { backgroundColor: "#000" }
          : {
              backgroundColor: "#070a1c",
              backgroundImage:
                "radial-gradient(circle at 20% 25%, rgba(255,255,255,.9) 1px, transparent 1.2px), radial-gradient(circle at 70% 15%, rgba(255,255,255,.7) 1px, transparent 1.2px), radial-gradient(circle at 85% 55%, rgba(255,255,255,.8) 1px, transparent 1.2px), radial-gradient(120% 80% at 80% 0%, rgba(139,92,246,.55), transparent 60%), radial-gradient(90% 70% at 0% 100%, rgba(43,108,255,.45), transparent 60%)",
            }
      }
    >
      <span className="h-3 w-3/5 rounded-full" style={{ backgroundColor: simple ? "#26262a" : "#2a2b31" }} />
      <span className="h-3 w-1/2 self-end rounded-full bg-gradient-to-r from-[#2b6cff] to-[#ec4899]" />
      <span className="h-3 w-2/5 rounded-full" style={{ backgroundColor: simple ? "#26262a" : "#2a2b31" }} />
    </div>
  );
}

export function VisualPicker({ initial }: { initial: AppVisual }) {
  const { visual, change } = useAppVisual(initial);
  return (
    <div role="radiogroup" aria-label="Visual do aplicativo" className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map(({ id, label, hint }) => {
        const selected = visual === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => change(id)}
            className={clsx(
              "group flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:flex-col sm:items-stretch sm:p-3.5",
              selected ? "border-orbit-purple bg-orbit-purple/10" : "border-white/10 bg-space-surface/80 hover:border-white/25"
            )}
          >
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-24 sm:w-full">
              <Mini simple={id === "simples"} />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="block text-xs text-white/55">{hint}</span>
              </span>
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-orbit-purple bg-orbit-purple text-snow" : "border-white/25"
                )}
              >
                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
