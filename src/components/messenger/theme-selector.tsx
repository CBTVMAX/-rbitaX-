"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import { CHAT_THEMES, chatTheme } from "@/lib/messenger/themes";

/** Tema da conversa: background glow, accents, sent bubbles and buttons of this chat only. */
export function ThemeSelector({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const current = chatTheme(value).id;
  return (
    <div className="grid grid-cols-5 gap-x-1.5 gap-y-3" lang="pt-BR">
      {CHAT_THEMES.map((t) => {
        const on = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={on}
            title={t.label}
            className="group flex flex-col items-center gap-1.5"
          >
            <span
              className={clsx(
                "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-space-surface transition group-hover:scale-105",
                on ? "ring-[rgb(var(--swatch))]" : "ring-transparent"
              )}
              style={
                {
                  "--swatch": t.accent,
                  background: t.light
                    ? "linear-gradient(160deg, #f6f7fc 0%, #e6e9f6 100%)"
                    : `radial-gradient(circle at 25% 20%, rgb(${t.glow[0]} / 0.55), transparent 60%), radial-gradient(circle at 80% 90%, rgb(${t.glow[1]} / 0.5), transparent 60%), #0b0e1c`,
                } as React.CSSProperties
              }
            >
              <span className="absolute bottom-2 right-1.5 h-3 w-6 rounded-full rounded-br-sm" style={{ background: t.bubble }} />
              <span className={clsx("absolute left-1.5 top-2 h-3 w-5 rounded-full rounded-bl-sm", t.light ? "bg-slate-300" : "bg-white/25")} />
              {on && (
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-snow">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={clsx("w-full hyphens-auto break-words text-center text-[10px] leading-tight", on ? "font-semibold text-white" : "text-white/55")}>
              {t.label.replace("Monocromático", "Mono\u00ADcromático")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
