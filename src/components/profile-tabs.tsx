"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Award,
  X,
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

// Abas principais à vista (como no VK); complementares em "Mais". Amigos e Comunidades saíram
// da barra (estão no "Saber mais"), mas continuam abrindo pelos links "#tab-amigos"/"#tab-comunidades".
const PRIMARY = [
  { id: "posts", label: "Posts", icon: LayoutList },
  { id: "fotos", label: "Fotos", icon: ImageIcon },
  { id: "videos", label: "Vídeos", icon: PlaySquare },
  { id: "musica", label: "Música", icon: Music2 },
  { id: "momentos", label: "Momentos", icon: CircleDot },
  { id: "depoimentos", label: "Depoimentos", icon: MessageSquareQuote },
  { id: "conquistas", label: "Conquistas", icon: Award },
] as const satisfies readonly Tab[];

// Sobre, Família, Amigos e Comunidades estão no "Saber mais" / na lateral: fora da barra, mas
// continuam abrindo pelos links "#tab-…" (ex.: "Gerenciar família", "Ver todas").
const HIDDEN = [
  { id: "sobre", label: "Sobre", icon: User },
  { id: "familia", label: "Família", icon: Users },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "comunidades", label: "Comunidades", icon: UsersRound },
] as const satisfies readonly Tab[];

const ALL = [...PRIMARY, ...HIDDEN];

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
  }

  const underline = (
    <span
      className={clsx(
        "absolute inset-x-3 bottom-0 hidden h-[2px] rounded-full md:block",
        accent ? "bg-pa shadow-[0_0_10px_rgb(var(--pa)/0.7)]" : "bg-orbit-gradient"
      )}
    />
  );
  const secondaryActive = HIDDEN.find((t) => t.id === active);
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
          {/* Seção aberta por link (Família, Amigos…): aparece como aba ativa, com "x" para voltar aos Posts. */}
          {secondaryActive && (
            <button
              type="button"
              onClick={() => select("posts")}
              aria-label={`Fechar ${secondaryActive.label}`}
              className={clsx(tabClass(true), "mr-1.5 border-l border-white/10 md:mr-2 md:rounded-none md:pl-3")}
            >
              {secondaryActive.label}
              <X className="h-3.5 w-3.5 text-white/50" />
              {underline}
            </button>
          )}
        </div>
      </div>

      <div role="tabpanel">
        {slots[active] ?? (
          <div className="ox-card rounded-2xl border border-white/10 bg-space-surface p-10 text-center text-sm text-white/50">{EMPTY_TEXT[active]}</div>
        )}
      </div>
    </div>
  );
}
