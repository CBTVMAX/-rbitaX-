"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

// Abas principais ficam sempre à vista; as complementares vão para "Mais" (nada foi removido).
const PRIMARY = [
  { id: "posts", label: "Posts" },
  { id: "sobre", label: "Sobre" },
  { id: "fotos", label: "Fotos" },
  { id: "videos", label: "Vídeos" },
  { id: "musica", label: "Música" },
  { id: "comunidades", label: "Comunidades" },
  { id: "amigos", label: "Amigos" },
] as const;

const SECONDARY = [
  { id: "familia", label: "Família" },
  { id: "conquistas", label: "Conquistas" },
  { id: "depoimentos", label: "Depoimentos" },
] as const;

const ALL = [...PRIMARY, ...SECONDARY];

export type ProfileTabId = (typeof ALL)[number]["id"];

const EMPTY_TEXT: Record<ProfileTabId, string> = {
  posts: "Nenhuma publicação ainda.",
  sobre: "Nenhuma informação adicionada ainda.",
  fotos: "Nenhuma foto ainda.",
  videos: "Nenhum vídeo ainda.",
  musica: "Nenhuma música no perfil ainda.",
  comunidades: "Nenhuma comunidade para mostrar.",
  amigos: "Nenhum amigo ainda.",
  familia: "Nenhum parente adicionado ainda.",
  conquistas: "Ainda não há conquistas.",
  depoimentos: "Nenhum depoimento ainda.",
};

function isTab(id: string): id is ProfileTabId {
  return ALL.some((t) => t.id === id);
}

/**
 * Abas do perfil. Qualquer link `#tab-<id>` na página (ex.: "Ver todas" dos blocos laterais)
 * troca a aba e rola até ela, sem recarregar.
 */
export function ProfileTabs({
  slots,
  aside,
  accent = false,
}: {
  slots: Partial<Record<ProfileTabId, React.ReactNode>>;
  aside?: React.ReactNode;
  accent?: boolean;
}) {
  const [active, setActive] = useState<ProfileTabId>("posts");
  const [moreOpen, setMoreOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#tab-/, "");
      if (window.location.hash.startsWith("#tab-") && isTab(id)) {
        setActive(id);
        barRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: ProfileTabId) {
    setActive(id);
    setMoreOpen(false);
    // Mantém o endereço limpo; se havia um #tab- antigo, some para o próximo clique funcionar.
    if (window.location.hash.startsWith("#tab-")) history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const underline = (
    <span
      className={clsx(
        "absolute inset-x-3 bottom-0 h-[2px] rounded-full",
        accent ? "bg-pa shadow-[0_0_10px_rgb(var(--pa)/0.7)]" : "bg-orbit-gradient"
      )}
    />
  );
  const secondaryActive = SECONDARY.find((t) => t.id === active);

  return (
    <div className="space-y-3 md:space-y-4">
      <div ref={barRef} className="relative scroll-mt-20">
        <div
          role="tablist"
          aria-label="Seções do perfil"
          className="no-scrollbar flex items-center overflow-x-auto rounded-2xl border border-white/10 bg-space-surface/80 px-1 md:px-2"
        >
          {PRIMARY.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active === id}
              onClick={() => select(id)}
              className={clsx(
                "relative shrink-0 px-3 py-2.5 text-[13px] transition md:px-3.5",
                active === id ? "font-semibold text-white" : "text-white/60 hover:text-white"
              )}
            >
              {label}
              {active === id && underline}
            </button>
          ))}
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(
              "relative ml-auto flex shrink-0 items-center gap-1 px-3 py-2.5 text-[13px] transition",
              secondaryActive ? "font-semibold text-white" : "text-white/60 hover:text-white"
            )}
          >
            {secondaryActive ? secondaryActive.label : "Mais"}
            <ChevronDown className={clsx("h-3.5 w-3.5 transition", moreOpen && "rotate-180")} />
            {secondaryActive && underline}
          </button>
        </div>
        {moreOpen && (
          <>
            <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
            <div role="menu" className="absolute right-2 top-11 z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
              {SECONDARY.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => select(id)}
                  className={clsx(
                    "flex w-full items-center px-4 py-2.5 text-left text-sm hover:bg-white/5",
                    active === id ? "font-semibold text-white" : "text-white/75"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_260px] md:items-start md:gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0" role="tabpanel">
          {slots[active] ?? (
            <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-10 text-center text-sm text-white/50">
              {EMPTY_TEXT[active]}
            </div>
          )}
        </div>
        {aside && <div className="hidden space-y-3 md:sticky md:top-20 md:block">{aside}</div>}
      </div>
    </div>
  );
}
