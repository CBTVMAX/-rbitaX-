"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowDownUp, Check, ChevronDown, ChevronRight, Loader2, MessageCircle, Phone, Search, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { PresenceDot } from "@/components/presence-picker";
import { VerifiedBadge } from "@/components/verified-badge";
import { runFriendAction } from "@/components/friend-button";
import { FriendRowMenu, UnblockButton } from "@/components/block-user";
import { useCalls } from "@/components/calls/call-provider";
import { useLiveCounts } from "@/components/live-activity";
import { presenceOf } from "@/lib/presence";
import { timeAgo } from "@/lib/format";

export type HubPerson = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  presence: string;
  subtitle: string | null;
  verified: boolean;
  mutualCount: number;
  mutualAvatars: { name: string; avatarUrl: string | null }[];
  at: string | null;
  pendingFollow?: boolean;
};

type Sort = "importancia" | "nome" | "recentes";
const SORT_LABEL: Record<Sort, string> = { importancia: "Por importância", nome: "Por nome", recentes: "Adicionados recentemente" };
const HIDDEN_KEY = "orbitax:hidden-suggestions";
const PREVIEW = 5;

const btnPrimary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-space-bg transition hover:bg-white/90 disabled:opacity-60";
const btnSecondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-60";

function MutualLine({ p }: { p: HubPerson }) {
  if (!p.mutualCount) return null;
  return (
    <span className="mt-1.5 flex items-center gap-2 text-[13px] text-white/50">
      <span className="flex -space-x-2">
        {p.mutualAvatars.map((m, i) => (
          <span key={i} className="rounded-full ring-2 ring-space-bg">
            <Avatar name={m.name} url={m.avatarUrl} size={22} />
          </span>
        ))}
      </span>
      {p.mutualCount} {p.mutualCount === 1 ? "amigo em comum" : "amigos em comum"}
    </span>
  );
}

/** Linha de pessoa no estilo VK: foto grande, nome, uma linha de contexto e as ações. */
function PersonRow({ p, sub, below, side }: { p: HubPerson; sub?: React.ReactNode; below?: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 px-1 py-2.5">
      <Link href={`/perfil/${p.username}`} className="relative shrink-0">
        <Avatar name={p.name} url={p.avatarUrl} size={64} />
        <PresenceDot value={p.presence} userId={p.id} className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 border-2 border-space-bg" />
      </Link>
      <div className="min-w-0 flex-1 pt-1">
        <Link href={`/perfil/${p.username}`} className="flex items-center gap-1.5">
          <span className="truncate text-[16px] font-medium text-white">{p.name}</span>
          {p.verified && <VerifiedBadge />}
        </Link>
        {(sub ?? p.subtitle) && <span className="mt-0.5 block truncate text-[14px] text-white/50">{sub ?? p.subtitle}</span>}
        {below}
      </div>
      {side && <div className="flex shrink-0 items-center gap-1 self-center">{side}</div>}
    </div>
  );
}

function SectionHead({ title, count, right }: { title: string; count?: number; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-5">
      <h2 className="text-[18px] font-semibold text-white">
        {title} {count !== undefined && <span className="font-normal text-white/45">{count}</span>}
      </h2>
      {right}
    </div>
  );
}

function ShowAll({ total, open, onToggle }: { total: number; open: boolean; onToggle: () => void }) {
  if (total <= PREVIEW) return null;
  return (
    <button type="button" onClick={onToggle} className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-orbit-blue hover:bg-white/[0.04]">
      {open ? "Mostrar menos" : `Mostrar todos (${total})`}
    </button>
  );
}

