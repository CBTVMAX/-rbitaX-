"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { Archive, FileText, Phone, Image as ImageIcon, Link2, Loader2, Mic, PenSquare, Search, SlidersHorizontal, Video, X } from "lucide-react";
import { PresenceStatus } from "@/components/presence-picker";
import { listTime } from "@/lib/messenger/format";
import { useSignedUrl } from "@/lib/messenger/media";
import { conversationTitle, type Attachment, type Conversation } from "@/lib/messenger/types";
import { ConversationItem } from "./conversation-item";
import { ChatAvatar, ConversationAvatar, OrbitIllustration, PrimaryButton } from "./ui";
import { useMessenger } from "./context";
import { useTypingChannels } from "@/lib/messenger/typing";

export type ListFilter = "todas" | "nao-lidas" | "grupos" | "arquivadas";

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "nao-lidas", label: "Não lidas" },
  { id: "grupos", label: "Grupos" },
  { id: "arquivadas", label: "Arquivadas" },
];

type SearchKind = "all" | "photo" | "video" | "audio" | "file" | "link";

const KINDS: { id: SearchKind; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "Tudo" },
  { id: "photo", label: "Fotos", icon: ImageIcon },
  { id: "video", label: "Vídeos", icon: Video },
  { id: "audio", label: "Áudios", icon: Mic },
  { id: "file", label: "Arquivos", icon: FileText },
  { id: "link", label: "Links", icon: Link2 },
];

type SearchHit = {
  id: string;
  conversationId: string;
  chatTitle: string | null;
  isGroup: boolean;
  isSaved: boolean;
  senderId: string;
  senderName: string | null;
  type: string;
  content: string;
  preview: string;
  attachments: Attachment[];
  createdAt: string;
};

const PAGE = 20;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function EmptyUniverse({ onFind, compact }: { onFind: () => void; compact?: boolean }) {
  return (
    <div className={clsx("flex flex-col items-center px-6 text-center", compact ? "py-10" : "py-16")}>
      <OrbitIllustration />
      <p className="mt-6 font-display text-lg font-semibold text-white">Seu universo de conexões começa aqui.</p>
      <p className="mt-1.5 max-w-xs text-sm text-white/55">Encontre pessoas e comece uma conversa.</p>
      <PrimaryButton onClick={onFind} className="mt-6">
        <Search className="h-4 w-4" /> Encontrar pessoas
      </PrimaryButton>
    </div>
  );
}

/** The matched words stand out in the result line. */
function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (t.length < 2) return <>{text}</>;
  const i = normalize(text).indexOf(normalize(t));
  if (i < 0) return <>{text}</>;
  const start = Math.max(0, i - 24);
  return (
    <>
      {start > 0 && "…"}
      {text.slice(start, i)}
      <mark className="rounded bg-chat/25 px-0.5 text-white">{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  );
}

function HitThumb({ a, className = "h-11 w-11" }: { a: Attachment; className?: string }) {
  const src = useSignedUrl(a.kind === "video" ? a.thumbPath ?? null : a.path);
  return (
    <span className={clsx("relative block shrink-0 overflow-hidden rounded-xl bg-white/[0.06]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full animate-pulse" />
      )}
      {a.kind === "video" && <Video className="absolute bottom-1 right-1 h-3.5 w-3.5 text-snow drop-shadow" />}
    </span>
  );
}

