"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, CheckCircle2, Flag, Loader2, Lock, LockOpen, MessagesSquare, MoreHorizontal, Pin, PinOff, RotateCcw, Send, Share2, ShieldX, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { useStoreToast } from "@/components/store/store-view";
import { ago as timeAgo } from "@/lib/communities";
import { accentOf, can, communityError, rank, type Author, type Community, type Discussion, type Role, type Viewer } from "@/lib/communities";
import { CommunityContext, type CommunityCtx } from "./context";
import { Confirm, OfficialBadge, RoleBadge, Sheet } from "./ui";
import { RichText } from "./rich-text";
import { Lightbox } from "./lightbox";
import { ReportSheet, type ReportTarget } from "./report-sheet";

export type Reply = { id: string; content: string; status: string; createdAt: string; userId: string; user: Author };

type TopicAction = "pin" | "unpin" | "close" | "open" | "approve" | "remove" | "restore" | "delete";

export function DiscussionView(props: { community: Community; viewer: Viewer; role: Role | null; discussion: Discussion; replies: Reply[] }) {
  const { community, viewer, role } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [d, setD] = useState(props.discussion);
  const [replies, setReplies] = useState(props.replies);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "topic" } | { kind: "reply"; reply: Reply } | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [image, setImage] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const accent = accentOf(community.accentColor);

  const me = viewer?.id ?? null;
  const isAuthor = !!me && d.author.id === me;
  const mod = rank(role) >= 2;
  const admin = rank(role) >= 3;
  const canReply = !!viewer && can(community, role, "comment") && (!d.isClosed || mod) && d.status === "visible";
  const base = `/comunidades/${community.slug}`;

  const ctx: CommunityCtx = useMemo(() => ({ community, viewer, role, supabase, toast, refresh: () => router.refresh() }), [community, viewer, role, supabase, toast, router]);

  async function topic(a: TopicAction) {
    setMenu(false);
    setBusy(true);
    const { error } = await supabase.rpc("community_discussion_action", { p_discussion: d.id, p_action: a });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    if (a === "delete") {
      toast("Discussão excluída.");
      router.push(`${base}?aba=discussoes`);
      return;
    }
    const next: Partial<Discussion> =
      a === "pin" ? { isPinned: true } : a === "unpin" ? { isPinned: false } : a === "close" ? { isClosed: true } : a === "open" ? { isClosed: false } : a === "remove" ? { status: "removed", isPinned: false } : { status: "visible" };
    setD((x) => ({ ...x, ...next }));
    toast(
      { pin: "Discussão fixada no topo.", unpin: "Discussão desafixada.", close: "Discussão fechada para novas respostas.", open: "Discussão reaberta.", approve: "Discussão aprovada.", restore: "Discussão restaurada.", remove: "Discussão removida da comunidade." }[a]
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const { data, error } = await supabase.rpc("community_reply_discussion", { p_discussion: d.id, p_content: content });
    setSending(false);
    if (error) return toast(error.message.includes("invalid_reply") ? "A resposta precisa ter entre 1 e 3000 caracteres." : communityError(error.message), true);
    const r = data as { id: string; status: string };
    setReplies((l) => [...l, { id: r.id, content, status: r.status, createdAt: new Date().toISOString(), userId: viewer!.id, user: { ...viewer!, isVerified: false } }]);
    if (r.status === "visible") setD((x) => ({ ...x, replyCount: x.replyCount + 1 }));
    else toast("Resposta enviada. Ela aparece para todos assim que a moderação aprovar.");
    setText("");
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }

  async function replyAction(r: Reply, a: "approve" | "remove" | "delete") {
    setBusy(true);
    const { error } = await supabase.rpc("community_reply_action", { p_reply: r.id, p_action: a });
    setBusy(false);
    setConfirm(null);
    if (error) return toast(communityError(error.message), true);
    if (a === "approve") {
      setReplies((l) => l.map((x) => (x.id === r.id ? { ...x, status: "visible" } : x)));
      setD((x) => ({ ...x, replyCount: x.replyCount + 1 }));
      toast("Resposta aprovada.");
    } else {
      setReplies((l) => l.filter((x) => x.id !== r.id));
      if (r.status === "visible") setD((x) => ({ ...x, replyCount: Math.max(0, x.replyCount - 1) }));
      toast(a === "remove" ? "Resposta removida pela moderação." : "Resposta excluída.");
    }
  }

  function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) navigator.share({ title: d.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => toast("Link da discussão copiado."));
  }

  const menuItems: { label: string; icon: React.ComponentType<{ className?: string }>; run: () => void; danger?: boolean; show: boolean }[] = [
    { label: d.isPinned ? "Desafixar discussão" : "Fixar no topo", icon: d.isPinned ? PinOff : Pin, run: () => topic(d.isPinned ? "unpin" : "pin"), show: admin && d.status === "visible" },
    { label: d.isClosed ? "Reabrir para respostas" : "Fechar discussão", icon: d.isClosed ? LockOpen : Lock, run: () => topic(d.isClosed ? "open" : "close"), show: mod || isAuthor },
    { label: "Aprovar discussão", icon: CheckCircle2, run: () => topic("approve"), show: mod && d.status === "pending" },
    { label: "Restaurar discussão", icon: RotateCcw, run: () => topic("restore"), show: mod && d.status === "removed" },
    { label: "Remover (moderação)", icon: ShieldX, run: () => topic("remove"), show: mod && d.status !== "removed", danger: true },
    { label: "Excluir discussão", icon: Trash2, run: () => (setMenu(false), setConfirm({ kind: "topic" })), show: isAuthor || admin, danger: true },
    { label: "Copiar link", icon: Share2, run: () => (setMenu(false), share()), show: true },
    { label: "Denunciar discussão", icon: Flag, run: () => (setMenu(false), setReport({ type: "community_discussion", id: d.id, label: "discussão" })), show: !!viewer && !isAuthor, danger: true },
  ];

  return (
    <CommunityContext.Provider value={ctx}>
      <div style={{ ["--app-accent" as string]: accent.rgb }} className="mx-auto max-w-3xl px-4 pb-40 pt-4 md:px-6 md:pb-12 md:pt-6">
        <Link href={`${base}?aba=discussoes`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full pr-3 text-sm text-white/65 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-space-card text-xs font-bold text-white">
            {community.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              community.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="truncate font-semibold">{community.name}</span>
          {community.isOfficial && <OfficialBadge />}
        </Link>

        <article className="mt-3 overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80">
          <div className="p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-orbit-purple/15 px-2.5 py-1 text-[11px] font-semibold text-orbit-purple">
                <MessagesSquare className="h-3.5 w-3.5" /> Discussão
              </span>
              {d.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orbit-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-orbit-cyan">
                  <Pin className="h-3.5 w-3.5" /> Fixada
                </span>
              )}
              {d.isClosed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  <Lock className="h-3.5 w-3.5" /> Fechada
                </span>
              )}
              {d.status === "pending" && <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400">Aguardando aprovação</span>}
              {d.status === "removed" && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">Removida pela moderação</span>}
              {viewer && (
                <button type="button" onClick={() => setMenu(true)} aria-label="Opções da discussão" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                </button>
              )}
            </div>
            <h1 className="mt-3 break-words font-display text-xl font-bold leading-snug text-white md:text-2xl">{d.title}</h1>
            <Link href={`/perfil/${d.author.username}`} className="mt-3 flex items-center gap-2.5">
              <Avatar name={d.author.name} url={d.author.avatarUrl} size={36} />
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-semibold text-white">
                  {d.author.name} {d.author.isVerified && <VerifiedBadge />}
                </span>
                <span className="block text-xs text-white/45">
                  @{d.author.username} · {timeAgo(d.createdAt)}
                </span>
              </span>
            </Link>
            {d.body && <RichText text={d.body} className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85" />}
            {d.imageUrl && (
              <button type="button" onClick={() => setImage(true)} className="mt-4 block w-full overflow-hidden rounded-2xl bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.imageUrl} alt="" className="max-h-[480px] w-full object-contain" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 text-sm text-white/60 md:px-6">
            <MessagesSquare className="h-4 w-4 text-orbit-cyan" />
            <span>
              <strong className="font-semibold text-white">{d.replyCount}</strong> {d.replyCount === 1 ? "resposta" : "respostas"}
            </span>
            <button type="button" onClick={share} className="ml-auto flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-white/70 hover:bg-white/5 hover:text-white">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>
        </article>

        <section className="mt-4 space-y-2.5" aria-label="Respostas">
          {replies.length === 0 && (
            <p className="rounded-3xl border border-dashed border-white/10 px-6 py-8 text-center text-sm text-white/45">
              {d.isClosed ? "Esta discussão foi fechada sem respostas." : "Ninguém respondeu ainda. Comece a conversa!"}
            </p>
          )}
          {replies.map((r) => {
            const mine = r.userId === me;
            return (
              <div key={r.id} className={clsx("flex gap-3 rounded-3xl border p-3.5 md:p-4", r.status === "pending" ? "border-dashed border-amber-400/40 bg-amber-400/[0.04]" : "border-white/[0.06] bg-space-card/60")}>
                <Link href={`/perfil/${r.user.username}`} className="shrink-0">
                  <Avatar name={r.user.name} url={r.user.avatarUrl} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                    <Link href={`/perfil/${r.user.username}`} className="font-semibold text-white hover:underline">
                      {r.user.name}
                    </Link>
                    {r.user.isVerified && <VerifiedBadge />}
                    {r.userId === d.author.id && <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-white/70">autor</span>}
                    <span className="text-xs text-white/40">· {timeAgo(r.createdAt)}</span>
                  </p>
                  <RichText text={r.content} className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85" />
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {r.status === "pending" && <span className="font-semibold text-amber-400">Aguardando aprovação</span>}
                    {mod && r.status === "pending" && (
                      <button type="button" onClick={() => replyAction(r, "approve")} className="font-semibold text-emerald-400 hover:underline">
                        Aprovar
                      </button>
                    )}
                    {mod && !mine && (
                      <button type="button" onClick={() => replyAction(r, "remove")} className="font-semibold text-red-300 hover:underline">
                        Remover
                      </button>
                    )}
                    {mine && (
                      <button type="button" onClick={() => setConfirm({ kind: "reply", reply: r })} className="font-semibold text-white/50 hover:text-white">
                        Excluir
                      </button>
                    )}
                    {viewer && !mine && (
                      <button type="button" onClick={() => setReport({ type: "community_reply", id: r.id, label: "resposta" })} className="text-white/40 hover:text-white/80">
                        Denunciar
                      </button>
                    )}
                    {canReply && !mine && (
                      <button
                        type="button"
                        onClick={() => {
                          setText((t) => (t.includes(`@${r.user.username}`) ? t : `@${r.user.username} ${t}`));
                          input.current?.focus();
                        }}
                        className="font-semibold text-orbit-cyan hover:underline"
                      >
                        Responder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-white/[0.06] bg-space-bg/95 px-3 pb-4 pt-2.5 backdrop-blur-xl md:static md:mt-4 md:rounded-3xl md:border md:bg-space-card/70 md:p-3">
          {canReply ? (
            <form onSubmit={send} className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
                }}
                rows={1}
                maxLength={3000}
                placeholder={d.isClosed ? "Discussão fechada — só a moderação pode responder" : "Escreva sua resposta…"}
                className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
              />
              <button type="submit" disabled={!text.trim() || sending} aria-label="Enviar resposta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow disabled:opacity-40">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 py-1.5 text-center text-sm text-white/50">
              {!viewer ? (
                <Link href="/entrar" className="font-semibold text-orbit-cyan">
                  Entre para responder
                </Link>
              ) : d.isClosed ? (
                <>
                  <Lock className="h-4 w-4" /> Esta discussão está fechada para novas respostas.
                </>
              ) : d.status !== "visible" ? (
                "Respostas liberadas quando a discussão estiver visível."
              ) : (
                <>
                  Participe da comunidade para responder. <Link href={base} className="font-semibold text-orbit-cyan">Ver comunidade</Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Discussão">
        <div className="space-y-1 pt-1">
          {role && (
            <p className="mb-2 flex items-center gap-2 text-xs text-white/45">
              Você é <RoleBadge role={role} /> {role === "member" && "membro"} nesta comunidade.
            </p>
          )}
          {menuItems
            .filter((m) => m.show)
            .map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={m.run}
                  className={clsx("flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm transition hover:bg-white/5", m.danger ? "text-red-300" : "text-white/85")}
                >
                  <Icon className="h-[18px] w-[18px]" /> {m.label}
                </button>
              );
            })}
        </div>
      </Sheet>

      <Confirm
        open={!!confirm}
        busy={busy}
        title={confirm?.kind === "topic" ? "Excluir esta discussão?" : "Excluir sua resposta?"}
        message={confirm?.kind === "topic" ? "O tópico e todas as respostas serão apagados para sempre." : "Ela some da discussão para todos."}
        confirmLabel="Excluir"
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm?.kind === "topic" ? (setConfirm(null), topic("delete")) : confirm && replyAction(confirm.reply, "delete"))}
      />
      <ReportSheet target={report} onClose={() => setReport(null)} />
      {image && d.imageUrl && <Lightbox images={[{ id: d.id, url: d.imageUrl }]} start={0} onClose={() => setImage(false)} />}
      {node}
    </CommunityContext.Provider>
  );
}
