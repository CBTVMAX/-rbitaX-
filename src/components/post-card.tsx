"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, initials } from "@/lib/format";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pin, PinOff, Repeat2, Pencil, Trash2, Link2, Check, X, Loader2, Archive, ArchiveRestore, Globe2, Users, Lock, ChevronRight, MapPin } from "lucide-react";
import type { SharedEmbed } from "@/lib/shared-posts";
import { clsx } from "clsx";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostMedia } from "@/components/post-media";
import { RichText } from "@/lib/rich-text";

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  kind: string;
  author: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean };
  media: { id: string; type: string; url: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  /** Repost of a community publication: undefined = not a repost, null = original no longer available. */
  shared?: SharedEmbed | null;
  /** "public" | "followers" | "private" — aplicado pelo banco (RLS) para quem está vendo. */
  visibility?: string;
  isArchived?: boolean;
  /** Local marcado na publicação (opcional). */
  location?: string | null;
};

const VISIBILITY: { id: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "public", label: "Público", hint: "Qualquer pessoa", icon: Globe2 },
  { id: "followers", label: "Seguidores", hint: "Só quem segue você", icon: Users },
  { id: "private", label: "Somente eu", hint: "Só você vê", icon: Lock },
];

type CommentRow = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string; username: string; avatarUrl: string | null };
};

