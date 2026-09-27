"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Archive, BarChart3, Eye, Link2, Music2, Play, Plus, Type } from "lucide-react";
import { isEditorOrAdmin, parseDbDate } from "@/lib/communities";
import { useTimeZone } from "@/lib/use-tz";
import { useCommunity } from "../context";
import { backgroundOf, StoryComposer, StoryViewer, type Story, type StoryGroup } from "../stories";
import { SubpageFrame } from "../subpage";
import { EmptyState } from "../ui";

/** Every story the person published here (the team sees all of the community's), active or expired. */
export function StoriesArchiveView({ canSee, stories: initial }: { canSee: boolean; stories: Story[] }) {
  const { community, viewer, role, membership } = useCommunity();
  const team = isEditorOrAdmin(role);
  const tz = useTimeZone();
  const [stories, setStories] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"todas" | "ativas" | "expiradas">("todas");
  const now = Date.now();
  const shown = useMemo(
    () => stories.filter((s) => (filter === "todas" ? true : filter === "ativas" ? parseDbDate(s.expiresAt).getTime() > now : parseDbDate(s.expiresAt).getTime() <= now)),
    [stories, filter, now]
  );
  const group: StoryGroup = { key: "archive", name: community.name, avatarUrl: community.avatarUrl, community: true, stories: shown, seen: true };

  return (
    <SubpageFrame
      title="Arquivo de histórias"
      icon="🗂️"
      wide
      canSee={canSee}
      action={
        viewer && !membership?.muted ? (
          <button type="button" onClick={() => setCreating(true)} aria-label="Nova história" className="flex h-11 items-center gap-1.5 rounded-full bg-orbit-gradient px-3.5 text-sm font-semibold text-snow shadow-glow sm:px-4">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova história</span>
          </button>
        ) : undefined
      }
    >
      <p className="mb-3 text-sm text-white/55">
        {team ? "Todas as histórias publicadas na comunidade, inclusive as que já expiraram, com visualizações e reações." : "Suas histórias publicadas nesta comunidade. Depois de expirar, só você e a equipe as veem aqui."}
      </p>
      <div className="mb-4 flex gap-2">
        {(["todas", "ativas", "expiradas"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={clsx("rounded-full px-4 py-2 text-xs font-semibold capitalize", filter === f ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
            {f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<Archive className="h-6 w-6" />} title="Nenhuma história aqui" text="Histórias somem do topo da comunidade depois do prazo, mas continuam guardadas neste arquivo." />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((s, i) => {
            const expired = parseDbDate(s.expiresAt).getTime() <= now;
            const thumb = s.thumbnailUrl ?? (s.type === "image" ? s.mediaUrl : null);
            const Icon = s.type === "video" ? Play : s.type === "music" ? Music2 : s.type === "poll" ? BarChart3 : s.type === "link" ? Link2 : Type;
            return (
              <button key={s.id} type="button" onClick={() => setOpen(i)} className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.08] text-left" style={thumb ? undefined : { background: backgroundOf(s.meta.background) }}>
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                )}
                {!thumb && s.text && <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] font-bold text-white line-clamp-6">{s.text}</span>}
                <span className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-1.5 text-[10px] font-semibold text-white">
                  <span>{parseDbDate(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: tz })}</span>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-1.5 text-[10px] text-white">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {s.viewCount}
                  </span>
                  <span className={clsx("rounded-full px-1.5 py-px font-semibold", expired ? "bg-white/20" : "bg-emerald-500/80")}>{expired ? "Expirada" : "Ativa"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open !== null && shown.length > 0 && (
        <StoryViewer archive groups={[group]} start={{ g: 0, i: open }} onClose={() => setOpen(null)} onDeleted={(id) => setStories((l) => l.filter((s) => s.id !== id))} />
      )}
      <StoryComposer open={creating} onClose={() => setCreating(false)} onCreated={() => window.location.reload()} />
    </SubpageFrame>
  );
}