export function FriendsHub({
  meId,
  friends,
  incoming,
  outgoing,
  followers,
  following,
  suggestions,
  blocked,
}: {
  meId: string;
  friends: HubPerson[];
  incoming: HubPerson[];
  outgoing: HubPerson[];
  followers: HubPerson[];
  following: HubPerson[];
  suggestions: HubPerson[];
  blocked: HubPerson[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { refresh: refreshCounts } = useLiveCounts();
  const { startCall } = useCalls();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("importancia");
  const [sortOpen, setSortOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(incoming.length > 0 && incoming.length <= 3);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Resultado de cada ação por pessoa, para a linha mudar na hora (antes do refresh do servidor).
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestsRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHidden(new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") as string[]));
    } catch {
      /* sem armazenamento */
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const match = (p: HubPerson) => !needle || p.name.toLowerCase().includes(needle) || p.username.toLowerCase().includes(needle);
  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));
  const cut = (key: string, items: HubPerson[]) => (expanded[key] || needle ? items : items.slice(0, PREVIEW));

  async function run(id: string, fn: () => Promise<string | null>) {
    setBusy(id);
    const result = await fn();
    setBusy(null);
    if (result) {
      setDone((d) => ({ ...d, [id]: result }));
      router.refresh();
      refreshCounts();
    }
  }

  const sendRequest = (p: HubPerson) => run(p.id, async () => ((await runFriendAction("send", p.id)) ? "sent" : null));
  const cancelRequest = (p: HubPerson) => run(p.id, async () => ((await runFriendAction("cancel", p.id)) ? "canceled" : null));
  const respond = (p: HubPerson, accept: boolean) => run(p.id, async () => ((await runFriendAction(accept ? "accept" : "decline", p.id)) ? (accept ? "accepted" : "declined") : null));
  const unfollow = (p: HubPerson) =>
    run(p.id, async () => {
      const { error } = await supabase.from("Follow").delete().eq("followerId", meId).eq("followingId", p.id);
      return error ? null : "unfollowed";
    });
  const respondFollow = (p: HubPerson, accept: boolean) =>
    run(p.id, async () => {
      const { data, error } = await supabase.rpc("respond_follow_request", { p_follower: p.id, p_accept: accept });
      return error || data === "none" ? null : accept ? "followAccepted" : "removed";
    });
  const removeFollower = (p: HubPerson) =>
    run(p.id, async () => {
      const { error } = await supabase.rpc("remove_follower" as never, { p_follower: p.id } as never);
      if (error) {
        setNotice(
          /function|schema cache|PGRST202/i.test(`${error.code} ${error.message}`)
            ? "Remover seguidor fica disponível assim que a atualização do banco for aplicada."
            : "Não foi possível remover agora."
        );
        return null;
      }
      return "removed";
    });

  function hide(p: HubPerson) {
    setHidden((prev) => {
      const next = new Set(prev).add(p.id);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(next).slice(-300)));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function call(p: HubPerson) {
    const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", { other_user_id: p.id });
    if (error || !conversationId) return setNotice("Não foi possível iniciar a chamada agora.");
    startCall({ conversationId: conversationId as string, peer: { id: p.id, name: p.name, username: p.username, avatarUrl: p.avatarUrl }, kind: "voice" });
  }

  const sortedFriends = useMemo(() => {
    const list = [...friends];
    if (sort === "nome") list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    else if (sort === "recentes") list.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    else {
      const online = (p: HubPerson) => (presenceOf(p.presence) === "online" ? 1 : 0);
      list.sort((a, b) => online(b) - online(a) || b.mutualCount - a.mutualCount || a.name.localeCompare(b.name, "pt-BR"));
    }
    return list;
  }, [friends, sort]);

  const shownFriends = sortedFriends.filter(match);
  const shownIncoming = incoming.filter(match);
  const shownSuggestions = suggestions.filter((p) => !hidden.has(p.id) && match(p));
  const shownOutgoing = outgoing.filter(match);
  const shownFollowers = followers.filter(match);
  const shownFollowing = following.filter(match);
  const shownBlocked = blocked.filter(match);
  const nothingFound =
    !!needle && ![shownFriends, shownIncoming, shownSuggestions, shownOutgoing, shownFollowers, shownFollowing, shownBlocked].some((l) => l.length);

  const iconBtn = "flex h-11 w-11 items-center justify-center rounded-full text-orbit-blue transition hover:bg-white/[0.06]";
  const divider = <div className="my-2 h-px bg-white/[0.07]" />;
  const spin = <Loader2 className="h-4 w-4 animate-spin" />;
  const doneText = (text: string, ok = true) => <span className={clsx("text-sm font-medium", ok ? "text-emerald-400" : "text-white/45")}>{text}</span>;

  return (
    <div className="mx-auto max-w-2xl px-3 pb-10 pt-3 md:px-4 md:pt-6">
      <h1 className="px-1 font-display text-2xl font-bold text-white">Amigos</h1>

      <label className="mt-3 flex h-12 items-center gap-3 rounded-2xl bg-white/[0.07] px-4 focus-within:ring-2 focus-within:ring-orbit-blue/50">
        <Search className="h-5 w-5 shrink-0 text-white/45" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Introduza o nome ou @usuário" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Limpar busca" className="text-white/45 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {notice && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-center text-sm text-white/80">{notice}</p>}

      {!needle && (
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex w-full items-center gap-4 rounded-2xl px-1 py-2.5 text-left hover:bg-white/[0.03]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chat text-snow">
              <UserPlus className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] text-white">Adicione amigos a partir das recomendações</span>
              <span className="block text-[13px] text-white/45">Talvez você conheça essas pessoas</span>
            </span>
          </button>
          <Link href="/explorar?tab=pessoas" className="flex w-full items-center gap-4 rounded-2xl px-1 py-2.5 hover:bg-white/[0.03]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-snow">
              <Search className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] text-white">Encontrar pessoas no ÓrbitaX</span>
              <span className="block text-[13px] text-white/45">Busque por nome, @usuário ou interesses</span>
            </span>
          </Link>
        </div>
      )}

      {shownIncoming.length > 0 && (
        <div ref={requestsRef}>
          {divider}
          <button type="button" onClick={() => setRequestsOpen((v) => !v)} aria-expanded={requestsOpen} className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left hover:bg-white/[0.03]">
            <span className="flex -space-x-3">
              {shownIncoming.slice(0, 3).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-space-bg">
                  <Avatar name={p.name} url={p.avatarUrl} size={40} />
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1 text-[16px] text-white">Solicitações de amizade</span>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-chat px-2 text-sm font-semibold text-snow">{shownIncoming.length}</span>
            <ChevronDown className={clsx("h-5 w-5 text-white/40 transition", requestsOpen && "rotate-180")} />
          </button>
          {(requestsOpen || needle) &&
            shownIncoming.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                sub={p.at ? `Enviou ${timeAgo(p.at)}` : undefined}
                below={
                  <>
                    <MutualLine p={p} />
                    <div className="mt-2.5 flex gap-2">
                      {done[p.id] === "accepted" ? (
                        doneText("Agora vocês são amigos")
                      ) : done[p.id] === "declined" ? (
                        doneText("Pedido recusado · continua seguindo você", false)
                      ) : (
                        <>
                          <button type="button" disabled={busy === p.id} onClick={() => respond(p, true)} className={btnPrimary}>
                            {busy === p.id ? spin : <Check className="h-4 w-4" />} Aceitar
                          </button>
                          <button type="button" disabled={busy === p.id} onClick={() => respond(p, false)} className={btnSecondary}>
                            Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </>
                }
              />
            ))}
        </div>
      )}

      {shownSuggestions.length > 0 && (
        <div ref={suggestionsRef} className="scroll-mt-20">
          {divider}
          <SectionHead
            title="Possíveis amigos"
            right={
              shownSuggestions.length > 3 && (
                <button type="button" onClick={() => toggle("sug")} className="text-[15px] font-semibold text-white">
                  {expanded.sug ? "Mostrar menos" : "Mostrar todos"}
                </button>
              )
            }
          />
          {(expanded.sug || needle ? shownSuggestions : shownSuggestions.slice(0, 3)).map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              sub={p.subtitle ?? undefined}
              below={
                <>
                  <MutualLine p={p} />
                  <div className="mt-2.5 flex gap-2">
                    {done[p.id] === "sent" ? (
                      doneText("Pedido enviado")
                    ) : (
                      <>
                        <button type="button" disabled={busy === p.id} onClick={() => sendRequest(p)} className={btnPrimary}>
                          {busy === p.id && spin} Adicionar
                        </button>
                        <button type="button" onClick={() => hide(p)} className={btnSecondary}>
                          Ocultar
                        </button>
                      </>
                    )}
                  </div>
                </>
              }
            />
          ))}
        </div>
      )}

      {divider}
      <SectionHead title="Meus amigos" count={friends.length} />
      {friends.length > 1 && (
        <div className="relative px-1 pb-1">
          <button type="button" onClick={() => setSortOpen((v) => !v)} aria-expanded={sortOpen} className="flex items-center gap-2 text-[15px] text-white/50 hover:text-white/80">
            Ordem: {SORT_LABEL[sort]} <ArrowDownUp className="h-4 w-4" />
          </button>
          {sortOpen && (
            <div role="menu" className="absolute left-1 top-8 z-20 w-64 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
              {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sort === k}
                  onClick={() => (setSort(k), setSortOpen(false))}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/5"
                >
                  {SORT_LABEL[k]} {sort === k && <Check className="h-4 w-4 text-orbit-blue" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-white/25" />
          <p className="mt-2 text-sm text-white/55">Você ainda não tem amigos no ÓrbitaX.</p>
          <Link href="/explorar?tab=pessoas" className="mt-3 inline-flex text-sm font-semibold text-orbit-blue hover:underline">
            Encontrar pessoas
          </Link>
        </div>
      ) : (
        <>
          {cut("friends", shownFriends).map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              side={
                <>
                  <button type="button" onClick={() => call(p)} aria-label={`Ligar para ${p.name}`} title="Chamada de voz" className={iconBtn}>
                    <Phone className="h-[22px] w-[22px]" />
                  </button>
                  <Link href={`/mensagens?com=${encodeURIComponent(p.username)}`} aria-label={`Conversar com ${p.name}`} title="Mensagem" className={iconBtn}>
                    <MessageCircle className="h-[22px] w-[22px]" />
                  </Link>
                  <FriendRowMenu userId={p.id} name={p.name} />
                </>
              }
            />
          ))}
          <ShowAll total={shownFriends.length} open={!!expanded.friends || !!needle} onToggle={() => toggle("friends")} />
        </>
      )}

      {shownOutgoing.length > 0 && (
        <>
          {divider}
          <SectionHead title="Solicitações enviadas" count={outgoing.length} />
          {cut("out", shownOutgoing).map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              sub={p.subtitle ?? (p.at ? `Enviada ${timeAgo(p.at)}` : undefined)}
              below={
                <>
                  <MutualLine p={p} />
                  <div className="mt-2.5">
                    {done[p.id] === "canceled" ? (
                      doneText("Pedido cancelado", false)
                    ) : (
                      <button type="button" disabled={busy === p.id} onClick={() => cancelRequest(p)} className={btnSecondary}>
                        {busy === p.id && spin} Cancelar pedido
                      </button>
                    )}
                  </div>
                </>
              }
            />
          ))}
          <ShowAll total={shownOutgoing.length} open={!!expanded.out || !!needle} onToggle={() => toggle("out")} />
        </>
      )}

      {shownFollowers.length > 0 && (
        <>
          {divider}
          <SectionHead title="Seguidores" count={followers.length} />
          <p className="px-1 pb-1 text-[13px] text-white/40">Pessoas que seguem você e ainda não são suas amigas.</p>
          {cut("followers", shownFollowers).map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              sub={p.pendingFollow ? "Quer seguir você" : undefined}
              below={
                <>
                  <MutualLine p={p} />
                  <div className="mt-2.5 flex gap-2">
                    {done[p.id] === "sent" ? (
                      doneText("Pedido de amizade enviado")
                    ) : done[p.id] === "removed" ? (
                      doneText("Removido dos seguidores", false)
                    ) : done[p.id] === "followAccepted" ? (
                      doneText("Agora segue você")
                    ) : p.pendingFollow ? (
                      <>
                        <button type="button" disabled={busy === p.id} onClick={() => respondFollow(p, true)} className={btnPrimary}>
                          {busy === p.id && spin} Aceitar
                        </button>
                        <button type="button" disabled={busy === p.id} onClick={() => respondFollow(p, false)} className={btnSecondary}>
                          Recusar
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={busy === p.id} onClick={() => sendRequest(p)} className={btnPrimary}>
                          {busy === p.id && spin} Adicionar
                        </button>
                        <button type="button" disabled={busy === p.id} onClick={() => removeFollower(p)} className={btnSecondary}>
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </>
              }
            />
          ))}
          <ShowAll total={shownFollowers.length} open={!!expanded.followers || !!needle} onToggle={() => toggle("followers")} />
        </>
      )}

      {shownFollowing.length > 0 && (
        <>
          {divider}
          <SectionHead title="Seguindo" count={following.length} />
          <p className="px-1 pb-1 text-[13px] text-white/40">Pessoas que você segue e que ainda não são suas amigas.</p>
          {cut("following", shownFollowing).map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              below={
                <>
                  <MutualLine p={p} />
                  <div className="mt-2.5 flex gap-2">
                    {done[p.id] === "unfollowed" ? (
                      doneText("Você deixou de seguir", false)
                    ) : done[p.id] === "sent" ? (
                      doneText("Pedido de amizade enviado")
                    ) : (
                      <>
                        <button type="button" disabled={busy === p.id} onClick={() => sendRequest(p)} className={btnPrimary}>
                          {busy === p.id && spin} Adicionar
                        </button>
                        <button type="button" disabled={busy === p.id} onClick={() => unfollow(p)} className={btnSecondary}>
                          Deixar de seguir
                        </button>
                      </>
                    )}
                  </div>
                </>
              }
            />
          ))}
          <ShowAll total={shownFollowing.length} open={!!expanded.following || !!needle} onToggle={() => toggle("following")} />
        </>
      )}

      {shownBlocked.length > 0 && (
        <>
          {divider}
          <SectionHead title="Bloqueados" count={blocked.length} />
          <p className="px-1 pb-1 text-[13px] text-white/40">Não veem seu perfil nem conseguem falar com você. A pessoa não é avisada.</p>
          {cut("blocked", shownBlocked).map((p) => (
            <PersonRow key={p.id} p={p} sub={p.at ? `Bloqueado ${timeAgo(p.at)}` : undefined} side={<UnblockButton userId={p.id} name={p.name} />} />
          ))}
          <ShowAll total={shownBlocked.length} open={!!expanded.blocked || !!needle} onToggle={() => toggle("blocked")} />
        </>
      )}

      {nothingFound && (
        <div className="py-12 text-center">
          <p className="text-sm text-white/55">Ninguém encontrado entre seus amigos e contatos.</p>
          <Link href={`/explorar?tab=pessoas&q=${encodeURIComponent(q.trim())}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orbit-blue hover:underline">
            Buscar “{q.trim()}” no ÓrbitaX <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
