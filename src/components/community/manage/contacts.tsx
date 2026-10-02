"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, X } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { loadCommunityContacts } from "@/lib/community-contacts";
import { useCommunity } from "../context";
import { Card, inputCls, SaveButton } from "./fields";

type Person = { id: string; name: string; username: string; avatarUrl: string | null };
type Row = { user: Person; title: string };

const MAX = 10;

/** Contatos da comunidade, como no VK: quem aparece no bloco "Contatos" e com qual cargo. */
export function ContactsSection() {
  const { community, supabase, toast, refresh } = useCommunity();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saved, setSaved] = useState("[]");
  const [missing, setMissing] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadCommunityContacts(supabase, community.id).then((list) => {
      if (list === null) {
        setMissing(true);
        setRows([]);
        return;
      }
      const r = list.map((c) => ({ user: c.user, title: c.title }));
      setRows(r);
      setSaved(JSON.stringify(r.map((x) => [x.user.id, x.title])));
    });
  }, [supabase, community.id]);

  // Busca entre os membros da comunidade.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setFound([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("CommunityMember")
        .select("user:User!CommunityMember_userId_fkey!inner(id, name, username, avatarUrl)")
        .eq("communityId", community.id)
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`, { referencedTable: "user" })
        .limit(8);
      setFound(((data ?? []) as unknown as { user: Person | null }[]).flatMap((d) => (d.user ? [d.user] : [])));
    }, 250);
    return () => clearTimeout(t);
  }, [query, supabase, community.id]);

  const changed = rows !== null && JSON.stringify(rows.map((x) => [x.user.id, x.title.trim()])) !== saved;
  const move = (i: number, d: number) =>
    setRows((l) => {
      if (!l) return l;
      const n = [...l];
      const [x] = n.splice(i, 1);
      n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x);
      return n;
    });

  async function save() {
    if (!rows) return;
    setBusy(true);
    const payload = rows.map((r) => ({ userId: r.user.id, title: r.title.trim() }));
    const { error } = await supabase.rpc("community_set_contacts" as never, { p_community: community.id, p_contacts: payload } as never);
    setBusy(false);
    if (error) return toast(/invalid_contacts/.test(error.message) ? "Confira os contatos: até 10 pessoas e cargos com até 60 letras." : "Não foi possível salvar agora.", true);
    setSaved(JSON.stringify(payload.map((x) => [x.userId, x.title])));
    toast("Contatos atualizados.");
    refresh();
  }

  if (rows === null)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card
        title="Contatos"
        desc="Quem aparece no bloco Contatos da comunidade e com qual cargo (ex.: President MC®, Vice President MC®, Official Page MC®). Até 10 pessoas. Sem contatos, aparece o dono e a equipe."
      >
        {missing ? (
          <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
            Falta ativar os contatos no banco de dados. Rode o SQL da atualização &quot;community_contacts&quot; no Supabase e volte aqui.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.user.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.02] p-2">
                <Avatar name={r.user.name} url={r.user.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{r.user.name}</p>
                  <input
                    value={r.title}
                    maxLength={60}
                    onChange={(e) => setRows((l) => l && l.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))}
                    placeholder="Cargo (ex.: President MC®)"
                    className={`${inputCls} mt-1 py-2`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-white/60 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Descer" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-white/60 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={() => setRows((l) => l && l.filter((_, k) => k !== i))} aria-label="Remover contato" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-white/60 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {rows.length < MAX && (
              <div className="relative">
                <label className="flex items-center gap-2 rounded-2xl border border-dashed border-white/20 px-4 py-2.5">
                  <Search className="h-4 w-4 text-white/40" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Adicionar contato: buscar membro pelo nome ou @" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
                </label>
                {found.length > 0 && (
                  <div className="mt-1 space-y-0.5 rounded-2xl border border-white/10 bg-space-surface p-1">
                    {found
                      .filter((f) => !rows.some((r) => r.user.id === f.id))
                      .map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => (setRows((l) => [...(l ?? []), { user: f, title: "" }]), setQuery(""), setFound([]))}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.05]"
                        >
                          <Avatar name={f.name} url={f.avatarUrl} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{f.name}</span>
                          <Plus className="h-4 w-4 text-orbit-cyan" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
      {!missing && (
        <div className="flex justify-end">
          <SaveButton busy={busy} disabled={!changed} onClick={save} />
        </div>
      )}
    </div>
  );
}
