"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, List } from "lucide-react";

export type TocItem = {
  id: string;
  number: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
};

function NavRow({
  item,
  active,
  onClick,
  size = "md",
}: {
  item: TocItem;
  active: boolean;
  onClick?: () => void;
  size?: "md" | "sm";
}) {
  return (
    <a
      href={`#${item.id}`}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-white/[0.06] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
      )}
    >
      <span
        className={clsx(
          "flex shrink-0 items-center justify-center rounded-full border-2",
          size === "md" ? "h-8 w-8" : "h-7 w-7",
          item.color
        )}
      >
        {item.icon}
      </span>
      <span className="flex-1 leading-tight">
        {item.number}. {item.title}
      </span>
      {item.badge && (
        <span className="shrink-0 rounded-full bg-orbit-pink/15 px-2 py-0.5 text-[10px] font-bold text-orbit-pink">
          {item.badge}
        </span>
      )}
    </a>
  );
}

function PlanetCard() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-space-card p-6 text-center">
      <div className="relative mx-auto mb-4 h-16 w-16">
        <div className="absolute inset-0 rounded-full bg-orbit-gradient shadow-glow" />
        <div className="absolute left-1/2 top-1/2 h-5 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border-2 border-orbit-cyan/60" />
      </div>
      <p className="font-display text-base font-bold orbit-text-gradient">ÓRBITA X</p>
      <p className="mt-1 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-white/30">
        Seu universo
        <br />
        em conexão
      </p>
    </div>
  );
}

export function TermosToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const els = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);

    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      <div className="mb-6 lg:hidden">
        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-space-card px-4 py-3 text-sm text-white"
        >
          <span className="flex items-center gap-2">
            <List className="h-4 w-4 text-orbit-cyan" /> Ver índice do documento
          </span>
          <ChevronDown className={clsx("h-4 w-4 transition", mobileOpen && "rotate-180")} />
        </button>
        {mobileOpen && (
          <nav className="mt-2 space-y-1 rounded-xl border border-white/10 bg-space-card p-2">
            {items.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                active={activeId === item.id}
                onClick={() => setMobileOpen(false)}
                size="sm"
              />
            ))}
          </nav>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
            Neste documento
          </p>
          <nav className="space-y-1">
            {items.map((item) => (
              <NavRow key={item.id} item={item} active={activeId === item.id} />
            ))}
          </nav>
          <PlanetCard />
        </div>
      </aside>
    </>
  );
}
