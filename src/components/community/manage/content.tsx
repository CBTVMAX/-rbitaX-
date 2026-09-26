"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Images, Loader2, Lock, LockOpen, MessagesSquare, Pin, PinOff, ScrollText, Trash2 } from "lucide-react";
import { loadCommunityPosts } from "@/lib/community-data";
import { ago as timeAgo } from "@/lib/communities";
import { communityError, DISCUSSION_COLUMNS, rank, type CommunityPost, type Discussion } from "@/lib/communities";
import { useCommunity } from "../context";
import { CommunityPostCard } from "../post-card";
import { Confirm, EmptyState } from "../ui";
import { Card, SubTabs } from "./fields";

type Tab = "fixados" | "publicacoes" | "discussoes";

export function ContentSection() {
  const { community, role, supabase, viewer, toast } = useCommunity();
  const admin = rank(role) >= 3;
  const base = `/comunidades/${community.slug}`;
  const [tab, setTab] = useState<Tab>("fixados");
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [done, setDone] = useState(false);
  const [topics, setTopics] = useState<Discussion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState<Discussion | null>(null);

  useEffect(() => {
    if (tab === "discussoes") {
      setTopics(null);
      supabase
        .from("CommunityDiscussion")
        .select(DISCUSSION_COLUMNS)
        .eq("communityId", community.id)
        .eq("status", "visible")
        .order("isPinned", { ascending: false })
        .order("lastActivityAt", { ascending: false })
        .limit(100)
        .then(({ data }) => setTopics((data ?? []) as unknown as Discussion[]));
      return;
    }
    setPosts(null);
    loadCommunityPosts(supabase, community.id, viewer?.id ?? null, tab === "fixados" ? { pinned: true, limit: 10 } : { limit: 20 }).then((r) => {
      setPosts(r);
      setDone(tab === "fixados" || r.length < 20);
    });
  }, [tab, supabase, community.id, viewer?.id]);

  async function more() {
    if (!posts?.length) return;
    const r = await loadCommunityPosts(supabase, community.id, viewer?.id ?? null, { limit: 20, before: posts[posts.length - 1].createdAt });
    setPosts([...posts, ...r]);
    if (r.length < 20) setDone(true);
  }

  async function topicAction(t: Discussion, a: "pin" | "unpin" | "close" | "open" | "delete") {
    setBusy(t.id + a);
    const { error } = await supabase.rpc("community_discussion_action", { p_discussion: t.id, p_action: a });
    setBusy(null);
    setDel(null);
    if (error) return toast(communityError(error.message), true);
    if (a === "delete") setTopics((l) => (l ?? []).filter((x) => x.id !== t.id));
    else setTopics((l) => (l ?? []).map((x) => (x.id === t.id ? { ...x, isPinned: a === "pin" ? true : a === "unpin" ? false : x.isPinned, isClosed: a === "close" ? true : a === "open" ? false : x.isClosed } : x)));
    toast({ pin: "Discussão fixada.", unpin: "Discussão desafixada.", close: "Discussão fechada.", open: "Discussão reaberta.", delete: "Discussão excluída." }[a]);
  }

  const loading = (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-white/40" />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card
        title="Conteúdo"
        desc="Fixe até 3 publicações no topo, edite, remova ou exclua. Use o menu ••• de cada publicação."
        right={
          <Link href={`${base}?aba=fotos`} className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-semibold text-white/80 hover:bg-white/5">
            <Images className="h-4 w-4" /> Álbuns
          </Link>
        }
      >
        <SubTabs
          tabs={[
            { id: "fixados" as Tab, label: "Fixados" },
            { id: "publicacoes" as Tab, label: "Todas as publicações" },
            { id: "discussoes" as Tab, label: "Discussões" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Card>

      {tab === "discussoes" ? (
        topics === null ? (
          loading
        ) : topics.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Nenhuma discussão" />
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">
            {topics.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <Link href={`${base}/discussoes/${t.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {t.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
                    <span className="truncate">{t.title}</span>
                    {t.isClosed && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                  </span>
                  <span className="block truncate text-xs text-white/45">
                    {t.author.name} · {t.replyCount} respostas · {timeAgo(t.lastActivityAt)}
                  </span>
                </Link>
                <div className="flex shrink-0 gap-1.5">
                  {admin && (
                    <button type="button" onClick={() => topicAction(t, t.isPinned ? "unpin" : "pin")} disabled={!!busy} aria-label={t.isPinned ? "Desafixar" : "Fixar"} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white">
                      {t.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  )}
                  <button type="button" onClick={() => topicAction(t, t.isClosed ? "open" : "close")} disabled={!!busy} aria-label={t.isClosed ? "Reabrir" : "Fechar"} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white">
                    {t.isClosed ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>
                  {admin && (
                    <button type="button" onClick={() => setDel(t)} aria-label="Excluir" className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : posts === null ? (
        loading
      ) : posts.length === 0 ? (
        <EmptyState
          icon={tab === "fixados" ? <Pin className="h-6 w-6" /> : <ScrollText className="h-6 w-6" />}
          title={tab === "fixados" ? "Nenhuma publicação fixada" : "Nenhuma publicação ainda"}
          text={tab === "fixados" ? "Abra o menu ••• de uma publicação e toque em Fixar no topo." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <CommunityPostCard
              key={p.id}
              post={p}
              onChanged={(n) => setPosts((l) => (tab === "fixados" && !n.isPinned ? (l ?? []).filter((x) => x.id !== n.id) : (l ?? []).map((x) => (x.id === n.id ? n : x))))}
              onDeleted={(id) => setPosts((l) => (l ?? []).filter((x) => x.id !== id))}
            />
          ))}
          {!done && (
            <button type="button" onClick={more} className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
              Carregar mais
            </button>
          )}
        </div>
      )}

      <Confirm
        open={!!del}
        title="Excluir esta discussão?"
        message="O tópico e todas as respostas serão apagados para sempre."
        confirmLabel="Excluir"
        busy={!!busy}
        onClose={() => setDel(null)}
        onConfirm={() => del && topicAction(del, "delete")}
      />
    </div>
  );
}
