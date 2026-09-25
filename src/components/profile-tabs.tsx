"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Home,
  Image as ImageIcon,
  List,
  Music2,
  PlayCircle,
  Sparkles,
  User,
  Users,
  UsersRound,
} from "lucide-react";

const TABS = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "posts", label: "Posts", icon: List },
  { id: "fotos", label: "Fotos", icon: ImageIcon },
  { id: "videos", label: "Vídeos", icon: PlayCircle },
  { id: "musica", label: "Música", icon: Music2 },
  { id: "momentos", label: "Momentos", icon: Sparkles },
  { id: "sobre", label: "Sobre", icon: User },
  { id: "amigos", label: "Amigos", icon: UsersRound },
  { id: "comunidades", label: "Comunidades", icon: Users },
] as const;

export type ProfileTabId = (typeof TABS)[number]["id"];

const EMPTY_TEXT: Record<ProfileTabId, string> = {
  inicio: "",
  posts: "Nenhuma publicação ainda.",
  fotos: "Nenhuma foto ainda.",
  videos: "Nenhum vídeo ainda.",
  musica: "Nenhuma música adicionada ainda.",
  momentos: "Nenhum momento ainda.",
  sobre: "Nenhuma informação adicionada ainda.",
  amigos: "Nenhum amigo ainda.",
  comunidades: "Nenhuma comunidade ainda.",
};

export function ProfileTabs({ slots }: { slots: Partial<Record<ProfileTabId, React.ReactNode>> }) {
  const [active, setActive] = useState<ProfileTabId>("inicio");

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="orbit-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-space-surface/80 p-1.5 md:p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={clsx(
              "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition",
              active === id
                ? "bg-gradient-to-r from-orbit-blue/25 to-orbit-purple/25 font-medium text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className={clsx("h-4 w-4", id === "inicio" || id === "posts" ? "" : "hidden md:block")} />
            {label}
            {active === id && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-orbit-gradient" />}
          </button>
        ))}
      </div>

      {slots[active] ?? (
        <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-10 text-center text-sm text-white/50">
          {EMPTY_TEXT[active]}
        </div>
      )}
    </div>
  );
}