function SearchResults({
  query,
  kind,
  conversations,
  onOpen,
}: {
  query: string;
  kind: SearchKind;
  conversations: Conversation[];
  onOpen: (id: string, messageId?: string) => void;
}) {
  const { supabase } = useMessenger();
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const term = query.trim();

  const chats = useMemo(() => {
    if (kind !== "all" || term.length < 1) return [];
    const q = normalize(term);
    return conversations.filter(
      (c) => normalize(conversationTitle(c)).includes(q) || (!!c.otherUser && normalize(c.otherUser.username).includes(q.replace(/^@/, "")))
    );
  }, [conversations, term, kind]);

  async function fetchPage(before: string | null) {
    const id = ++run.current;
    setBusy(true);
    const { data } = await supabase.rpc("search_messenger", {
      p_query: term || null,
      p_kind: kind,
      p_before: before,
      p_limit: PAGE,
    });
    if (id !== run.current) return;
    const rows = ((data ?? []) as unknown as SearchHit[]).map((r) => ({ ...r, attachments: Array.isArray(r.attachments) ? r.attachments : [] }));
    setHits((prev) => (before && prev ? [...prev, ...rows] : rows));
    setMore(rows.length === PAGE);
    setBusy(false);
  }

  useEffect(() => {
    if (kind === "all" && term.length < 2) {
      setHits(null);
      setMore(false);
      return;
    }
    const t = setTimeout(() => fetchPage(null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, kind]);

  const media = kind === "photo" || kind === "video";

  return (
    <div className="px-2 pb-4">
      {chats.length > 0 && (
        <>
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Conversas</p>
          {chats.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-white/[0.05]"
            >
              <ConversationAvatar c={c} size={40} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                <Highlight text={conversationTitle(c)} term={term} />
              </span>
            </button>
          ))}
        </>
      )}

      {(term.length >= 2 || kind !== "all") && (
        <p className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          {kind === "all" ? "Mensagens" : KINDS.find((k) => k.id === kind)?.label}
        </p>
      )}

      {hits === null ? (
        busy ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : term.length < 2 && kind === "all" ? (
          <p className="px-6 py-8 text-center text-xs text-white/40">Digite pelo menos 2 letras para buscar nas mensagens.</p>
        ) : null
      ) : hits.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-white/45">
          {term ? `Nada encontrado para “${term}”.` : "Nada por aqui ainda."}
        </p>
      ) : (
        <>
          {media && (
            <div className="grid grid-cols-4 gap-1 px-2">
              {hits.map((h) => (
                <button key={h.id} type="button" onClick={() => onOpen(h.conversationId, h.id)} className="aspect-square overflow-hidden rounded-xl" aria-label={`${h.preview} em ${h.chatTitle ?? "conversa"}`}>
                  {h.attachments[0] && <HitThumb a={h.attachments[0]} className="h-full w-full" />}
                </button>
              ))}
            </div>
          )}
          {!media &&
            hits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onOpen(h.conversationId, h.id)}
                className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                {h.type === "media" && h.attachments[0] ? (
                  <HitThumb a={h.attachments[0]} />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-chat">
                    {h.type === "voice" || h.type === "music" ? (
                      <Mic className="h-5 w-5" />
                    ) : h.type === "file" ? (
                      <FileText className="h-5 w-5" />
                    ) : /https?:\/\//i.test(h.content) ? (
                      <Link2 className="h-5 w-5" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-white">{h.chatTitle ?? "Conversa"}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-white/40">{listTime(h.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] text-white/60">
                    {h.isGroup && h.senderName && <span className="text-white/45">{h.senderName.split(" ")[0]}: </span>}
                    <Highlight text={h.type === "text" ? h.content : h.preview} term={term} />
                  </span>
                </span>
              </button>
            ))}
          {more && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fetchPage(hits[hits.length - 1]?.createdAt ?? null)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/75 transition hover:border-chat/40 hover:text-white disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ConversationList({
  activeId,
  onOpen,
  onNew,
  presence,
  banner,
  onCloseBanner,
}: {
  activeId: string | null;
  onOpen: (id: string, messageId?: string) => void;
  onNew: () => void;
  presence: string;
  banner: string | null;
  onCloseBanner: () => void;
}) {
  const { me, conversations, supabase } = useMessenger();
  const [filter, setFilter] = useState<ListFilter>("todas");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchKind>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Celular (estilo VK): a busca fica atrás da lupa do topo.
  const [mobileSearch, setMobileSearch] = useState(false);

  const saved = conversations.find((c) => c.isSaved) ?? null;
  const others = useMemo(() => conversations.filter((c) => !c.isSaved), [conversations]);
  const searching = query.trim().length > 0 || filtersOpen;
  // "digitando…" nas conversas mais recentes da lista (um canal leve por conversa).
  useTypingChannels(supabase, useMemo(() => others.slice(0, 25).map((c) => c.id), [others]));

  const counts = useMemo(
    () => ({
      naoLidas: others.filter((c) => !c.archivedAt && c.unread > 0).length,
      arquivadas: others.filter((c) => c.archivedAt).length,
    }),
    [others]
  );

  const visible = useMemo(
    () =>
      others.filter((c) => {
        if (filter === "arquivadas" ? !c.archivedAt : c.archivedAt) return false;
        if (filter === "nao-lidas" && c.unread === 0) return false;
        if (filter === "grupos" && !c.isGroup) return false;
        return true;
      }),
    [others, filter]
  );

  function clearSearch() {
    setQuery("");
    setKind("all");
    setFiltersOpen(false);
    setMobileSearch(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-3 lg:px-3 lg:pb-2 lg:pt-3">
        {/* Celular: topo compacto como no VK (foto · Messenger · ligações · arquivadas · busca). */}
        <div className="flex items-center gap-3 lg:hidden">
          <ChatAvatar name={me.name} url={me.avatarUrl} size={40} frame={me.avatarFrame} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[24px] font-bold leading-tight tracking-tight text-white">Messenger</h1>
          </div>
          <Link href="/chamadas" aria-label="Chamadas" className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition hover:bg-white/[0.06]">
            <Phone className="h-[22px] w-[22px]" />
          </Link>
          <button
            type="button"
            onClick={() => setFilter(filter === "arquivadas" ? "todas" : "arquivadas")}
            aria-label="Arquivadas"
            aria-pressed={filter === "arquivadas"}
            className={clsx("relative flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/[0.06]", filter === "arquivadas" ? "text-chat" : "text-white/85")}
          >
            <Archive className="h-[22px] w-[22px]" />
            {counts.arquivadas > 0 && filter !== "arquivadas" && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white/60" />}
          </button>
          <button
            type="button"
            onClick={() => (mobileSearch || searching ? clearSearch() : setMobileSearch(true))}
            aria-label={mobileSearch || searching ? "Fechar busca" : "Pesquisar"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition hover:bg-white/[0.06]"
          >
            {mobileSearch || searching ? <X className="h-[22px] w-[22px]" /> : <Search className="h-[22px] w-[22px]" />}
          </button>
        </div>
        <div className="mt-1 lg:hidden">
          <PresenceStatus userId={me.id} initial={presence} editable className="text-[13px]" />
        </div>

        {/* Computador: topo do VK — "Messenger" e ícones de ligações, arquivadas e nova conversa. */}
        <div className="hidden items-center gap-1 lg:flex">
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">Messenger</h1>
          <Link href="/chamadas" aria-label="Chamadas" title="Chamadas" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white">
            <Phone className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={() => setFilter(filter === "arquivadas" ? "todas" : "arquivadas")}
            aria-label="Arquivadas"
            title="Arquivadas"
            aria-pressed={filter === "arquivadas"}
            className={clsx("flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06]", filter === "arquivadas" ? "text-chat" : "text-white/55 hover:text-white")}
          >
            <Archive className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={onNew} aria-label="Nova conversa" title="Nova conversa" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white">
            <PenSquare className="h-[18px] w-[18px]" />
          </button>
        </div>

        <label className={clsx(
            "mt-3 h-12 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] pl-4 pr-2 transition lg:mt-2.5 lg:flex lg:h-auto lg:rounded-lg lg:border-transparent lg:bg-white/[0.07] lg:py-1 lg:pl-3 lg:pr-1 focus-within:border-orbit-purple/60 focus-within:bg-white/[0.06]",
            mobileSearch || searching ? "flex" : "hidden"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && clearSearch()}
            placeholder="Pesquisar conversas e mensagens..."
            autoFocus={mobileSearch}
            aria-label="Pesquisar conversas e mensagens"
            className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-white outline-none placeholder:text-white/45 lg:text-sm"
          />
          {searching ? (
            <button type="button" onClick={clearSearch} aria-label="Limpar pesquisa" className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="Buscar por tipo: fotos, vídeos, áudios, arquivos e links"
              title="Filtrar por tipo"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/[0.06] hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist">
          {searching
            ? KINDS.map((k) => {
                const on = kind === k.id;
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setKind(k.id)}
                    className={clsx(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                      on ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.35)]" : "border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {k.label}
                  </button>
                );
              })
            : FILTERS.map((f) => {
                const n = f.id === "nao-lidas" ? counts.naoLidas : f.id === "arquivadas" ? counts.arquivadas : 0;
                const on = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(f.id)}
                    className={clsx(
                      // Celular: abas de texto como no VK (a ativa num bloco discreto); computador: pílulas.
                      "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[16px] font-medium transition lg:rounded-full lg:px-2.5 lg:py-1 lg:text-[12.5px]",
                      // Arquivadas já fica no ícone do topo no celular.
                      f.id === "arquivadas" && !on && "hidden lg:flex",
                      on
                        ? "bg-white/[0.09] text-white lg:border lg:border-white/25 lg:bg-transparent"
                        : "text-white/55 hover:text-white lg:border lg:border-transparent"
                    )}
                  >
                    {f.label}
                    {n > 0 && (
                      <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 text-[12px] font-bold leading-none text-space-bg lg:h-[18px] lg:min-w-[18px] lg:bg-chat lg:px-1 lg:text-[10.5px] lg:text-snow">
                        {n > 99 ? "99+" : n}
                      </span>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {banner && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-2xl border border-orbit-purple/40 bg-orbit-purple/10 p-3 text-xs text-white/80">
          <p className="flex-1">{banner}</p>
          <button type="button" onClick={onCloseBanner} aria-label="Fechar aviso" className="text-white/50 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Celular: botão de nova conversa flutuante, como no VK. */}
      {!searching && (
        <button
          type="button"
          onClick={onNew}
          aria-label="Nova conversa"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-space-card text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition active:scale-95 lg:hidden"
        >
          <PenSquare className="h-6 w-6" />
        </button>
      )}

      <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto">
        {searching ? (
          <SearchResults query={query} kind={kind} conversations={conversations} onOpen={onOpen} />
        ) : (
          <div className="px-3 pb-28 pt-1 lg:space-y-0.5 lg:px-2 lg:pb-4">
            {saved && filter === "todas" && (
              <div className="pb-2.5 lg:pb-1.5">
                <ConversationItem c={saved} meId={me.id} active={saved.id === activeId} onOpen={onOpen} />
              </div>
            )}
            {others.length === 0 ? (
              <EmptyUniverse onFind={onNew} compact />
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                {filter === "arquivadas" ? <Archive className="h-8 w-8 text-white/25" /> : <Search className="h-8 w-8 text-white/25" />}
                <p className="mt-3 text-sm text-white/50">
                  {filter === "nao-lidas"
                    ? "Tudo em dia por aqui. ✨"
                    : filter === "grupos"
                      ? "Você ainda não está em nenhum grupo."
                      : filter === "arquivadas"
                        ? "Nenhuma conversa arquivada."
                        : "Nenhuma conversa."}
                </p>
              </div>
            ) : (
              visible.map((c) => <ConversationItem key={c.id} c={c} meId={me.id} active={c.id === activeId} onOpen={onOpen} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
