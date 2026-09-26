"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Flag, Loader2, MessageCircle, MessagesSquare, Plus, RotateCcw, ShieldCheck, ShieldX, X } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { ago as timeAgo } from "@/lib/communities";
import { loadCommunityPosts } from "@/lib/community-data";
import { communityError, rank, type Author, type CommunityPost, type Moderation } from "@/lib/communities";
import { useCommunity } from "../context";
import { CommunityPostCard } from "../post-card";
import { EmptyState } from "../ui";
import { Card, inputCls, ReadOnlyNote, SaveButton, SubTabs, Toggle } from "./fields";

type Tab = "pendentes" | "denuncias" | "removidos" | "regras";
type Small = { id: string; content: string; createdAt: string; user: Author };
type PendingComment = Small & { postId: string };
type PendingReply = Small & { discussionId: string };
type Topic = { id: string; title: string; body: string; createdAt: string; status: string; author: Author };
type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reporter: { name: string; username: string } | null;
  preview?: string;
  href?: string;
};

const USER = "id, name, username, avatarUrl, isVerified";
const TYPE_LABEL: Record<string, string> = {
  community_post: "Publicação",
  community_comment: "Comentário",
  community_discussion: "Discussão",
  community_reply: "Resposta",
  community: "Comunidade",
};

