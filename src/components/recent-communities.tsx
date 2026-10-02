"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { clearRecentCommunities, readRecentCommunities, RECENT_EVENT, type RecentCommunity } from "@/lib/recent-communities";
import { CommunityAvatar } from "@/components/community-avatar";

/** Fileira "Visitadas recentemente" com o X para limpar. Some quando não há nada. */
export function RecentCommunities() {
  const [list, setList] = useState<RecentCommunity[]>([]);
  useEffect(() => {
    const load = () => setList(readRecentCommunities());
    load();
    window.addEventListener(RECENT_EVENT, load);
    return () => window.removeEventListener(RECENT_EVENT, load);
  }, []);
  if (!list.length) return null;
  return (
    <section className="ox-card rounded-2xl border border-white/10 bg-space-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-white">Visitadas recentemente</h2>
        <button type="button" onClick={clearRecentCommunities} aria-label="Limpar visitadas recentemente" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {list.map((c) => (
          <Link key={c.slug} href={`/comunidades/${c.slug}`} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center">
            <CommunityAvatar name={c.name} url={c.avatarUrl} className="h-16 w-16 text-lg" />
            <span className="line-clamp-2 text-[12px] leading-tight text-white/75">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
