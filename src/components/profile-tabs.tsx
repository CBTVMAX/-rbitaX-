"use client";

import { useState } from "react";
import { clsx } from "clsx";

const TABS = [
  { id: "posts", label: "Publicações" },
  { id: "media", label: "Mídia" },
  { id: "about", label: "Sobre" },
  { id: "friends", label: "Amigos" },
  { id: "communities", label: "Comunidades" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
      {text}
    </div>
  );
}

export function ProfileTabs({ postsSlot }: { postsSlot: React.ReactNode }) {
  const [active, setActive] = useState<TabId>("posts");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 text-sm">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-3 font-medium transition",
              active === id
                ? "border-orbit-cyan text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {active === "posts" && postsSlot}
        {active === "media" && <EmptyTab text="Nenhuma mídia ainda." />}
        {active === "about" && <EmptyTab text="Em breve." />}
        {active === "friends" && <EmptyTab text="Nenhum amigo ainda." />}
        {active === "communities" && <EmptyTab text="Nenhuma comunidade ainda." />}
      </div>
    </div>
  );
}
