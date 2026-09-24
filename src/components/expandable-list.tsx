"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

export type IconListItem = { icon: React.ReactNode; text: string };

export function ExpandableIconList({ items, limit = 6 }: { items: IconListItem[]; limit?: number }) {
  const [open, setOpen] = useState(false);
  const needsToggle = items.length > limit;
  const visible = open ? items : items.slice(0, limit);

  return (
    <div className="mb-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-orbit-cyan">
              {item.icon}
            </span>
            <span className="text-sm text-white/70">{item.text}</span>
          </div>
        ))}
      </div>
      {needsToggle && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-orbit-cyan transition hover:underline"
        >
          {open ? "Ver menos" : "Ver todos os recursos"}
          <ChevronDown className={clsx("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
