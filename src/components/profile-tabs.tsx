"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Award,
  ChevronDown,
  CircleDot,
  Image as ImageIcon,
  LayoutList,
  MessageSquareQuote,
  Music2,
  PlaySquare,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type Tab = { id: string; label: string; icon: LucideIcon };

// Abas principais ficam sempre à vista; as complementares vão para "Mais" (nada foi removido).
const PRIMARY = [
  { id: "posts", label: "Posts", icon: LayoutList },
  { id: "sobre", label: "Sobre", icon: User },
  { id: "fotos", label: "Fotos", icon: ImageIcon },
  { id: "videos", label: "Vídeos", icon: PlaySquare },
  { id: "musica", label: "Música", icon: Music2 },
  { id: "momentos", label: "Momentos", icon: CircleDot },
  { id: "comunidades", label: "Comunidades", icon: UsersRound },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "depoimentos", label: "Depoimentos", icon: MessageSquareQuote },
] as const satisfies readonly Tab[];

const SECONDARY = [
  { id: "familia", label: "Família", icon: Users },
  { id: "conquistas", label: "Conquistas", icon: Award },
] as const satisfies readonly Tab[];

const ALL = [...PRIMARY, ...SECONDARY];

export type ProfileTabId = (typeof ALL)[number]["id"];

const EMPTY_TEXT: Record<ProfileTabId, string> = {
  posts: "Nenhuma publicação ainda.",
  sobre: "Nenhuma informação adicionada ainda.",
  fotos: "Nenhuma foto ainda.",
  videos: "Nenhum vídeo ainda.",
  musica: "Nenhuma música no perfil ainda.",
  momentos: "Nenhum momento ativo.",
  comunidades: "Nenhuma comunidade para mostrar.",
  amigos: "Nenhum amigo ainda.",
  depoimentos: "Nenhum depoimento ainda.",
  familia: "Nenhum parente adicionado ainda.",
  conquistas: "Ainda não há conquistas.",
};

function isTab(id: string): id is ProfileTabId {
  return ALL.some((t) => t.id === id);
}

/**
 * Abas do perfil. No computador: faixa com ícones e sublinhado; no celular: "pílulas" com
 * rolagem horizontal. Qualquer link `#tab-<id>` na página (ex.: "Ver todas") troca a aba.
 */
export function ProfileTabs({
  slots,
  accent = false,
}: {
  slots: Partial<Record<ProfileTabId, React.ReactNode>>;
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
        // Limpa o endereço para o mesmo link funcionar de novo depois.
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: ProfileTabId) {
    setActive(id);
    setMoreOpen(false);
  }

  const underline = (
    <span
      className={clsx(
        "absolute inset-x-3 bottom-0 hidden h-[2px] rounded-full md:block",
        accent ? "bg-pa shadow-[0_0_10px_rgb(var(--pa)/0.7)]" : "bg-orbit-gradient"
      )}
    />
  );
  const secondaryActive = SECONDARY.find((t) => t.id === active);
  const tabClass = (on: boolean) =>
    clsx(
      "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition md:rounded-none md:px-2.5 md:py-3 md:text-[13px]",
      on
        ? clsx("font-semibold text-white md:bg-transparent", accent ? "bg-pa/15 ring-1 ring-pa/30 md:ring-0" : "bg-white/[0.08] md:bg-transparent")
        : "text-white/55 hover:text-white"
    );

  return (
    <div className="space-y-3 md:space-y-4">
      <div ref={barRef} className="relative scroll-mt-20">
        <div className="ox-card flex items-center rounded-2xl border border-white/10 bg-space-surface">
          <div role="tablist" aria-label="Seções do perfil" className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1.5 md:gap-0 md:px-2 md:py-0">
            {PRIMARY.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => select(id)} className={tabClass(active === id)}>
                <Icon className={clsx("hidden h-4 w-4 2xl:block", active === id && (accent ? "text-pa" : "text-orbit-blue"))} />
                {label}
                {active === id && underline}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(tabClass(!!secondaryActive), "mr-1.5 border-l border-white/10 md:mr-2 md:rounded-none md:pl-3")}
          >
            {secondaryActive ? secondaryActive.label : "Mais"}
            <ChevronDown className={clsx("h-3.5 w-3.5 transition", moreOpen && "rotate-180")} />
            {secondaryActive && underline}
          </button>
        </div>
        {moreOpen && (
          <>
            <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
            <div role="menu" className="absolute right-2 top-12 z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
              {SECONDARY.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => select(id)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-white/5",
                    active === id ? "font-semibold text-white" : "text-white/75"
                  )}
                >
                  <Icon className="h-4 w-4 text-white/50" /> {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div role="tabpanel">
        {slots[active] ?? (
          <div className="ox-card rounded-2xl border border-white/10 bg-space-surface p-10 text-center text-sm text-white/50">{EMPTY_TEXT[active]}</div>
        )}
      </div>
    </div>
  );
}
