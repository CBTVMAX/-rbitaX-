import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PostComposer } from "@/components/post-composer";
import { PublishButton } from "@/components/publish/publish-provider";
import { PostCard, type FeedPost } from "@/components/post-card";
import { loadSharedEmbeds } from "@/lib/shared-posts";
import { sortMedia } from "@/lib/post-media";
import { FeedStories } from "@/components/personal-stories";
import { FEED_TABS, FEED_TYPES, type FeedTab, type FeedType } from "@/lib/feed";
import { summarizeReactions } from "@/lib/post-reactions";
import { ChevronDown, Check, Plus, SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

const POST_SELECT =
  "id, content, createdAt, editedAt, kind, location, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url, position), sharedPostId, visibility" as const;

const KIND_OF: Record<Exclude<FeedType, "todos">, string> = { fotos: "image", videos: "video", texto: "text", musica: "music" };

type PageTab = FeedTab;

export default async function FeedPage(props: { searchParams: Promise<{ aba?: string; tipo?: string; novo?: string }> }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const sp = await props.searchParams;
  const tab: PageTab = FEED_TABS.some((t) => t.id === sp.aba) ? (sp.aba as PageTab) : "para-voce";
  const type: FeedType = FEED_TYPES.some((t) => t.id === sp.tipo) ? (sp.tipo as FeedType) : "todos";
  const me = current.authId;

  const supabase = await createClient();

  // Quem eu sigo e de quem sou amigo: usado em "Seguindo", no "Seguir" dos posts e nas sugestões.
  const [{ data: followRows }, { data: friendRows }] = await Promise.all([
    supabase.from("Follow").select("followingId").eq("followerId", me),
    supabase.from("Friendship").select("requesterId, addresseeId").eq("status", "accepted").or(`requesterId.eq.${me},addresseeId.eq.${me}`).limit(1000),
  ]);
  const followingIds = new Set((followRows ?? []).map((f) => f.followingId));
  const friendIds = new Set((friendRows ?? []).map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId)));

  // ---------- Publicações da aba escolhida ----------
  let query = supabase.from("Post").select(POST_SELECT).is("communityId", null).eq("isArchived", false);
  if (type !== "todos") query = query.eq("kind", KIND_OF[type]);

  let rows: Awaited<typeof query>["data"] = [];
  if (tab === "salvos") {
    const { data: marks } = await supabase.from("Bookmark").select("postId").eq("userId", me).order("createdAt", { ascending: false }).limit(60);
    const ids = (marks ?? []).map((m) => m.postId);
    if (ids.length) {
      const { data } = await query.in("id", ids);
      const order = new Map(ids.map((id, i) => [id, i]));
      rows = (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
  } else if (tab === "reacoes") {
    // Publicações em que você reagiu, da reação mais recente para a mais antiga.
    const { data: marks } = await supabase.from("Like").select("postId").eq("userId", me).order("createdAt", { ascending: false }).limit(60);
    const ids = (marks ?? []).map((m) => m.postId);
    if (ids.length) {
      const { data } = await query.in("id", ids);
      const order = new Map(ids.map((id, i) => [id, i]));
      rows = (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
  } else if (tab === "amigos") {
    const authors = Array.from(friendIds);
    if (authors.length) {
      const { data } = await query.in("authorId", authors.slice(0, 500)).order("createdAt", { ascending: false }).limit(30);
      rows = data ?? [];
    }
  } else if (tab === "seguindo") {
    const authors = [me, ...followingIds, ...friendIds];
    const { data } = await query.in("authorId", authors.slice(0, 500)).order("createdAt", { ascending: false }).limit(30);
    rows = data ?? [];
  } else {
    const { data } = await query.order("createdAt", { ascending: false }).limit(tab === "para-voce" ? 60 : 30);
    rows = data ?? [];
  }

  // Quem eu bloqueei some do meu feed (o banco já impede o resto do contato).
  const { data: myBlocks } = await supabase.from("Block").select("blockedId").eq("blockerId", me);
  const blockedIds = new Set((myBlocks ?? []).map((b) => b.blockedId));
  if (blockedIds.size) rows = (rows ?? []).filter((p) => !blockedIds.has((p.author as unknown as { id: string } | null)?.id ?? ""));

  const postIds = (rows ?? []).map((p) => p.id);
  const none = Promise.resolve({ data: [] as { postId: string }[] });
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }, { data: savedRows }, shared] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId, userId, reaction").in("postId", postIds) : none,
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", me) : none,
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : none,
    postIds.length ? supabase.from("Bookmark").select("postId").in("postId", postIds).eq("userId", me) : none,
    loadSharedEmbeds(supabase, (rows ?? []).map((p) => p.sharedPostId)),
  ]);

  const reactions = summarizeReactions((likeRows ?? []) as { postId: string; userId?: string; reaction: string | null }[], me);
  const likedSet = new Set((myLikes ?? []).map((l) => l.postId));
  const savedSet = new Set((savedRows ?? []).map((l) => l.postId));
  const commentCountByPost = new Map<string, number>();
  (commentRows ?? []).forEach((c) => commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1));

  let feed: FeedPost[] = (rows ?? []).map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    kind: p.kind,
    location: p.location,
    author: p.author as unknown as FeedPost["author"],
    media: sortMedia(p.media),
    likeCount: reactions.count(p.id),
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
    myReaction: reactions.mine(p.id),
    topReactions: reactions.top(p.id),
    visibility: p.visibility,
    ...(p.sharedPostId ? { shared: shared.get(p.sharedPostId) ?? null } : {}),
  }));

  // "Para você": interação recente pesa mais, e quem você segue ou é amigo ganha destaque.
  if (tab === "para-voce") {
    const now = Date.now();
    const score = (p: FeedPost) => {
      const hours = Math.max(0, (now - new Date(p.createdAt).getTime()) / 3_600_000);
      const close = friendIds.has(p.author.id) || followingIds.has(p.author.id) ? 6 : 0;
      return (1 + p.likeCount * 2 + p.commentCount * 3 + close) / Math.pow(hours + 2, 1.3);
    };
    feed = [...feed].sort((a, b) => score(b) - score(a)).slice(0, 30);
  }

  const tabHref = (id: PageTab) => `/feed${id === "para-voce" ? "" : `?aba=${id}`}${type !== "todos" ? `${id === "para-voce" ? "?" : "&"}tipo=${type}` : ""}`;
  const typeHref = (id: FeedType) => {
    const q = new URLSearchParams();
    if (tab !== "para-voce") q.set("aba", tab);
    if (id !== "todos") q.set("tipo", id);
    const s = q.toString();
    return `/feed${s ? `?${s}` : ""}`;
  };
  const currentType = FEED_TYPES.find((t) => t.id === type)!;
  const showComposerOnMobile = sp.novo === "1";

  const emptyText =
    tab === "reacoes"
      ? "Você ainda não reagiu a nenhuma publicação. As que você curtir aparecem aqui."
      : tab === "amigos"
        ? friendIds.size
          ? "Seus amigos ainda não publicaram nada."
          : "Adicione amigos para ver o que eles publicam."
        : tab === "salvos"
      ? "Você ainda não salvou nenhuma publicação. Toque em Salvar num post para guardar aqui."
      : tab === "seguindo"
        ? "Ainda não há publicações de quem você segue. Siga pessoas para ver o que elas compartilham."
        : "Ainda não há publicações. Seja a primeira pessoa a publicar algo no seu universo.";

  // Menu da direita, como no VK: Feed (com os recortes embaixo), Pesquisa e Reações.
  const menu: { id: PageTab | "pesquisa"; label: string; sub?: boolean; href: string }[] = [
    { id: "para-voce", label: "Feed", href: tabHref("para-voce") },
    { id: "recentes", label: "Recentes", sub: true, href: tabHref("recentes") },
    { id: "amigos", label: "Amigos", sub: true, href: tabHref("amigos") },
    { id: "seguindo", label: "Seguindo", sub: true, href: tabHref("seguindo") },
    { id: "pesquisa", label: "Pesquisa", href: "/explorar" },
  ];
  const menuBottom: { id: PageTab; label: string; href: string }[] = [
    { id: "reacoes", label: "Reações", href: tabHref("reacoes") },
    { id: "salvos", label: "Salvos", href: tabHref("salvos") },
  ];
  const itemCls = (on: boolean, sub = false) =>
    `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${sub ? "pl-6" : ""} ${
      on ? "bg-white/[0.07] font-semibold text-white" : sub ? "text-white/55 hover:bg-white/[0.04] hover:text-white" : "text-white/85 hover:bg-white/[0.04]"
    }`;

  return (
    <div className="mx-auto max-w-[960px] md:px-5 md:py-5 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-4">
      <div className="min-w-0 md:space-y-3">
        {showComposerOnMobile && (
          <div className="px-3 pt-3 md:hidden">
            <PostComposer userId={me} name={current.profile.name} avatarUrl={current.profile.avatarUrl} />
          </div>
        )}

        <FeedStories me={{ id: me, name: current.profile.name, avatarUrl: current.profile.avatarUrl }} />

        {/* Criar: abre o menu de publicar (post, história, foto, vídeo…). */}
        <PublishButton className="ox-card hidden w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-space-surface py-3.5 text-[15px] font-medium text-pa transition hover:border-pa/40 hover:bg-white/[0.03] md:flex">
          <Plus className="h-5 w-5" /> Criar <ChevronDown className="h-4 w-4 opacity-70" />
        </PublishButton>

        {/* Telas médias (sem o menu da direita): abas + filtro de tipo */}
        <div className="ox-card hidden items-center justify-between rounded-2xl border border-white/10 bg-space-surface px-2 md:flex xl:hidden">
          <nav className="flex items-center">
            {FEED_TABS.map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={tabHref(t.id)}
                  className={`relative px-4 py-3.5 text-sm transition ${on ? "font-semibold text-white" : "text-white/55 hover:text-white"}`}
                >
                  {t.label}
                  {on && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-orbit-gradient" />}
                </Link>
              );
            })}
          </nav>
          <TypeFilter current={currentType.label} items={FEED_TYPES.map((t) => ({ id: t.id, label: t.label, href: typeHref(t.id), on: t.id === type }))} />
        </div>

        {/* Celular: filtro de tipo discreto */}
        {type !== "todos" && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/60 md:hidden">
            <span>Mostrando: {currentType.label}</span>
            <Link href={typeHref("todos")} className="font-medium text-orbit-blue">
              Ver todos os tipos
            </Link>
          </div>
        )}

        {feed.length === 0 ? (
          <div className="mx-3 mt-3 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/45 md:mx-0 md:mt-0">{emptyText}</div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={me}
                bleed
                showFollow={!followingIds.has(post.author.id) && !friendIds.has(post.author.id)}
                initiallySaved={savedSet.has(post.id)}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden xl:sticky xl:top-20 xl:block">
        <nav aria-label="Seções do feed" className="ox-card rounded-2xl border border-white/10 bg-space-surface p-2">
          {menu.map((m) =>
            m.id === "para-voce" ? (
              <div key={m.id} className={itemCls(tab === "para-voce")}>
                <Link href={m.href} className="flex-1">
                  {m.label}
                </Link>
                <TypeFilter
                  icon
                  current={currentType.label}
                  items={FEED_TYPES.map((t) => ({ id: t.id, label: t.label, href: typeHref(t.id), on: t.id === type }))}
                />
              </div>
            ) : (
              <Link key={m.id} href={m.href} className={itemCls(tab === m.id, m.sub)}>
                {m.label}
              </Link>
            )
          )}
          <div className="mx-3 my-1.5 h-px bg-white/10" />
          {menuBottom.map((m) => (
            <Link key={m.id} href={m.href} className={itemCls(tab === m.id)}>
              {m.label}
            </Link>
          ))}
        </nav>
        {type !== "todos" && (
          <p className="mt-2 flex items-center justify-between px-3 text-xs text-white/50">
            <span>Mostrando: {currentType.label}</span>
            <Link href={typeHref("todos")} className="font-medium text-pa hover:underline">
              Limpar
            </Link>
          </p>
        )}
      </aside>
    </div>
  );
}

function TypeFilter({ current, items, icon = false }: { current: string; items: { id: string; label: string; href: string; on: boolean }[]; icon?: boolean }) {
  // <details> abre e fecha sem JavaScript; cada opção é um link de verdade.
  return (
    <details className="group relative">
      {icon ? (
        <summary
          aria-label={`Tipo de publicação: ${current}`}
          title="Filtrar por tipo"
          className="flex cursor-pointer list-none items-center rounded-lg p-1 text-white/55 hover:text-white [&::-webkit-details-marker]:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </summary>
      ) : (
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/75 hover:text-white [&::-webkit-details-marker]:hidden">
          {current}
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
      )}
      <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
        {items.map((i) => (
          <Link key={i.id} href={i.href} className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 ${i.on ? "font-semibold text-white" : "text-white/75"}`}>
            {i.label}
            {i.on && <Check className="h-4 w-4 text-orbit-blue" />}
          </Link>
        ))}
      </div>
    </details>
  );
}
