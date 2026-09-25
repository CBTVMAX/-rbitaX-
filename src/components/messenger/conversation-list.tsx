"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Archive, PenSquare, Search, X } from "lucide-react";
import { PresenceStatus } from "@/components/presence-picker";
import { conversationTitle, type Conversation } from "@/lib/messenger/types";
import { ConversationItem } from "./conversation-item";
import { OrbitIllustration, PrimaryButton } from "./ui";
import { useMessenger } from "./context";

export type ListFilter = "todas" | "nao-lidas" | "grupos" | "arquivadas";

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "nao-lidas", label: "Não lidas" },
  { id: "grupos", label: "Grupos" },
  { id: "arquivadas", label: "Arquivadas" },
];

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

export function ConversationList({
  activeId,
  onOpen,
  onNew,
  presence,
  banner,
  onCloseBanner,
}: {
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  presence: string;
  banner: string | null;
  onCloseBanner: () => void;
}) {
  const { me, conversations } = useMessenger();
  const [filter, setFilter] = useState<ListFilter>("todas");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      naoLidas: conversations.filter((c) => !c.archivedAt && c.unread > 0).length,
      arquivadas: conversations.filter((c) => c.archivedAt).length,
    }),
    [conversations]
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return conversations.filter((c) => {
      if (filter === "arquivadas" ? !c.archivedAt : c.archivedAt) return false;
      if (filter === "nao-lidas" && c.unread === 0) return false;
      if (filter === "grupos" && !c.isGroup) return false;
      if (!q) return true;
      return (
        normalize(conversationTitle(c)).includes(q) ||
        (!!c.otherUser && normalize(c.otherUser.username).includes(q.replace(/^@/, "")))
      );
    });
  }, [conversations, filter, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Mensagens</h1>
            <PresenceStatus userId={me.id} initial={presence} editable className="mt-1" />
          </div>
          <button
            type="button"
            onClick={onNew}
            aria-label="Nova conversa"
            title="Nova conversa"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:scale-105 hover:opacity-95 active:scale-95"
          >
            <PenSquare className="h-[18px] w-[18px]" />
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-orbit-purple/60 focus-within:bg-white/[0.06]">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar conversas..."
            aria-label="Pesquisar conversas"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar pesquisa" className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="tablist">
          {FILTERS.map((f) => {
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
                  "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                  on
                    ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgba(139,92,246,0.35)]"
                    : "border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                )}
              >
                {f.label}
                {n > 0 && (
                  <span className={clsx("rounded-full px-1.5 text-[10px] font-bold", on ? "bg-white/25" : "bg-white/10")}>{n}</span>
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

      <div className="orbit-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <EmptyUniverse onFind={onNew} compact />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            {filter === "arquivadas" ? <Archive className="h-8 w-8 text-white/25" /> : <Search className="h-8 w-8 text-white/25" />}
            <p className="mt-3 text-sm text-white/50">
              {query
                ? "Nenhuma conversa encontrada."
                : filter === "nao-lidas"
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
    </div>
  );
}
