"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ChevronRight, Heart, Loader2, Lock, MessagesSquare, Pin, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { ago, can, categoryOf, DISCUSSION_CATEGORIES, DISCUSSION_COLUMNS, type Discussion, type DiscussionCategory } from "@/lib/communities";
import { useCommunity } from "../context";
import { useCreateFlow } from "../create-flow";
import { MutedNotice, SubpageFrame } from "../subpage";
import { EmptyState } from "../ui";

type Sort = "ativas" | "recentes" | "curtidas";
const PAGE = 25;

export function DiscussionRow({ d, slug, community }: { d: Discussion; slug: string; community?: { name: string; avatarUrl: string | null } }) {
  const c = categoryOf(d.category);
  const asComm = d.authorType === "community" && !!community;
  const authorName = asComm ? community!.name : d.author.name;
  const authorAvatar = asComm ? community!.avatarUrl : d.author.avatarUrl;
  return (
    <Link href={`/comunidades/${slug}/discussoes/${d.id}`} className="flex items-start gap-3 rounded-3xl border border-white/[0.08] bg-space-card/80 p-3.5 transition hover:border-orbit-purple/40">
      <Avatar name={authorName} url={authorAvatar} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/70">
            {c.emoji} {c.label}
          </span>
          {d.isPinned && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orbit-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-orbit-cyan">
              <Pin className="h-3 w-3" /> Fixada
            </span>
          )}
          {d.isClosed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
              <Lock className="h-3 w-3" /> Fechada
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 block text-[15px] font-semibold leading-snug text-white">{d.title}</span>
        {d.body && <span className="mt-0.5 line-clamp-1 block text-xs text-white/50">{d.body}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
          <span>{authorName}</span>
          <span className="inline-flex items-center gap-1">
            <MessagesSquare className="h-3.5 w-3.5" /> {d.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {d.likeCount}
          </span>
          <span>atividade {ago(d.lastActivityAt)}</span>
        </span>
      </span>
      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/30" />
    </Link>
  );
}

export function DiscussionsView({ canSee, initial, initialCategory }: { canSee: boolean; initial: Discussion[]; initialCategory: DiscussionCategory | null }) {
  const { supabase, community, viewer, role, membership } = useCommunity();
  const router = useRouter();
  const [category, setCategory] = useState<DiscussionCategory | null>(initialCategory);
  const [sort, setSort] = useState<Sort>("ativas");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Discussion[] | null>(initial);
  const [done, setDone] = useState(initial.length < PAGE);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const flow = useCreateFlow({ onCreated: (r) => (r.status === "visible" ? router.push(`/comunidades/${community.slug}/discussoes/${r.id}`) : router.refresh()) });
  const canCreate = !!viewer && can(community, role, "discussion") && !membership?.muted;

  async function fetchPage(offset: number) {
    let q = supabase.from("CommunityDiscussion").select(DISCUSSION_COLUMNS).eq("communityId", community.id).eq("status", "visible");
    if (category) q = q.eq("category", category);
    if (query.trim()) q = q.ilike("title", `%${query.trim().replace(/[%_]/g, "")}%`);
    q = q.order("isPinned", { ascending: false });
    q = sort === "curtidas" ? q.order("likeCount", { ascending: false }) : sort === "recentes" ? q.order("createdAt", { ascending: false }) : q.order("lastActivityAt", { ascending: false });
    const { data } = await q.range(offset, offset + PAGE - 1);
    return (data ?? []) as unknown as Discussion[];
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setItems(null);
      const r = await fetchPage(0);
      if (!alive) return;
      setItems(r);
      setDone(r.length < PAGE);
    }, query ? 300 : 0);
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("categoria", category);
    else url.searchParams.delete("categoria");
    window.history.replaceState(window.history.state, "", url.toString());
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, query]);

  async function more() {
    if (!items || loading) return;
    setLoading(true);
    const r = await fetchPage(items.length);
    setLoading(false);
    setItems([...items, ...r]);
    if (r.length < PAGE) setDone(true);
  }

  return (
    <SubpageFrame
      title="Discussões"
      icon="💬"
      canSee={canSee}
      action={
        canCreate && canSee ? (
          <button type="button" onClick={() => flow.start("discussion")} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova discussão</span>
            <span className="sm:hidden">Nova</span>
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <MutedNotice />
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-2.5">
          <Search className="h-4 w-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pelo título" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <button type="button" onClick={() => setCategory(null)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", !category ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
            Todas
          </button>
          {DISCUSSION_CATEGORIES.filter((c) => c.id !== "geral").map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", category === c.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              {c.emoji} {c.label}
            </button>
          ))}
          <button type="button" onClick={() => setCategory("geral")} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", category === "geral" ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
            💬 Geral
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="mr-1 text-white/40">Ordenar:</span>
          {(
            [
              ["ativas", "Mais ativas"],
              ["recentes", "Mais recentes"],
              ["curtidas", "Mais curtidas"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSort(id)} className={clsx("rounded-full px-3 py-1.5 font-semibold", sort === id ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>
              {label}
            </button>
          ))}
        </div>
        {items === null ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/[0.04]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare className="h-6 w-6" />}
            title={query || category ? "Nada encontrado" : "Nenhuma discussão ainda"}
            text={query || category ? "Tente outra busca ou categoria." : "Abra um tópico: apresente-se, sugira algo ou peça ajuda."}
            action={
              canCreate ? (
                <button type="button" onClick={() => flow.start("discussion")} className="rounded-full bg-orbit-gradient px-5 py-2.5 text-xs font-semibold text-snow">
                  Criar discussão
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((d) => (
              <DiscussionRow key={d.id} d={d} slug={community.slug} community={community} />
            ))}
            {!done && (
              <button type="button" onClick={more} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
      {flow.element}
    </SubpageFrame>
  );
}
