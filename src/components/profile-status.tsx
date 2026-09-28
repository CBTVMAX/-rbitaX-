"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Crown, Plus } from "lucide-react";
import { CoinIcon, formatCoins } from "@/components/coins";
import type { LevelInfo } from "@/lib/level";

type Stats = { posts: number; followers: number; friends: number; communities: number };

/**
 * Bloco compacto de status do perfil no mobile (como a referência):
 * Nível + Diamantes lado a lado e Órbita Premium abaixo. O Nível é clicável e
 * mostra de onde vem o XP (dados reais).
 */
export function ProfileStatus({
  level,
  coins,
  isPremium,
  isMe,
  stats,
}: {
  level: LevelInfo;
  coins: number | null;
  isPremium: boolean;
  isMe: boolean;
  stats: Stats;
}) {
  const [open, setOpen] = useState(false);

  const nivel = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="flex w-full flex-col rounded-2xl border border-orbit-pink/40 bg-space-surface/80 p-3 text-left shadow-[0_0_18px_rgba(236,72,153,0.12)] transition hover:border-orbit-pink/60"
    >
      <span className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow shadow-glow">
          <span className="text-xs font-bold leading-none">{level.level}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-orbit-pink">Nível {level.level}</span>
        </span>
        <ChevronRight className={clsx("h-4 w-4 shrink-0 text-white/40 transition", open && "rotate-90")} />
      </span>
      <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-orbit-gradient" style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </span>
      <span className="mt-1 block text-[11px] text-white/55">
        {level.xpIntoLevel.toLocaleString("pt-BR")} / {level.xpForNext.toLocaleString("pt-BR")} XP
      </span>
    </button>
  );

  const diamantes = isMe ? (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-orbit-blue/40 bg-space-surface/80 p-3">
      <div className="flex items-center gap-2">
        <CoinIcon className="h-7 w-7" />
        <div>
          <p className="text-lg font-bold leading-none text-orbit-cyan">{formatCoins(coins ?? 0)}</p>
          <p className="mt-1 text-[11px] text-white/55">Diamantes</p>
        </div>
      </div>
      <Link href="/loja" aria-label="Obter mais Diamantes" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:opacity-90">
        <Plus className="h-4 w-4" />
      </Link>
    </div>
  ) : null;

  return (
    <div className="space-y-2">
      <div className={clsx(isMe && "grid grid-cols-[1.35fr_1fr] gap-2")}>
        {nivel}
        {diamantes}
      </div>

      {open && (
        <div className="rounded-2xl border border-white/10 bg-space-bg/40 p-3 text-[11px] text-white/60">
          <p className="mb-1 font-semibold text-white/80">De onde vem seu XP</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span>{stats.posts.toLocaleString("pt-BR")} publicações</span>
            <span>{stats.followers.toLocaleString("pt-BR")} seguidores</span>
            <span>{stats.friends.toLocaleString("pt-BR")} amizades</span>
            <span>{stats.communities.toLocaleString("pt-BR")} comunidades</span>
          </div>
          <p className="mt-2 text-white/40">Total: {level.totalXp.toLocaleString("pt-BR")} XP · quanto mais você participa, mais sobe.</p>
        </div>
      )}

      {isMe && (
        <Link
          href="/loja"
          className={clsx(
            "flex items-center gap-3 rounded-2xl border p-3 transition",
            isPremium ? "border-amber-400/40 bg-gradient-to-r from-amber-400/[0.08] to-orbit-purple/[0.06]" : "border-amber-400/30 bg-space-surface/80 hover:border-amber-400/50"
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-orbit-purple/20 text-amber-300">
            <Crown className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-amber-300">ÓRBITA PREMIUM</span>
            <span className="block text-[11px] text-white/55">{isPremium ? "Premium ativo · Perfil personalizado" : "Perfil personalizado e vantagens"}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
        </Link>
      )}
    </div>
  );
}
