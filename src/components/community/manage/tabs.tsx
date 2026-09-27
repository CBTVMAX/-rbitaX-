"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp, Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { communityError } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm, EmptyState, Sheet } from "../ui";

type Tab = { id: string; name: string; hashtags: string[]; sortOrder: number; count?: number };

export function TabsSection() {
  const { supabase, community, toast } = useCommunity();
  const [tabs, setTabs] = useState<Tab[] | null>(null);
  const [editing, setEditing] = useState<Tab | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<Tab | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("CommunityTab").select("id, name, hashtags, sortOrder").eq("communityId", community.id).order("sortOrder");
    const list = ((data ?? []) as unknown as { id: string; name: string; hashtags: string[]; sortOrder: number }[]).map((t) => ({ ...t, hashtags: Array.isArray(t.hashtags) ? t.hashtags : [] }));
    // contagem de posts por aba (leve; poucas abas)
    const counts = await Promise.all(list.map((t) => supabase.from("CommunityTabPost").select("postId", { count: "exact", head: true }).eq("tabId", t.id)));
    setTabs(list.map((t, i) => ({ ...t, count: counts[i].count ?? 0 })));
  }, [supabase, community.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function move(i: number, dir: -1 | 1) {
    if (!tabs) return;
    const j = i + dir;
    if (j < 0 || j >= tabs.length) return;
    const next = [...tabs];
    [next[i], next[j]] = [next[j], next[i]];
    setTabs(next);
    setBusy(true);
    await supabase.rpc("community_tab_reorder", { p_community: community.id, p_ids: next.map((t) => t.id) });
    setBusy(false);
  }

  async function remove() {
    if (!confirmDel) return;
    setBusy(true);
    const { error } = await supabase.rpc("community_tab_delete", { p_tab: confirmDel.id });
    setBusy(false);
    setConfirmDel(null);
    if (error) return toast(communityError(error.message), true);
    toast("Aba excluída. As publicações continuam na comunidade.");
    load();
  }

  if (!tabs) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">Organize o mural em abas (ex.: Avatares, Designs). Uma publicação pode estar em várias abas — sem repostar.</p>
        <button type="button" onClick={() => setEditing("new")} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow">
          <Plus className="h-4 w-4" /> Nova aba
        </button>
      </div>

      {tabs.length === 0 ? (
        <EmptyState icon={<Hash className="h-6 w-6" />} title="Nenhuma aba ainda" text="Crie abas para separar seu conteúdo. Você pode associar por hashtag automaticamente." />
      ) : (
        <ul className="space-y-2">
          {tabs.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3">
              <div className="flex shrink-0 flex-col">
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Subir" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" disabled={busy || i === tabs.length - 1} onClick={() => move(i, 1)} aria-label="Descer" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => setEditing(t)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-white">{t.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-white/45">
                  <span>{t.count} publicaç{t.count === 1 ? "ão" : "ões"}</span>
                  {t.hashtags.map((h) => (
                    <span key={h} className="rounded-full bg-orbit-purple/15 px-1.5 py-0.5 text-orbit-cyan">#{h}</span>
                  ))}
                </span>
              </button>
              <button type="button" onClick={() => setConfirmDel(t)} aria-label="Excluir aba" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-300/80 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {editing && <TabEditor tab={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), load(), toast("Aba salva."))} />}
      <Confirm open={!!confirmDel} title="Excluir aba?" message="A aba será removida. As publicações continuam na comunidade, só deixam de aparecer nesta aba." confirmLabel="Excluir aba" busy={busy} onConfirm={remove} onClose={() => setConfirmDel(null)} />
    </div>
  );
}

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

function TabEditor({ tab, onClose, onSaved }: { tab: Tab | null; onClose: () => void; onSaved: () => void }) {
  const { supabase, community } = useCommunity();
  const [name, setName] = useState(tab?.name ?? "");
  const [tags, setTags] = useState<string[]>(tab?.hashtags ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string) {
    const h = raw.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9_à-ÿ]/gi, "").slice(0, 50);
    if (h && !tags.includes(h)) setTags((t) => [...t, h]);
    setInput("");
  }

  async function save() {
    if (name.trim().length < 1) return setError("Dê um nome à aba.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("community_tab_save", { p_community: community.id, p: { id: tab?.id, name: name.trim(), hashtags: tags } as never });
    setBusy(false);
    if (e) return setError(/tab_name_taken/.test(e.message) ? "Já existe uma aba com esse nome." : /too_many_tabs/.test(e.message) ? "Limite de abas atingido." : communityError(e.message));
    onSaved();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={tab ? "Editar aba" : "Nova aba do mural"}
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <span className="min-w-0 flex-1" />}
          <button type="button" onClick={save} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nome da aba (ex.: Avatares)" className={clsx(field, "font-semibold")} autoFocus />
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/60">Classificação automática por hashtag</p>
          <p className="mb-2 text-[11px] text-white/40">Publicações com estas hashtags entram nesta aba automaticamente. Ex.: #avataresda</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((h) => (
              <button key={h} type="button" onClick={() => setTags((t) => t.filter((x) => x !== h))} className="inline-flex items-center gap-1 rounded-full bg-orbit-purple/15 px-2.5 py-1 text-xs font-semibold text-orbit-cyan">
                #{h} <span className="text-white/40">×</span>
              </button>
            ))}
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTag(input))}
            onBlur={() => input && addTag(input)}
            placeholder="Digite uma hashtag e Enter"
            className={clsx(field, "mt-2")}
          />
        </div>
      </div>
    </Sheet>
  );
}
