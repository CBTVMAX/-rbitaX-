"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Hash, Loader2, Search } from "lucide-react";
import { subjectHashtag, subjectSlug, type CommunitySubject } from "@/lib/communities";
import { timeAgo } from "@/lib/format";
import { useCommunity } from "../context";
import { EmptyState } from "../ui";

type PostRow = { id: string; kind: string; content: string; createdAt: string; authorId: string; authorType: string };

/** Busca dentro da comunidade: escolhe um assunto (ator/personagem) e vê as publicações marcadas. */
export function SubjectsBrowser({ canSee, initialSlug = "" }: { canSee: boolean; initialSlug?: string }) {
  const { supabase, community } = useCommunity();
  const suffix = community.hashtagSuffix ?? "";
  const [subjects, setSubjects] = useState<CommunitySubject[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CommunitySubject | null>(null);
  const [posts, setPosts] = useState<PostRow[] | null>(null);

  useEffect(() => {
    if (!canSee) return;
    supabase.rpc("community_hashtags", { p_community: community.id }).then(({ data }) => {
      const list = (data ?? []) as CommunitySubject[];
      setSubjects(list);
      if (initialSlug) {
        const found = list.find((s) => s.slug === subjectSlug(initialSlug));
        if (found) setSelected(found);
      }
    });
  }, [supabase, community.id, canSee, initialSlug]);

  const loadPosts = useCallback(
    async (s: CommunitySubject) => {
      setPosts(null);
      const { data } = await supabase.rpc("community_hashtag_posts", { p_community: community.id, p_slug: s.slug, p_limit: 50, p_offset: 0 });
      setPosts((data ?? []) as PostRow[]);
    },
    [supabase, community.id]
  );

  useEffect(() => {
    if (selected) loadPosts(selected);
  }, [selected, loadPosts]);

  const filtered = useMemo(() => {
    if (!subjects) return [];
    const q = subjectSlug(query);
    if (!q) return subjects;
    return subjects.filter((s) => s.slug.includes(q) || s.label.toLowerCase().includes(query.toLowerCase()));
  }, [subjects, query]);

  if (!canSee) return null;

  if (!subjects) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  // Detalhe de um assunto: lista das publicações marcadas.
  if (selected) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => (setSelected(null), setPosts(null))}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Todos os assuntos
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orbit-purple/15 px-2.5 py-1 text-sm font-semibold text-orbit-cyan">{subjectHashtag(selected.label, suffix)}</span>
        </div>
        {posts === null ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
        ) : posts.length === 0 ? (
          <EmptyState icon={<Hash className="h-6 w-6" />} title="Nada por aqui ainda" text="Nenhuma publicação com este assunto. Ao publicar, toque no chip do assunto para marcá-la." />
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/comunidades/${community.slug}?post=${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3 transition hover:border-orbit-purple/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{p.content?.trim() || "(sem texto)"}</span>
                    <span className="text-[11px] text-white/40">{timeAgo(p.createdAt)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Lista de assuntos + busca.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar assunto por nome…"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>

      {subjects.length === 0 ? (
        <EmptyState icon={<Hash className="h-6 w-6" />} title="Sem assuntos ainda" text="A moderação ainda não cadastrou assuntos (ator, personagem, tema) nesta comunidade." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Nenhum assunto encontrado" text="Tente outro nome." />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelected(s)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3 text-left transition hover:border-orbit-purple/40"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-purple/15 text-orbit-cyan">
                  <Hash className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{s.label}</span>
                  <span className="block truncate text-[11px] text-orbit-cyan">{subjectHashtag(s.label, suffix)}</span>
                </span>
                <span className="shrink-0 text-xs text-white/40">{s.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
