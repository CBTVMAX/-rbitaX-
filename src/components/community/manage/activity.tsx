"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { BarChart3, Download, Eye, Heart, Loader2, LogOut, MessageCircle, Repeat2, ScrollText, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { communityError, compactNumber } from "@/lib/communities";
import { useCommunity } from "../context";

type Activity = {
  days: number;
  members: number; activeMembers: number; newMembers: number; leftMembers: number;
  posts: number; comments: number; likes: number; shares: number; views: number; downloads: number;
  topMembers: { user: { name: string; username: string; avatarUrl: string | null }; posts: number; comments: number; likes: number; shares: number; total: number }[];
  topContent: { postId: string; content: string; kind: string; interactions: number; downloads: number }[];
};

const PERIODS = [7, 15, 30, 90, 150, 180, 365];
const nf = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");

export function ActivitySection() {
  const { supabase, community } = useCommunity();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null);
    const { data: d, error: e } = await supabase.rpc("community_activity", { p_community: community.id, p_days: days });
    if (e) return setError(communityError(e.message));
    setData(d as unknown as Activity);
  }, [supabase, community.id, days]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rounded-2xl border border-white/10 bg-space-card/60 p-6 text-center text-sm text-white/70">{error}</div>;

  const counters = data && [
    { icon: Users, label: "Membros", value: data.members, color: "text-orbit-cyan" },
    { icon: BarChart3, label: "Ativos", value: data.activeMembers, color: "text-orbit-purple" },
    { icon: UserPlus, label: "Novos", value: data.newMembers, color: "text-emerald-300" },
    { icon: LogOut, label: "Saíram", value: data.leftMembers, color: "text-red-300" },
    { icon: ScrollText, label: "Publicações", value: data.posts, color: "text-white/80" },
    { icon: MessageCircle, label: "Comentários", value: data.comments, color: "text-orbit-cyan" },
    { icon: Heart, label: "Curtidas", value: data.likes, color: "text-orbit-pink" },
    { icon: Repeat2, label: "Compart.", value: data.shares, color: "text-white/80" },
    { icon: Eye, label: "Visualizações", value: data.views, color: "text-white/80" },
    { icon: Download, label: "Downloads", value: data.downloads, color: "text-orbit-cyan" },
  ];

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
        {PERIODS.map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={clsx("shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition", days === d ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:bg-white/5")}>
            {d < 30 ? `${d} dias` : d < 365 ? `${d} dias` : "1 ano"}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {counters!.map((c) => (
              <div key={c.label} className="rounded-2xl border border-white/10 bg-space-card/70 p-3.5">
                <c.icon className={clsx("h-4 w-4", c.color)} />
                <p className="mt-1.5 font-display text-xl font-bold text-white">{nf(c.value)}</p>
                <p className="text-[11px] text-white/50">{c.label}</p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-white">Membros mais ativos</h3>
            <p className="mb-2 text-[11px] text-white/40">Dados administrativos e privados — não são um ranking público.</p>
            {data.topMembers.length === 0 ? (
              <p className="text-xs text-white/40">Sem atividade no período.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topMembers.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-space-card/50 px-3 py-2.5">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-white/40">{i + 1}</span>
                    <Avatar name={m.user.name} url={m.user.avatarUrl} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{m.user.name}</p>
                      <p className="truncate text-[11px] text-white/45">{m.posts} posts · {m.comments} coment. · {m.likes} curtidas · {m.shares} compart.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orbit-gradient px-2.5 py-1 text-xs font-bold text-snow">{compactNumber(m.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-white">Conteúdos com mais interações</h3>
            {data.topContent.length === 0 ? (
              <p className="text-xs text-white/40">Sem conteúdo no período.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topContent.map((c) => (
                  <li key={c.postId} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-space-card/50 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.content}</span>
                    {c.downloads > 0 && <span className="flex shrink-0 items-center gap-1 text-xs text-white/45"><Download className="h-3.5 w-3.5" />{compactNumber(c.downloads)}</span>}
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-orbit-pink/15 px-2.5 py-1 text-xs font-semibold text-orbit-pink"><Heart className="h-3.5 w-3.5" />{compactNumber(c.interactions)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