export function ModerationSection({ badges, onBadges }: { badges: { pending: number; reports: number }; onBadges: (b: { pending?: number; reports?: number }) => void }) {
  const { community, role, supabase, viewer, toast } = useCommunity();
  const admin = rank(role) >= 3;
  const base = `/comunidades/${community.slug}`;

  const [saved, setSaved] = useState<Moderation>(community.moderation);
  const [mod, setMod] = useState<Moderation>(community.moderation);
  const [word, setWord] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(mod) !== JSON.stringify(saved);

  const [tab, setTab] = useState<Tab>("pendentes");
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [replies, setReplies] = useState<PendingReply[]>([]);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.rpc("community_update", { p_community: community.id, p: { moderation: mod } as never });
    setSaving(false);
    if (error) return toast(error.message.includes("too_many_words") ? "No máximo 200 palavras no filtro." : communityError(error.message), true);
    setSaved(mod);
    toast("Regras de moderação salvas.");
  }

  function addWords() {
    const words = word
      .split(/[,\n]/)
      .map((w) => w.trim().toLowerCase().slice(0, 40))
      .filter((w) => w.length >= 2 && !mod.wordFilter.includes(w));
    if (words.length) setMod({ ...mod, wordFilter: [...mod.wordFilter, ...words].slice(0, 200) });
    setWord("");
  }

  async function loadQueue(which: Tab) {
    const status = which === "removidos" ? "removed" : "pending";
    if (which === "denuncias") {
      setReports(null);
      const { data } = await supabase
        .from("Report")
        .select("id, targetType, targetId, reason, details, createdAt, reporter:User!Report_reporterId_fkey(name, username)")
        .eq("communityId", community.id)
        .eq("status", "open")
        .order("createdAt", { ascending: false })
        .limit(100);
      const rows = (data ?? []) as unknown as Report[];
      const ids = (t: string) => rows.filter((r) => r.targetType === t).map((r) => r.targetId);
      const [p, c, d, r] = await Promise.all([
        ids("community_post").length ? supabase.from("Post").select("id, content, kind").in("id", ids("community_post")) : Promise.resolve({ data: [] }),
        ids("community_comment").length ? supabase.from("Comment").select("id, content, postId").in("id", ids("community_comment")) : Promise.resolve({ data: [] }),
        ids("community_discussion").length ? supabase.from("CommunityDiscussion").select("id, title").in("id", ids("community_discussion")) : Promise.resolve({ data: [] }),
        ids("community_reply").length ? supabase.from("CommunityDiscussionReply").select("id, content, discussionId").in("id", ids("community_reply")) : Promise.resolve({ data: [] }),
      ]);
      const find = <T extends { id: string }>(list: T[] | null, id: string) => (list ?? []).find((x) => x.id === id);
      setReports(
        rows.map((x) => {
          if (x.targetType === "community_post") {
            const t = find(p.data as { id: string; content: string; kind: string }[], x.targetId);
            return { ...x, preview: t ? t.content || `(${t.kind})` : "Conteúdo já apagado", href: t ? `${base}?post=${x.targetId}` : undefined };
          }
          if (x.targetType === "community_comment") {
            const t = find(c.data as { id: string; content: string; postId: string }[], x.targetId);
            return { ...x, preview: t?.content ?? "Comentário já apagado", href: t ? `${base}?post=${t.postId}` : undefined };
          }
          if (x.targetType === "community_discussion") {
            const t = find(d.data as { id: string; title: string }[], x.targetId);
            return { ...x, preview: t?.title ?? "Discussão já apagada", href: t ? `${base}/discussoes/${x.targetId}` : undefined };
          }
          if (x.targetType === "community_reply") {
            const t = find(r.data as { id: string; content: string; discussionId: string }[], x.targetId);
            return { ...x, preview: t?.content ?? "Resposta já apagada", href: t ? `${base}/discussoes/${t.discussionId}` : undefined };
          }
          return { ...x, preview: "A comunidade como um todo", href: base };
        })
      );
      return;
    }
    setPosts(null);
    const [p, d, c, r] = await Promise.all([
      loadCommunityPosts(supabase, community.id, viewer?.id ?? null, { status, limit: 30 }),
      supabase
        .from("CommunityDiscussion")
        .select(`id, title, body, createdAt, status, author:User!CommunityDiscussion_authorId_fkey(${USER})`)
        .eq("communityId", community.id)
        .eq("status", status)
        .order("createdAt", { ascending: false })
        .limit(30),
      which === "pendentes"
        ? supabase
            .from("Comment")
            .select(`id, content, createdAt, postId, user:User!Comment_userId_fkey(${USER}), post:Post!Comment_postId_fkey!inner(communityId)`)
            .eq("post.communityId", community.id)
            .eq("status", "pending")
            .order("createdAt", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
      which === "pendentes"
        ? supabase
            .from("CommunityDiscussionReply")
            .select(`id, content, createdAt, discussionId, user:User!CommunityDiscussionReply_userId_fkey(${USER}), discussion:CommunityDiscussion!CommunityDiscussionReply_discussionId_fkey!inner(communityId)`)
            .eq("discussion.communityId", community.id)
            .eq("status", "pending")
            .order("createdAt", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
    ]);
    setTopics(((d.data ?? []) as unknown as Topic[]).filter((t) => t.author));
    setComments(((c.data ?? []) as unknown as PendingComment[]).filter((x) => x.user));
    setReplies(((r.data ?? []) as unknown as PendingReply[]).filter((x) => x.user));
    setPosts(p);
  }

  useEffect(() => {
    if (tab !== "regras") loadQueue(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function act(key: string, call: PromiseLike<{ error: { message: string } | null }>, ok: string, after: () => void) {
    setBusy(key);
    const { error } = await call;
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    after();
    toast(ok);
  }

  const dropPending = () => tab === "pendentes" && onBadges({ pending: Math.max(0, badges.pending - 1) });

  async function reportAction(r: Report, remove: boolean) {
    setBusy(r.id);
    if (remove && r.href) {
      const call =
        r.targetType === "community_post"
          ? supabase.rpc("community_post_action", { p_post: r.targetId, p_action: "remove" })
          : r.targetType === "community_comment"
            ? supabase.rpc("community_comment_action", { p_comment: r.targetId, p_action: "remove" })
            : r.targetType === "community_discussion"
              ? supabase.rpc("community_discussion_action", { p_discussion: r.targetId, p_action: "remove" })
              : r.targetType === "community_reply"
                ? supabase.rpc("community_reply_action", { p_reply: r.targetId, p_action: "remove" })
                : null;
      if (call) {
        const { error } = await call;
        if (error) {
          setBusy(null);
          return toast(communityError(error.message), true);
        }
      }
    }
    const { error } = await supabase.rpc("community_resolve_report", { p_report: r.id, p_status: remove ? "actioned" : "dismissed" });
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    const left = (reports ?? []).filter((x) => x.id !== r.id && !(remove && x.targetId === r.targetId));
    setReports(left);
    onBadges({ reports: left.length });
    toast(remove ? "Conteúdo removido e denúncia resolvida." : "Denúncia arquivada. O conteúdo continua no ar.");
  }

  const empty = !posts?.length && !topics.length && !comments.length && !replies.length;
  const smallRow = (x: Small, href: string, label: string, actions: React.ReactNode) => (
    <div key={x.id} className="flex gap-3 rounded-3xl border border-dashed border-amber-400/30 bg-amber-400/[0.03] p-3.5">
      <Avatar name={x.user.name} url={x.user.avatarUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/50">
          <span className="font-semibold text-white">{x.user.name}</span> · {label} · {timeAgo(x.createdAt)}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/85">{x.content}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {actions}
          <Link href={href} className="flex min-h-[36px] items-center gap-1 px-2 text-xs text-white/50 hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Ver contexto
          </Link>
        </div>
      </div>
    </div>
  );
  const approveBtn = (key: string, onClick: () => void) => (
    <button type="button" onClick={onClick} disabled={!!busy} className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-emerald-500/90 px-3.5 text-xs font-semibold text-white">
      {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Aprovar
    </button>
  );
  const rejectBtn = (key: string, onClick: () => void, label = "Rejeitar") => (
    <button type="button" onClick={onClick} disabled={!!busy} className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-red-400/40 px-3.5 text-xs font-semibold text-red-300">
      {busy === key + "x" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <Card title="Moderação" desc="Revise o que está aguardando, resolva denúncias e ajuste as regras automáticas.">
        <SubTabs
          tabs={[
            { id: "pendentes" as Tab, label: "Aguardando aprovação", count: badges.pending },
            { id: "denuncias" as Tab, label: "Denúncias", count: badges.reports },
            { id: "removidos" as Tab, label: "Conteúdo removido" },
            { id: "regras" as Tab, label: "Regras automáticas" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Card>

      {tab === "regras" ? (
      <Card title="Regras automáticas" desc="Valem para membros comuns. Proprietário, administradores e moderadores não passam pelos filtros.">
        {!admin && <ReadOnlyNote>Moderadores revisam a fila; só administradores mudam as regras.</ReadOnlyNote>}
        <div className="divide-y divide-white/[0.05]">
          <Toggle checked={mod.approvePosts} disabled={!admin} onChange={(v) => setMod({ ...mod, approvePosts: v })} label="Aprovar publicações antes de aparecer" desc="Posts e discussões novos ficam pendentes até a moderação liberar." />
          <Toggle checked={mod.approveComments} disabled={!admin} onChange={(v) => setMod({ ...mod, approveComments: v })} label="Aprovar comentários antes de aparecer" desc="Comentários e respostas ficam pendentes." />
          <Toggle checked={mod.blockLinks} disabled={!admin} onChange={(v) => setMod({ ...mod, blockLinks: v })} label="Bloquear links" desc="Membros não podem publicar ou comentar com links." />
          <Toggle checked={mod.blockMedia} disabled={!admin} onChange={(v) => setMod({ ...mod, blockMedia: v })} label="Bloquear mídia" desc="Membros não podem enviar fotos, vídeos, clipes, áudio ou arquivos." />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Filtro de palavras</p>
          <p className="mt-0.5 text-xs text-white/40">Textos com estas palavras vão para a fila de aprovação em vez de aparecer.</p>
          {admin && (
            <div className="mt-2 flex gap-2">
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWords())}
                placeholder="Digite e aperte Enter (separe várias por vírgula)"
                className={inputCls}
              />
              <button type="button" onClick={addWords} aria-label="Adicionar palavra" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white hover:bg-white/10">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mod.wordFilter.length === 0 && <span className="text-xs text-white/35">Nenhuma palavra no filtro.</span>}
            {mod.wordFilter.map((w) => (
              <span key={w} className="flex items-center gap-1 rounded-full bg-white/[0.06] py-1 pl-3 pr-1 text-xs text-white/80">
                {w}
                {admin && (
                  <button type="button" onClick={() => setMod({ ...mod, wordFilter: mod.wordFilter.filter((x) => x !== w) })} aria-label={`Remover ${w}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
        {admin && (
          <div className="mt-4 flex justify-end gap-2">
            {dirty && (
              <button type="button" onClick={() => setMod(saved)} className="min-h-[48px] rounded-full px-5 text-sm font-semibold text-white/70 hover:text-white">
                Descartar
              </button>
            )}
            <SaveButton busy={saving} disabled={!dirty} onClick={saveSettings}>
              Salvar regras
            </SaveButton>
          </div>
        )}
      </Card>
      ) : tab === "denuncias" ? (
        reports === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Nenhuma denúncia aberta" text="Tudo tranquilo por aqui." />
        ) : (
          <div className="space-y-2.5">
            {reports.map((r) => (
              <div key={r.id} className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-300">
                    <Flag className="h-3.5 w-3.5" /> {r.reason}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/60">{TYPE_LABEL[r.targetType] ?? r.targetType}</span>
                  <span className="text-white/40">{timeAgo(r.createdAt)}{r.reporter ? ` · por @${r.reporter.username}` : ""}</span>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words rounded-2xl bg-white/[0.03] px-3 py-2 text-sm text-white/80">{r.preview}</p>
                {r.details && <p className="mt-2 text-xs text-white/55">Detalhes: “{r.details}”</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.href && r.targetType !== "community" && (
                    <button type="button" onClick={() => reportAction(r, true)} disabled={!!busy} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-red-500/90 px-4 text-xs font-semibold text-white">
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />} Remover conteúdo
                    </button>
                  )}
                  <button type="button" onClick={() => reportAction(r, false)} disabled={!!busy} className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-4 text-xs font-semibold text-white/80">
                    <Check className="h-3.5 w-3.5" /> Manter e arquivar
                  </button>
                  {r.href && (
                    <Link href={r.href} className="flex min-h-[40px] items-center gap-1 px-2 text-xs text-white/50 hover:text-white">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : posts === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : empty ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title={tab === "pendentes" ? "Nada aguardando aprovação" : "Nenhum conteúdo removido"}
          text={tab === "pendentes" ? "Quando algo cair no filtro ou precisar de aprovação, aparece aqui." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 px-1">
                {tab === "pendentes"
                  ? approveBtn(p.id, () =>
                      act(p.id, supabase.rpc("community_post_action", { p_post: p.id, p_action: "approve" }), "Publicação aprovada e no ar.", () => (setPosts((l) => (l ?? []).filter((x) => x.id !== p.id)), dropPending()))
                    )
                  : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => act(p.id, supabase.rpc("community_post_action", { p_post: p.id, p_action: "restore" }), "Publicação restaurada.", () => setPosts((l) => (l ?? []).filter((x) => x.id !== p.id)))}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-semibold text-white/85"
                    >
                      {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Restaurar
                    </button>
                  )}
                {tab === "pendentes" &&
                  rejectBtn(p.id, () =>
                    act(p.id + "x", supabase.rpc("community_post_action", { p_post: p.id, p_action: "remove" }), "Publicação rejeitada.", () => (setPosts((l) => (l ?? []).filter((x) => x.id !== p.id)), dropPending()))
                  )}
              </div>
              <CommunityPostCard post={p} onDeleted={(id) => setPosts((l) => (l ?? []).filter((x) => x.id !== id))} />
            </div>
          ))}
          {topics.map((t) => (
            <div key={t.id} className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/50">
                <MessagesSquare className="h-3.5 w-3.5 text-orbit-purple" /> Discussão de <span className="font-semibold text-white">{t.author.name}</span> · {timeAgo(t.createdAt)}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-white">{t.title}</p>
              {t.body && <p className="mt-1 line-clamp-3 text-sm text-white/65">{t.body}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tab === "pendentes" ? (
                  <>
                    {approveBtn(t.id, () =>
                      act(t.id, supabase.rpc("community_discussion_action", { p_discussion: t.id, p_action: "approve" }), "Discussão aprovada.", () => (setTopics((l) => l.filter((x) => x.id !== t.id)), dropPending()))
                    )}
                    {rejectBtn(t.id, () =>
                      act(t.id + "x", supabase.rpc("community_discussion_action", { p_discussion: t.id, p_action: "remove" }), "Discussão rejeitada.", () => (setTopics((l) => l.filter((x) => x.id !== t.id)), dropPending()))
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(t.id, supabase.rpc("community_discussion_action", { p_discussion: t.id, p_action: "restore" }), "Discussão restaurada.", () => setTopics((l) => l.filter((x) => x.id !== t.id)))}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-xs font-semibold text-white/85"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </button>
                )}
                <Link href={`${base}/discussoes/${t.id}`} className="flex min-h-[36px] items-center gap-1 px-2 text-xs text-white/50 hover:text-white">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </Link>
              </div>
            </div>
          ))}
          {comments.map((c) =>
            smallRow(
              c,
              `${base}?post=${c.postId}`,
              "comentário",
              <>
                {approveBtn(c.id, () => act(c.id, supabase.rpc("community_comment_action", { p_comment: c.id, p_action: "approve" }), "Comentário aprovado.", () => setComments((l) => l.filter((x) => x.id !== c.id))))}
                {rejectBtn(c.id, () => act(c.id + "x", supabase.rpc("community_comment_action", { p_comment: c.id, p_action: "remove" }), "Comentário rejeitado.", () => setComments((l) => l.filter((x) => x.id !== c.id))))}
              </>
            )
          )}
          {replies.map((r) =>
            smallRow(
              r,
              `${base}/discussoes/${r.discussionId}`,
              "resposta em discussão",
              <>
                {approveBtn(r.id, () => act(r.id, supabase.rpc("community_reply_action", { p_reply: r.id, p_action: "approve" }), "Resposta aprovada.", () => setReplies((l) => l.filter((x) => x.id !== r.id))))}
                {rejectBtn(r.id, () => act(r.id + "x", supabase.rpc("community_reply_action", { p_reply: r.id, p_action: "remove" }), "Resposta rejeitada.", () => setReplies((l) => l.filter((x) => x.id !== r.id))))}
              </>
            )
          )}
          {tab === "pendentes" && (comments.length > 0 || replies.length > 0) && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-white/35">
              <MessageCircle className="h-3.5 w-3.5" /> Comentários pendentes não contam no selo do menu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
