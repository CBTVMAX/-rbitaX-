"use client";

import { useCallback, useState } from "react";
import { clsx } from "clsx";
import { Megaphone, Plus } from "lucide-react";
import { isEditorOrAdmin, TAG_LABEL, type CommunityPost, type PostTag } from "@/lib/communities";
import { loadCommunityPosts } from "@/lib/community-data";
import { useCommunity } from "../context";
import { useCreateFlow } from "../create-flow";
import { Feed, usePaged } from "../content-center";
import { SubpageFrame } from "../subpage";
import { EmptyState } from "../ui";

export function AnnouncementsView({ canSee, initial }: { canSee: boolean; initial: CommunityPost[] }) {
  const { supabase, community, viewer, role, membership } = useCommunity();
  const [tag, setTag] = useState<PostTag | null>(null);
  const [key, setKey] = useState(0);
  const load = useCallback(
    (before?: string) => loadCommunityPosts(supabase, community.id, viewer?.id ?? null, tag ? { tag, before, limit: 15 } : { tagged: true, before, limit: 15 }),
    [supabase, community.id, viewer?.id, tag]
  );
  const feed = usePaged(load, !tag && key === 0 ? initial : null, [tag, key]);
  const flow = useCreateFlow({ onCreated: () => (setTag(null), setKey((k) => k + 1)) });
  const canCreate = isEditorOrAdmin(role) && !membership?.muted;

  return (
    <SubpageFrame
      title="Avisos"
      icon="📣"
      canSee={canSee}
      action={
        canCreate && canSee ? (
          <button type="button" onClick={() => flow.start("announcement")} className="flex h-11 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> Novo aviso
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-white/55">Comunicados oficiais da equipe: anúncios, atualizações, eventos, manutenções e novidades. Avisos notificam os membros.</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <button type="button" onClick={() => setTag(null)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", !tag ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
            Todos
          </button>
          {(Object.keys(TAG_LABEL) as PostTag[]).map((t) => (
            <button key={t} type="button" onClick={() => setTag(t)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", tag === t ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              {TAG_LABEL[t].emoji} {TAG_LABEL[t].label}
            </button>
          ))}
        </div>
        <Feed
          {...feed}
          empty={
            <EmptyState
              icon={<Megaphone className="h-6 w-6" />}
              title="Nenhum aviso por aqui"
              text={canCreate ? "Publique um aviso: ele fica em destaque e notifica todos os membros." : "Quando a equipe publicar um comunicado, ele aparece aqui."}
            />
          }
        />
      </div>
      {flow.element}
    </SubpageFrame>
  );
}
