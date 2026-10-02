"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Heart, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compactNumber, reactionOf, REACTIONS, type ReactionKey } from "@/lib/communities";
import { Avatar } from "@/components/post-card";
import { Sheet } from "@/components/community/ui";

export type { ReactionKey };

/** Tap = ❤️ (or remove); press and hold / hover = pick one of the 7 reactions. */
/** `label`: versão com texto ("Curtir", "Haha"…) para a barra de ações do computador, sem o contador. */
export function ReactionButton({
  mine,
  count,
  top,
  onPick,
  onShowList,
  label = false,
}: {
  mine: ReactionKey | null;
  count: number;
  top: ReactionKey[];
  onPick: (r: ReactionKey | null) => void;
  onShowList: () => void;
  label?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const clear = () => timer.current && clearTimeout(timer.current);
  const current = mine ? reactionOf(mine) : null;
  return (
    <span className="relative flex items-center" onMouseLeave={() => (clear(), setOpen(false))}>
      {open && (
        <span role="menu" className="animate-pop-in absolute bottom-full left-0 z-20 mb-2 flex gap-0.5 rounded-full border border-white/10 bg-space-surface/95 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="menuitem"
              aria-label={r.label}
              title={r.label}
              onClick={() => (setOpen(false), onPick(mine === r.key ? null : r.key))}
              className={clsx("flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:-translate-y-1 hover:scale-125", mine === r.key && "bg-white/15")}
            >
              {r.emoji}
            </button>
          ))}
        </span>
      )}
      <button
        type="button"
        aria-pressed={!!mine}
        aria-label={mine ? `Sua reação: ${current?.label}. Toque para remover` : "Curtir (segure para mais reações)"}
        onMouseEnter={() => {
          clear();
          timer.current = setTimeout(() => setOpen(true), 450);
        }}
        onTouchStart={() => {
          long.current = false;
          clear();
          timer.current = setTimeout(() => ((long.current = true), setOpen(true)), 420);
        }}
        onTouchEnd={(e) => {
          clear();
          if (long.current) e.preventDefault();
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (long.current) return (long.current = false);
          setOpen(false);
          onPick(mine ? null : "like");
        }}
        className={clsx("flex min-h-[40px] select-none items-center gap-1.5 rounded-full px-3 transition hover:bg-white/5", mine && (mine === "like" ? "text-orbit-pink" : "text-white"))}
      >
        {current && mine !== "like" ? <span className="text-[18px] leading-none">{current.emoji}</span> : <Heart className={clsx("h-[18px] w-[18px]", mine && "fill-orbit-pink")} />}
        {label && <span className="text-[13px] font-medium">{current ? current.label : "Curtir"}</span>}
      </button>
      {/* Como no app do VK: um ícone só e o número ao lado; tocar no número mostra quem reagiu. */}
      {!label && (
      <button
        type="button"
        onClick={onShowList}
        disabled={!count}
        aria-label={count ? `Ver quem reagiu (${count})` : undefined}
        title={count && top.length ? top.map((t) => reactionOf(t).emoji).join(" ") : undefined}
        className={clsx(
          "-ml-1.5 flex min-h-[40px] items-center rounded-full pr-2 text-[15px] tabular-nums disabled:cursor-default",
          mine === "like" ? "text-orbit-pink" : mine ? "text-white" : ""
        )}
      >
        {count > 0 && compactNumber(count)}
      </button>
      )}
    </span>
  );
}

type Reactor = { reaction: ReactionKey; user: { id: string; name: string; username: string; avatarUrl: string | null } };

/** Quem reagiu, com abas por emoji. Carrega sozinho quando abre. */
export function ReactorsSheet({ open, onClose, postId, total }: { open: boolean; onClose: () => void; postId: string; total: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [reactors, setReactors] = useState<Reactor[] | null>(null);
  const [tab, setTab] = useState<ReactionKey | "all">("all");

  useEffect(() => {
    if (!open) return;
    setTab("all");
    setReactors(null);
    supabase
      .from("Like")
      .select("reaction, user:User!Like_userId_fkey(id, name, username, avatarUrl)")
      .eq("postId", postId)
      .order("createdAt", { ascending: false })
      .limit(300)
      .then(({ data }) => setReactors(((data ?? []) as unknown as Reactor[]).filter((r) => r.user)));
  }, [open, postId, supabase]);

  return (
    <Sheet open={open} onClose={onClose} title={`Reações · ${total}`}>
      {reactors === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
            <button type="button" onClick={() => setTab("all")} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", tab === "all" ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              Todas {reactors.length}
            </button>
            {REACTIONS.filter((r) => reactors.some((x) => x.reaction === r.key)).map((r) => (
              <button key={r.key} type="button" onClick={() => setTab(r.key)} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", tab === r.key ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
                {r.emoji} {reactors.filter((x) => x.reaction === r.key).length}
              </button>
            ))}
          </div>
          <div className="space-y-0.5">
            {reactors
              .filter((r) => tab === "all" || r.reaction === tab)
              .map((r) => (
                <Link key={r.user.id} href={`/perfil/${r.user.username}`} className="flex min-h-[46px] items-center gap-3 rounded-2xl px-2 hover:bg-white/[0.04]">
                  <Avatar name={r.user.name} url={r.user.avatarUrl} size={38} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{r.user.name}</span>
                  <span className="text-xl">{reactionOf(r.reaction).emoji}</span>
                </Link>
              ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