/** Texto do post com "Ver mais": posts longos aparecem recolhidos até uma altura e expandem ao tocar. */
function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflow(el.scrollHeight > el.clientHeight + 4);
  }, [text, expanded]);

  return (
    <div className="mb-3">
      <div ref={ref} className={clsx("whitespace-pre-wrap text-sm leading-relaxed text-white/90", !expanded && "max-h-60 overflow-hidden")}>
        <RichText text={text} />
      </div>
      {(overflow || expanded) && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-0.5 text-sm font-semibold text-orbit-cyan hover:underline">
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  pinned = false,
  canPin = false,
  showFollow = false,
  bleed = false,
  initiallySaved = false,
}: {
  post: FeedPost;
  currentUserId: string;
  pinned?: boolean;
  canPin?: boolean;
  /** Mostra "Seguir" ao lado do autor (feed: quem você ainda não segue). */
  showFollow?: boolean;
  /** Celular: publicação de ponta a ponta, sem moldura (estilo app). */
  bleed?: boolean;
  initiallySaved?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const isAuthor = currentUserId === post.author.id;
  const [content, setContent] = useState(post.content);
  const [edited, setEdited] = useState(!!post.editedAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState(post.visibility ?? "public");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [archived, setArchived] = useState(!!post.isArchived);

  async function changeVisibility(next: string) {
    setPrivacyOpen(false);
    setMenuOpen(false);
    if (next === visibility) return;
    const prev = visibility;
    setVisibility(next);
    const { error } = await supabase.from("Post").update({ visibility: next }).eq("id", post.id);
    if (error) setVisibility(prev);
  }

  async function toggleArchive() {
    setMenuOpen(false);
    const next = !archived;
    const { error } = await supabase.from("Post").update({ isArchived: next }).eq("id", post.id);
    if (error) return;
    setArchived(next);
    // Arquivar tira do perfil e do feed (e solta o fixado, se for o caso).
    if (next && pinned) await supabase.from("User").update({ pinnedPostId: null }).eq("id", currentUserId);
    setRemoved(true);
    router.refresh();
  }

  async function togglePin() {
    setPinBusy(true);
    const { error } = await supabase
      .from("User")
      .update({ pinnedPostId: pinned ? null : post.id })
      .eq("id", currentUserId);
    setPinBusy(false);
    setMenuOpen(false);
    if (!error) router.refresh();
  }

  async function saveEdit() {
    const text = draft.trim();
    if (!text && post.media.length === 0) return; // não deixa post vazio sem mídia
    setSaving(true);
    const { error } = await supabase
      .from("Post")
      .update({ content: text, editedAt: new Date().toISOString() })
      .eq("id", post.id);
    setSaving(false);
    if (!error) {
      setContent(text);
      setEdited(true);
      setEditing(false);
    }
  }

  async function removePost() {
    setDeleting(true);
    const { error } = await supabase.from("Post").delete().eq("id", post.id);
    setDeleting(false);
    setConfirmDelete(false);
    setMenuOpen(false);
    if (!error) {
      setRemoved(true);
      router.refresh();
    }
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      const url = `${window.location.origin}/perfil/${post.author.username}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const [follow, setFollow] = useState<"none" | "following" | "requested">("none");
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("Bookmark").insert({ id: crypto.randomUUID(), postId: post.id, userId: currentUserId })
      : await supabase.from("Bookmark").delete().eq("postId", post.id).eq("userId", currentUserId);
    if (error && error.code !== "23505") setSaved(!next); // 23505 = já estava salvo
  }

  async function followAuthor() {
    if (follow !== "none") return;
    setFollow("following");
    const { data, error } = await supabase
      .from("Follow")
      .insert({ id: crypto.randomUUID(), followerId: currentUserId, followingId: post.author.id })
      .select("status")
      .maybeSingle();
    if (error && error.code !== "23505") setFollow("none");
    else if (data?.status === "pending") setFollow("requested");
  }

  async function share() {
    const url = `${window.location.origin}/perfil/${post.author.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${post.author.name} no ÓrbitaX`, text: content.slice(0, 120), url });
        return;
      } catch {
        // cancelado: copia o link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copiado!");
    } catch {
      setShareNote("Não foi possível copiar o link.");
    }
    setTimeout(() => setShareNote(null), 2000);
  }

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase.from("Like").delete().eq("postId", post.id).eq("userId", currentUserId);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("Like").insert({
        id: crypto.randomUUID(),
        postId: post.id,
        userId: currentUserId,
      });
    }
    setBusy(false);
  }

  async function loadComments() {
    setShowComments((s) => !s);
    if (comments) return;
    const { data } = await supabase
      .from("Comment")
      .select("id, content, createdAt, user:User(name, username, avatarUrl)")
      .eq("postId", post.id)
      .order("createdAt", { ascending: true });
    setComments(((data as unknown) as CommentRow[]) ?? []);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    const { data } = await supabase
      .from("Comment")
      .insert({ id: crypto.randomUUID(), postId: post.id, userId: currentUserId, content: text, updatedAt: new Date().toISOString() })
      .select("id, content, createdAt, user:User(name, username, avatarUrl)")
      .single();
    if (data) {
      setComments((c) => [...(c ?? []), (data as unknown) as CommentRow]);
      setCommentCount((c) => c + 1);
    }
  }

  if (removed) return null;

  return (
    <article
      className={clsx(
        "ox-card ox-post border-white/10 bg-space-card",
        bleed ? "border-y px-0 py-3 md:rounded-2xl md:border md:p-5" : "rounded-2xl border p-4 md:p-5"
      )}
    >
      {pinned && (
        <p className={clsx("mb-2 flex items-center gap-1 text-[11px] font-medium text-white/50", bleed && "px-4 md:px-0")}>
          <Pin className="h-3 w-3 text-orbit-cyan" /> Fixado
        </p>
      )}
      <div className={clsx("mb-3 flex items-center gap-3", bleed && "px-4 md:px-0")}>
        <Link href={`/perfil/${post.author.username}`}>
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
        </Link>
        <div className="min-w-0">
          <Link href={`/perfil/${post.author.username}`} className="flex items-center gap-1 text-sm font-semibold text-white hover:underline">
            {post.author.name}
            {post.author.isVerified && <VerifiedBadge />}
          </Link>
          <p className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-white/45">
            <span className="hidden md:inline">@{post.author.username} ·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {edited && <span>· editada</span>}
            {post.location && (
              <span className="flex min-w-0 items-center gap-0.5">
                · <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{post.location}</span>
              </span>
            )}
            <span className="flex items-center gap-0.5" title={visibility === "followers" ? "Visível para seguidores" : visibility === "private" ? "Visível só para você" : "Público"}>
              ·{" "}
              {visibility === "followers" ? <Users className="h-3 w-3" /> : visibility === "private" ? <Lock className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
              <span className="hidden sm:inline">{visibility === "followers" ? "Seguidores" : visibility === "private" ? "Somente eu" : "Público"}</span>
            </span>
          </p>
        </div>
        {showFollow && !isAuthor && follow !== "following" && (
          <button
            type="button"
            onClick={followAuthor}
            disabled={follow !== "none"}
            className="ml-auto shrink-0 rounded-xl bg-white/[0.08] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.14] disabled:opacity-70"
          >
            {follow === "requested" ? "Solicitado" : "Seguir"}
          </button>
        )}
        <div className={clsx("relative", !(showFollow && !isAuthor && follow !== "following") && "ml-auto")}>
          <button
            type="button"
            onClick={() => { setMenuOpen((v) => !v); setPrivacyOpen(false); }}
            aria-label="Opções da publicação"
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-space-surface shadow-2xl">
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => { setDraft(content); setEditing(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
                  >
                    <Pencil className="h-4 w-4" /> Editar publicação
                  </button>
                )}
                {canPin && (
                  <button
                    type="button"
                    onClick={togglePin}
                    disabled={pinBusy}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5 disabled:opacity-50"
                  >
                    {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {pinned ? "Desafixar do perfil" : "Fixar no perfil"}
                  </button>
                )}
                {isAuthor && !archived && (
                  <button
                    type="button"
                    onClick={() => setPrivacyOpen((v) => !v)}
                    aria-expanded={privacyOpen}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
                  >
                    {(() => {
                      const V = VISIBILITY.find((v) => v.id === visibility) ?? VISIBILITY[0];
                      return <V.icon className="h-4 w-4" />;
                    })()}
                    Alterar privacidade
                    <ChevronRight className={clsx("ml-auto h-4 w-4 text-white/40 transition", privacyOpen && "rotate-90")} />
                  </button>
                )}
                {privacyOpen && (
                  <div className="border-y border-white/5 bg-space-bg/40 py-1">
                    {VISIBILITY.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => changeVisibility(v.id)}
                        className="flex w-full items-center gap-2.5 py-2 pl-8 pr-4 text-left text-sm text-white/80 hover:bg-white/5"
                      >
                        <v.icon className="h-3.5 w-3.5" />
                        <span className="min-w-0 flex-1">
                          {v.label}
                          <span className="block text-[11px] text-white/40">{v.hint}</span>
                        </span>
                        {visibility === v.id && <Check className="h-4 w-4 text-orbit-cyan" />}
                      </button>
                    ))}
                  </div>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    onClick={toggleArchive}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
                  >
                    {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {archived ? "Desarquivar" : "Arquivar"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />} {copied ? "Link copiado!" : "Copiar link"}
                </button>
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 border-t border-white/10 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/5"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir publicação
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={clsx(bleed && "px-4 md:px-0")}>
      {editing ? (
        <div className="mb-3">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-sm text-white outline-none focus:border-orbit-purple/60"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button type="button" onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-snow shadow-glow disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
            </button>
          </div>
        </div>
      ) : (
        content && <ExpandableText text={content} />
      )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-space-surface p-5 text-center shadow-2xl">
            <Trash2 className="mx-auto mb-2 h-7 w-7 text-red-400" />
            <p className="text-sm font-semibold text-white">Excluir esta publicação?</p>
            <p className="mt-1 text-xs text-white/55">Isso não pode ser desfeito.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 rounded-full border border-white/15 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                Cancelar
              </button>
              <button type="button" onClick={removePost} disabled={deleting} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500/90 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {post.shared !== undefined && (
        <div className={clsx(bleed && "px-4 md:px-0")}>
          <SharedCard shared={post.shared} />
        </div>
      )}

      {post.media.length > 0 && (
        // No celular (bleed) a foto vai de ponta a ponta, sem cantos arredondados.
        <div className={clsx(bleed && "max-md:[&_.rounded-xl]:rounded-none max-md:[&_.rounded-lg]:rounded-none")}>
          <PostMedia media={post.media} />
        </div>
      )}

      {/* Celular: ícones com números (estilo app). Computador: resumo + ações com nome (mockup). */}
      <div className={clsx("mt-1", bleed && "px-4 md:px-0")}>
        <div className="flex items-center gap-1 pt-2 text-white/60 md:hidden">
          <button type="button" onClick={toggleLike} aria-label="Curtir" className={clsx("flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition", liked ? "text-orbit-pink" : "hover:text-white")}>
            <Heart className={clsx("h-[22px] w-[22px]", liked && "fill-orbit-pink")} />
            {likeCount > 0 && likeCount}
          </button>
          <button type="button" onClick={loadComments} aria-label="Comentar" className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition hover:text-white">
            <MessageCircle className="h-[22px] w-[22px]" />
            {commentCount > 0 && commentCount}
          </button>
          <button type="button" onClick={share} aria-label="Compartilhar" className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition hover:text-white">
            <Share2 className="h-[22px] w-[22px]" />
          </button>
          <button type="button" onClick={toggleSave} aria-label={saved ? "Remover dos salvos" : "Salvar"} className={clsx("ml-auto rounded-full px-2.5 py-1.5 transition", saved ? "text-orbit-blue" : "hover:text-white")}>
            <Bookmark className={clsx("h-[22px] w-[22px]", saved && "fill-current")} />
          </button>
        </div>

        <div className="hidden md:block">
          {(likeCount > 0 || commentCount > 0) && (
            <div className="flex items-center justify-between py-2.5 text-[13px] text-white/50">
              <span className="flex items-center gap-1.5">
                {likeCount > 0 && (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit-pink text-snow">
                      <Heart className="h-3 w-3 fill-current" />
                    </span>
                    {likeCount.toLocaleString("pt-BR")}
                  </>
                )}
              </span>
              {commentCount > 0 && (
                <button type="button" onClick={loadComments} className="hover:underline">
                  {commentCount} {commentCount === 1 ? "comentário" : "comentários"}
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-4 border-t border-white/[0.07] pt-1.5 text-[13px] font-medium text-white/65">
            <button type="button" onClick={toggleLike} className={clsx("flex items-center justify-center gap-2 rounded-lg py-2 transition hover:bg-white/[0.04]", liked ? "text-orbit-pink" : "hover:text-white")}>
              <Heart className={clsx("h-[18px] w-[18px]", liked && "fill-orbit-pink")} /> Curtir
            </button>
            <button type="button" onClick={loadComments} className="flex items-center justify-center gap-2 rounded-lg py-2 transition hover:bg-white/[0.04] hover:text-white">
              <MessageCircle className="h-[18px] w-[18px]" /> Comentar
            </button>
            <button type="button" onClick={share} className="flex items-center justify-center gap-2 rounded-lg py-2 transition hover:bg-white/[0.04] hover:text-white">
              <Share2 className="h-[18px] w-[18px]" /> Compartilhar
            </button>
            <button type="button" onClick={toggleSave} className={clsx("flex items-center justify-center gap-2 rounded-lg py-2 transition hover:bg-white/[0.04]", saved ? "text-orbit-blue" : "hover:text-white")}>
              <Bookmark className={clsx("h-[18px] w-[18px]", saved && "fill-current")} /> {saved ? "Salvo" : "Salvar"}
            </button>
          </div>
        </div>
        {shareNote && <p className="pt-1 text-center text-xs text-emerald-400">{shareNote}</p>}
      </div>

      {showComments && (
        <div className={clsx("mt-3 space-y-3 border-t border-white/5 pt-3", bleed && "mx-4 md:mx-0")}>
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.user.name} url={c.user.avatarUrl} size={28} />
              <div className="rounded-xl bg-white/5 px-3 py-1.5 text-xs">
                <p className="font-medium text-white">{c.user.name}</p>
                <p className="text-white/70"><RichText text={c.content} /></p>
              </div>
            </div>
          ))}
          {comments?.length === 0 && <p className="text-xs text-white/30">Seja o primeiro a comentar.</p>}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-orbit-purple"
            />
            <button type="submit" className="rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow">
              Enviar
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

function SharedCard({ shared }: { shared: SharedEmbed | null }) {
  if (!shared)
    return (
      <p className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-white/45">
        <Repeat2 className="h-4 w-4" /> Esta publicação não está mais disponível.
      </p>
    );
  const href = shared.community ? `/comunidades/${shared.community.slug}?post=${shared.id}` : `/perfil/${shared.author.username}`;
  return (
    <Link href={href} className="mb-3 block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-orbit-purple/40">
      {shared.community && (
        <span className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-xs text-white/60">
          <Repeat2 className="h-3.5 w-3.5 text-orbit-cyan" />
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-space-card text-[10px] font-bold text-white">
            {shared.community.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shared.community.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              shared.community.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="truncate font-semibold text-white/80">{shared.community.name}</span>
        </span>
      )}
      <span className="flex gap-3 p-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-white">
            {shared.author.name} {shared.author.isVerified && <VerifiedBadge />}
            <span className="font-normal text-white/40">· {timeAgo(shared.createdAt)}</span>
          </span>
          {shared.title && <span className="mt-1 line-clamp-1 block text-sm font-semibold text-white">{shared.title}</span>}
          {shared.content && <span className="mt-0.5 line-clamp-3 block text-sm text-white/75"><RichText text={shared.content} /></span>}
        </span>
        {shared.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shared.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        )}
      </span>
    </Link>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orbit-gradient text-[11px] font-bold text-snow"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
