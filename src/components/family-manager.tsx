"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, BadgeCheck, Check, Clock, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AddFamilyDialog, RELATIONS, type FamilyMember, type FamilyRequest } from "@/components/profile-family";

type Sent = { id: string; relativeId: string; username: string; name: string; avatarUrl: string | null; relation: string; createdAt: string };

/** Tela dedicada "Parentes" (Perfil → Informações pessoais → Parentes). */
export function FamilyManager({
  family,
  requests,
  sent,
}: {
  family: FamilyMember[];
  requests: FamilyRequest[];
  sent: Sent[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  async function respond(id: string, accept: boolean, relation?: string) {
    await supabase.rpc("family_respond", { p_link_id: id, p_accept: accept, p_relation: relation ?? null });
    router.refresh();
  }
  async function changeRelation(relativeId: string, relation: string) {
    await supabase.rpc("family_update_relation", { p_relative_id: relativeId, p_relation: relation });
    router.refresh();
  }
  async function remove(relativeId: string) {
    await supabase.rpc("family_remove", { p_relative_id: relativeId });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-white/10 bg-space-bg/90 px-4 py-3 backdrop-blur md:mx-0 md:rounded-t-2xl md:border md:border-b-0">
        <Link href="/configuracoes/conta" aria-label="Voltar" className="rounded-full p-1.5 text-white/70 hover:bg-white/5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-white">Parentes</h1>
        {family.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? "Concluir" : "Editar"}
            className={clsx("rounded-full p-2 transition", editing ? "bg-orbit-purple/20 text-orbit-cyan" : "text-white/70 hover:bg-white/5")}
          >
            {editing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </button>
        )}
      </header>

      <div className="space-y-4 py-4 md:rounded-b-2xl md:border md:border-t-0 md:border-white/10 md:bg-space-surface/40 md:px-4">
        {/* Pedidos recebidos */}
        {requests.length > 0 && (
          <section className="rounded-2xl border border-orbit-purple/40 bg-orbit-purple/5 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Solicitações de parentesco</p>
            <div className="space-y-2">
              {requests.map((r) => (
                <RequestRow key={r.id} req={r} onRespond={respond} />
              ))}
            </div>
          </section>
        )}

        {/* Enviadas (pendentes) */}
        {sent.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-space-surface/70 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Aguardando confirmação</p>
            <div className="space-y-2">
              {sent.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-2.5">
                  <Avatar name={s.name} url={s.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{s.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-white/50"><Clock className="h-3 w-3" /> {s.relation} · pendente</p>
                  </div>
                  <button type="button" onClick={() => remove(s.relativeId)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5">
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lista de parentes */}
        {family.length === 0 && requests.length === 0 && sent.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-space-surface/70 p-8 text-center">
            <p className="text-sm text-white/70">Você ainda não adicionou nenhum parente.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/70">
            {family.map((m) => (
              <div key={m.relativeId} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={m.name} url={m.avatarUrl} big />
                {editing ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-[15px] font-medium text-white">
                        {m.name} {m.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-orbit-blue" />}
                      </p>
                      <select
                        value={RELATIONS.includes(m.relation as (typeof RELATIONS)[number]) ? m.relation : "Outro"}
                        onChange={(e) => changeRelation(m.relativeId, e.target.value)}
                        className="mt-1 rounded-lg border border-white/10 bg-space-card px-2 py-1 text-xs text-white outline-none"
                      >
                        {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => remove(m.relativeId)} aria-label="Remover" className="rounded-full p-2 text-white/50 hover:bg-white/5 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Link href={`/perfil/${m.username}`} className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-[15px] font-medium text-white">
                      {m.name} {m.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-orbit-blue" />}
                    </p>
                    <p className="truncate text-sm text-white/50">{m.relation}</p>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 px-1 text-[15px] font-semibold text-orbit-cyan">
          <UserPlus className="h-5 w-5" /> Adicionar parente
        </button>
      </div>

      {adding && <AddFamilyDialog onClose={() => setAdding(false)} excludeIds={family.map((f) => f.relativeId)} />}
    </div>
  );
}

function RequestRow({ req, onRespond }: { req: FamilyRequest; onRespond: (id: string, accept: boolean, relation?: string) => void }) {
  const [rel, setRel] = useState(inverse(req.relation));
  return (
    <div className="rounded-xl border border-white/10 bg-space-bg/40 p-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={req.name} url={req.avatarUrl} />
        <p className="min-w-0 flex-1 truncate text-sm text-white">
          <span className="font-medium">{req.name}</span> quer te adicionar como <span className="text-orbit-cyan">{req.relation}</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-white/50">Você é:</span>
        <select value={rel} onChange={(e) => setRel(e.target.value)} className="rounded-lg border border-white/10 bg-space-card px-2 py-1.5 text-xs text-white outline-none">
          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="button" onClick={() => onRespond(req.id, true, rel)} className="ml-auto flex items-center gap-1 rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow"><Check className="h-3.5 w-3.5" /> Aceitar</button>
        <button type="button" onClick={() => onRespond(req.id, false)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5">Recusar</button>
      </div>
    </div>
  );
}

function inverse(relation: string): string {
  const map: Record<string, string> = {
    Pai: "Filho", Mãe: "Filho", Padrasto: "Enteado", Madrasta: "Enteado", Irmão: "Irmão", Irmã: "Irmão",
    Filho: "Pai", Filha: "Pai", Avô: "Neto", Avó: "Neto", Neto: "Avô", Neta: "Avô", Tio: "Sobrinho", Tia: "Sobrinho",
    Primo: "Primo", Prima: "Primo", Sobrinho: "Tio", Sobrinha: "Tio", Enteado: "Padrasto", Enteada: "Padrasto",
    Cônjuge: "Cônjuge", "Companheiro(a)": "Companheiro(a)",
  };
  return map[relation] ?? "Outro";
}

function Avatar({ name, url, big }: { name: string; url: string | null; big?: boolean }) {
  return (
    <span className={clsx("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-white/70", big ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs")}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
