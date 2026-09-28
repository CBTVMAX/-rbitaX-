"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { BadgeCheck, Check, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const RELATIONS = [
  "Pai", "Mãe", "Padrasto", "Madrasta", "Irmão", "Irmã", "Filho", "Filha", "Avô", "Avó",
  "Neto", "Neta", "Tio", "Tia", "Primo", "Prima", "Sobrinho", "Sobrinha", "Enteado", "Enteada",
  "Cônjuge", "Companheiro(a)", "Outro",
] as const;

export type FamilyMember = { relativeId: string; relation: string; username: string; name: string; avatarUrl: string | null; isVerified: boolean };
export type FamilyRequest = { id: string; userId: string; username: string; name: string; avatarUrl: string | null; relation: string; createdAt: string };
type Found = { id: string; name: string; username: string; avatarUrl: string | null };

export function ProfileFamily({
  isMe,
  family,
  requests,
}: {
  isMe: boolean;
  family: FamilyMember[];
  requests: FamilyRequest[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function respond(id: string, accept: boolean, relation?: string) {
    await supabase.rpc("family_respond", { p_link_id: id, p_accept: accept, p_relation: relation ?? null });
    router.refresh();
  }
  async function remove(relativeId: string) {
    await supabase.rpc("family_remove", { p_relative_id: relativeId });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isMe && requests.length > 0 && (
        <div className="rounded-2xl border border-orbit-purple/40 bg-orbit-purple/5 p-4">
          <p className="mb-3 text-sm font-semibold text-white">Pedidos de parentesco</p>
          <div className="space-y-2">
            {requests.map((r) => (
              <RequestRow key={r.id} req={r} onRespond={respond} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-orbit-cyan" /> Parentes
          </p>
          {isMe && (
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow">
              <UserPlus className="h-3.5 w-3.5" /> Adicionar parente
            </button>
          )}
        </div>

        {family.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/50">{isMe ? "Você ainda não adicionou parentes." : "Nenhum parente adicionado."}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {family.map((m) => (
              <div key={m.relativeId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-2.5">
                <Avatar name={m.name} url={m.avatarUrl} />
                <Link href={`/perfil/${m.username}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-white">
                    {m.name} {m.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-orbit-blue" />}
                  </p>
                  <p className="truncate text-xs text-orbit-cyan">{m.relation}</p>
                </Link>
                {isMe && (
                  <button type="button" onClick={() => remove(m.relativeId)} aria-label="Remover" className="rounded-full p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && <AddFamilyDialog onClose={() => setAdding(false)} excludeIds={family.map((f) => f.relativeId)} />}
    </div>
  );
}

function RequestRow({ req, onRespond }: { req: FamilyRequest; onRespond: (id: string, accept: boolean, relation?: string) => void }) {
  const [rel, setRel] = useState(defaultInverse(req.relation));
  return (
    <div className="rounded-xl border border-white/10 bg-space-bg/40 p-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={req.name} url={req.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white"><span className="font-medium">{req.name}</span> quer te adicionar como <span className="text-orbit-cyan">{req.relation}</span></p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-white/50">Você é:</span>
        <select value={rel} onChange={(e) => setRel(e.target.value)} className="rounded-lg border border-white/10 bg-space-card px-2 py-1.5 text-xs text-white outline-none">
          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="button" onClick={() => onRespond(req.id, true, rel)} className="ml-auto flex items-center gap-1 rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow">
          <Check className="h-3.5 w-3.5" /> Confirmar
        </button>
        <button type="button" onClick={() => onRespond(req.id, false)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5">Recusar</button>
      </div>
    </div>
  );
}

export function AddFamilyDialog({ onClose, excludeIds = [] }: { onClose: () => void; excludeIds?: string[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [picked, setPicked] = useState<Found | null>(null);
  const [relation, setRelation] = useState<string>("Mãe");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    const q = query.trim();
    if (picked || q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(async () => {
      // Busca por NOME ou @usuário (digitar o nome da pessoa já mostra a lista).
      const escaped = q.replace(/[%,()]/g, " ");
      const { data } = await supabase
        .from("User")
        .select("id, name, username, avatarUrl")
        .or(`name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
        .limit(12);
      const hide = new Set([...(meId ? [meId] : []), ...excludeIds]);
      setResults(((data ?? []) as Found[]).filter((u) => !hide.has(u.id)).slice(0, 8));
      setLoading(false);
      setSearched(true);
    }, 220);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, picked, supabase, meId, excludeIds]);

  async function submit() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("family_add", { p_relative_id: picked.id, p_relation: relation });
    setBusy(false);
    if (e) { setError(/rate/.test(e.message) ? "Muitos pedidos. Aguarde um pouco." : "Não foi possível enviar o pedido."); return; }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="animate-sheet-up relative w-full max-w-md rounded-t-3xl border border-white/10 bg-space-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold text-white">Adicionar membro da família</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/55 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-sm text-white/55">Pesquise uma pessoa do Órbita X para adicionar à sua família.</p>

        {picked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-bg/40 p-2.5">
              <Avatar name={picked.name} url={picked.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{picked.name}</p>
                <p className="truncate text-xs text-white/50">@{picked.username}</p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-orbit-cyan">Trocar</button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Qual é o parentesco?</span>
              <select value={relation} onChange={(e) => setRelation(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-space-card px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60">
                {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button type="button" onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Adicionar parente
            </button>
            <p className="text-center text-[11px] text-white/40">A pessoa precisa confirmar antes de aparecer nos dois perfis.</p>
          </div>
        ) : (
          <div>
            <label className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-space-bg/50 px-3 py-2.5 focus-within:border-orbit-purple/60">
              <Search className="h-4 w-4 text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por nome ou @usuário..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/40" />}
            </label>
            <div className="mt-2 space-y-1">
              {results.map((r) => (
                <button key={r.id} type="button" onClick={() => setPicked(r)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
                  <Avatar name={r.name} url={r.avatarUrl} />
                  <div className="min-w-0"><p className="truncate text-sm text-white">{r.name}</p><p className="truncate text-xs text-white/50">@{r.username}</p></div>
                </button>
              ))}
              {!loading && searched && results.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-white/45">Nenhuma pessoa encontrada.</p>
              )}
              {query.trim().length < 2 && (
                <p className="px-2 py-4 text-center text-xs text-white/35">Digite o nome ou o @usuário para ver a lista de pessoas.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function defaultInverse(relation: string): string {
  const map: Record<string, string> = {
    Pai: "Filho", Mãe: "Filho", Padrasto: "Enteado", Madrasta: "Enteado", Irmão: "Irmão", Irmã: "Irmão",
    Filho: "Pai", Filha: "Pai", Avô: "Neto", Avó: "Neto", Neto: "Avô", Neta: "Avô", Tio: "Sobrinho", Tia: "Sobrinho",
    Primo: "Primo", Prima: "Primo", Sobrinho: "Tio", Sobrinha: "Tio", Enteado: "Padrasto", Enteada: "Padrasto",
    Cônjuge: "Cônjuge", "Companheiro(a)": "Companheiro(a)",
  };
  return map[relation] ?? "Outro";
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-xs text-white/70">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
