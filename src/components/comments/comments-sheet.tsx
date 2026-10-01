"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Check, ChevronDown, Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CommentStickerButton } from "./comment-sticker-picker";
import type { StickerInfo } from "@/lib/messenger/types";
import { CommentItem, encodeStickerComment, firstName, SORT_LABEL, threadComments, useCommentLikes, type CommentSort, type CommentUser, type ThreadComment } from "./comment-kit";

const COLUMNS = "id, content, createdAt, userId, parentId, status, user:User!Comment_userId_fkey(id, name, username, avatarUrl)";

const ERRORS: [RegExp, string][] = [
  [/rate/i, "Muitos comentários seguidos. Espere um pouco."],
  [/blocked/i, "Você não pode comentar aqui."],
  [/comments_disabled/i, "Os comentários desta publicação estão desativados."],
  [/post_not_found/i, "Esta publicação não está mais disponível."],
];

/**
 * Comentários de um post do perfil, em painel (de baixo para cima no celular, centralizado no
 * computador): ordenar, responder ("Nome, …"), curtir e excluir os próprios.
 */
export function CommentsSheet({
  open,
  onClose,
  postId,
  postAuthor,
  viewerId,
  summary,
  onCountChange,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  postAuthor: CommentUser & { id: string };
  viewerId: string;
  summary?: React.ReactNode;
  onCountChange?: (delta: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<ThreadComment[] | null>(null);
  const [sort, setSort] = useState<CommentSort>("top");
  const [sortOpen, setSortOpen] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadComment | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || comments) return;
    supabase
      .from("Comment")
      .select(COLUMNS)
      .eq("postId", postId)
      .neq("status", "removed")
      .order("createdAt", { ascending: true })
      .limit(300)
      .then(({ data }) => setComments(((data ?? []) as unknown as ThreadComment[]).filter((c) => c.user)));
  }, [open, comments, postId, supabase]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const ids = useMemo(() => (comments ?? []).map((c) => c.id), [comments]);
  const { enabled: likesEnabled, likes, toggle } = useCommentLikes(ids, viewerId, postAuthor.id);
  const names = useMemo(() => new Set((comments ?? []).map((c) => firstName(c.user.name))), [comments]);
  const threads = useMemo(() => threadComments(comments ?? [], sort, (id) => likes[id]?.count ?? 0), [comments, sort, likes]);

  function startReply(c: ThreadComment) {
    setReplyTo(c);
    const name = firstName(c.user.name);
    setText((t) => (t.startsWith(`${name},`) ? t : `${name}, ${t.replace(/^[^,\n]{1,40},\s?/, "")}`));
    requestAnimationFrame(() => {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  async function post(content: string, clearText: () => void) {
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("Comment")
      .insert({ id: crypto.randomUUID(), postId, userId: viewerId, content: content.slice(0, 2000), updatedAt: new Date().toISOString(), parentId: replyTo?.id ?? null })
      .select(COLUMNS)
      .single();
    setSending(false);
    if (err || !data) {
      setError(ERRORS.find(([re]) => re.test(err?.message ?? ""))?.[1] ?? "Não foi possível enviar o comentário.");
      return;
    }
    const row = data as unknown as ThreadComment;
    setComments((c) => [...(c ?? []), row]);
    clearText();
    setReplyTo(null);
    setFresh(row.id);
    onCountChange?.(1);
    window.setTimeout(() => document.getElementById(`c-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    post(text.trim(), () => setText(""));
  }

  /** Adesivo sai na hora; numa resposta vai com o "Nome, " na frente, como no VK. */
  function sendSticker(info: StickerInfo) {
    const prefix = replyTo ? `${firstName(replyTo.user.name)}, ` : "";
    post(encodeStickerComment(prefix, info), () => setText((t) => t.replace(/^[^,\n]{1,40},\s?/, "")));
  }

  function insertEmoji(emoji: string) {
    const el = input.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((t) => t.slice(0, start) + emoji + t.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  async function remove(c: ThreadComment) {
    const gone = (comments ?? []).filter((x) => x.id === c.id || x.parentId === c.id);
    setComments((l) => (l ?? []).filter((x) => !gone.includes(x)));
    const { error: err } = await supabase.from("Comment").delete().eq("id", c.id);
    if (err) {
      setComments((l) => [...(l ?? []), ...gone]);
      setError("Não foi possível excluir o comentário.");
    } else onCountChange?.(-gone.length);
  }

  if (!open || typeof document === "undefined") return null;

  const item = (c: ThreadComment, isReply: boolean) => (
    <div key={c.id} id={`c-${c.id}`}>
      <CommentItem
        c={c}
        isReply={isReply}
        isAuthor={c.userId === postAuthor.id}
        names={names}
        like={likes[c.id]}
        likesEnabled={likesEnabled}
        postAuthor={postAuthor}
        onLike={() => toggle(c.id)}
        onReply={() => startReply(c)}
        highlight={fresh === c.id}
        extra={
          c.userId === viewerId ? (
            <button type="button" onClick={() => remove(c)} className="hover:text-red-300">
              Excluir
            </button>
          ) : null
        }
      />
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/60 backdrop-blur-[2px] md:items-center md:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Comentários"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in flex h-[88dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-space-surface shadow-2xl md:h-[80vh] md:rounded-3xl"
      >
        <header className="shrink-0 border-b border-white/[0.07] px-4 pb-3 pt-3">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 md:hidden" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Fechar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/5">
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-white">Comentários</h2>
          </div>
          {summary && <div className="mt-1 pl-1 text-[13px] text-white/50">{summary}</div>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {comments === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : comments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-white/80">Nenhum comentário ainda</p>
              <p className="mt-1 text-xs text-white/45">Seja a primeira pessoa a comentar.</p>
            </div>
          ) : (
            <>
              <div className="relative px-2 pb-1 pt-3">
                <button type="button" onClick={() => setSortOpen((v) => !v)} aria-expanded={sortOpen} className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
                  {SORT_LABEL[sort]} <ChevronDown className={clsx("h-4 w-4 transition", sortOpen && "rotate-180")} />
                </button>
                {sortOpen && (
                  <div role="menu" className="absolute left-2 top-11 z-10 w-60 overflow-hidden rounded-2xl border border-white/10 bg-space-card py-1 shadow-2xl">
                    {(Object.keys(SORT_LABEL) as CommentSort[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sort === k}
                        onClick={() => (setSort(k), setSortOpen(false))}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/[0.05]"
                      >
                        {SORT_LABEL[k]} {sort === k && <Check className="h-4 w-4 text-orbit-blue" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {threads.map(({ root, replies }) => (
                <div key={root.id}>
                  {item(root, false)}
                  {replies.map((r) => item(r, true))}
                </div>
              ))}
            </>
          )}
        </div>

        <form onSubmit={send} className="relative shrink-0 border-t border-white/[0.07] bg-space-surface pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {replyTo && (
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2 text-[13px] text-white/50">
              <span className="min-w-0 flex-1 truncate">
                Resposta a <strong className="font-semibold text-white/85">{replyTo.user.name}</strong>
              </span>
              <button type="button" onClick={() => (setReplyTo(null), setText((t) => t.replace(/^[^,\n]{1,40},\s?/, "")))} aria-label="Cancelar resposta" className="rounded-full p-1 text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {error && <p className="px-4 pt-2 text-xs text-red-300">{error}</p>}
          <div className="flex items-end gap-2 px-3 pt-2">
            <textarea
              ref={input}
              value={text}
              rows={1}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(min-width: 768px)").matches) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Comentário"
              className="max-h-[120px] min-h-[44px] min-w-0 flex-1 resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-orbit-blue/60"
            />
            <CommentStickerButton viewer={{ id: viewerId, name: "", username: "", avatarUrl: null }} onEmoji={insertEmoji} onSticker={sendSticker} />
            <button type="submit" disabled={!text.trim() || sending} aria-label="Enviar comentário" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-orbit-blue transition hover:bg-white/5 disabled:text-white/25">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-[22px] w-[22px]" />}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
