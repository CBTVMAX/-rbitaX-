"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Lock, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { ago, communityError, compactNumber } from "@/lib/communities";
import { useCommunity } from "../context";
import { EmptyState } from "../ui";

type Audit = {
  total: number;
  unique: number;
  events: { at: string; user: { name: string; username: string; avatarUrl: string | null }; postId: string; content: string; kind: string }[];
  topContent: { postId: string; content: string; downloads: number; uniques: number }[];
};

const nf = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");
const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function DownloadsSection() {
  const { supabase, community } = useCommunity();
  const [data, setData] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: d, error: e } = await supabase.rpc("community_download_audit", { p_community: community.id, p_limit: 80, p_offset: 0 });
    if (e) return setError(communityError(e.message));
    setData(d as unknown as Audit);
  }, [supabase, community.id]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rounded-2xl border border-white/10 bg-space-card/60 p-6 text-center"><Lock className="mx-auto h-7 w-7 text-white/40" /><p className="mt-2 text-sm text-white/70">{error}</p></div>;
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
          <Download className="h-5 w-5 text-orbit-cyan" />
          <p className="mt-2 font-display text-2xl font-bold text-white">{nf(data.total)}</p>
          <p className="text-xs text-white/50">Downloads totais</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
          <Users className="h-5 w-5 text-orbit-purple" />
          <p className="mt-2 font-display text-2xl font-bold text-white">{nf(data.unique)}</p>
          <p className="text-xs text-white/50">Usuários únicos</p>
        </div>
      </div>

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/45">
        Registramos os downloads feitos dentro do Órbita X. Não é possível rastrear o uso das imagens fora da plataforma (WhatsApp, Instagram, etc.). Estes dados são privados da administração.
      </p>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white">Conteúdos mais baixados</h3>
        {data.topContent.length === 0 ? (
          <EmptyState icon={<Download className="h-6 w-6" />} title="Nenhum download ainda" text="Quando alguém baixar um arquivo ou imagem da comunidade, aparece aqui." />
        ) : (
          <ul className="space-y-1.5">
            {data.topContent.map((c) => (
              <li key={c.postId} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-space-card/50 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.content}</span>
                <span className="shrink-0 text-xs text-white/45">{compactNumber(c.uniques)} únicos</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-orbit-cyan/15 px-2.5 py-1 text-xs font-semibold text-orbit-cyan"><Download className="h-3.5 w-3.5" /> {compactNumber(c.downloads)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-white">Auditoria de downloads</h3>
        {data.events.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.events.map((e, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-space-card/40 px-3 py-2">
                <Avatar name={e.user.name} url={e.user.avatarUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    <span className="font-semibold">{e.user.name}</span> <span className="text-white/45">baixou</span> {e.content}
                  </p>
                  <p className="text-[11px] text-white/40">@{e.user.username} · {dt(e.at)} · {ago(e.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
