"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Album } from "@/lib/communities";
import { useCommunity } from "../context";
import { useCreateOptions } from "../composer";
import { useCreateFlow } from "../create-flow";
import { ContentCenter, type ContentCounts, type ContentTab } from "../content-center";
import { MutedNotice, SubpageFrame } from "../subpage";

const TITLES: Record<ContentTab, { title: string; icon: string }> = {
  tudo: { title: "Conteúdo", icon: "🪐" },
  posts: { title: "Posts", icon: "📝" },
  fotos: { title: "Fotos", icon: "📷" },
  videos: { title: "Vídeos", icon: "🎥" },
  clipes: { title: "Clipes", icon: "🎬" },
  musica: { title: "Música", icon: "🎵" },
  gifs: { title: "GIFs", icon: "🌀" },
  arquivos: { title: "Arquivos", icon: "📎" },
};

export function ContentPageView({ canSee, tab, albums, counts }: { canSee: boolean; tab: ContentTab; albums: Album[]; counts: ContentCounts }) {
  const router = useRouter();
  useCommunity();
  const [key, setKey] = useState(0);
  const options = useCreateOptions();
  const flow = useCreateFlow({ albums, onCreated: (r) => (r.kind === "album" ? router.refresh() : setKey((k) => k + 1)) });
  const t = TITLES[tab];
  return (
    <SubpageFrame
      title={t.title}
      icon={t.icon}
      wide
      canSee={canSee}
      action={
        options.length > 0 && canSee ? (
          <button type="button" onClick={flow.openMenu} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> Criar
          </button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-4xl space-y-3">
        <MutedNotice />
        <ContentCenter initialTab={tab} albums={albums} counts={counts} refreshKey={key} onCompose={flow.start} />
      </div>
      {flow.element}
    </SubpageFrame>
  );
}
