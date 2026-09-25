"use client";

import { useState } from "react";
import { clsx } from "clsx";

const TABS = [
  { id: "posts", label: "Posts" },
  { id: "midia", label: "Mídia" },
  { id: "sobre", label: "Sobre" },
  { id: "amigos", label: "Amigos" },
  { id: "comunidades", label: "Comunidades" },
  { id: "conquistas", label: "Conquistas" },
  { id: "depoimentos", label: "Depoimentos" },
] as const;

export type ProfileTabId = (typeof TABS)[number]["id"];

const EMPTY_TEXT: Record<ProfileTabId, string> = {
  posts: "Nenhuma publicação ainda.",
  midia: "Nenhuma foto ou vídeo ainda.",
  sobre: "Nenhuma informação adicionada ainda.",
  amigos: "Nenhum amigo ainda.",
  comunidades: "Nenhuma comunidade ainda.",
  conquistas: "Ainda não há conquistas.",
  depoimentos: "Nenhum depoimento ainda.",
};

export function ProfileTabs({
  slots,
  aside,
}: {
  slots: Partial<Record<ProfileTabId, React.ReactNode>>;
  aside?: React.ReactNode;
}) {
  const [active, setActive] = useState<ProfileTabId>("posts");

  return (
    <div className="space-y-3 md:space-y-4">
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="orbit-scrollbar flex overflow-x-auto rounded-2xl border border-white/10 bg-space-surface/80 px-1 md:px-2"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={clsx(
              "relative shrink-0 px-4 py-3.5 text-sm transition md:px-5",
              active === id ? "font-semibold text-white" : "text-white/60 hover:text-white"
            )}
          >
            {label}
            {active === id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-orbit-gradient" />}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start lg:gap-4">
        <div className="min-w-0" role="tabpanel">
          {slots[active] ?? (
            <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-10 text-center text-sm text-white/50">
              {EMPTY_TEXT[active]}
            </div>
          )}
        </div>
        {aside && <div className="hidden space-y-4 lg:block">{aside}</div>}
      </div>
    </div>
  );
}
