"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { AtSign, ChevronDown, ChevronUp, Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { communityError, subjectHashtag, type CommunitySubject } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm, EmptyState, Sheet } from "../ui";

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

/** Assuntos (ator/personagem) + sufixo da comunidade → hashtags do tipo #IanSomerhalderOX. */
export function SubjectsSection() {
  const { supabase, community, toast } = useCommunity();
  const [suffix, setSuffix] = useState((community.hashtagSuffix ?? "").toUpperCase());
  const [savedSuffix, setSavedSuffix] = useState((community.hashtagSuffix ?? "").toUpperCase());
  const [suffixBusy, setSuffixBusy] = useState(false);
  const [suffixErr, setSuffixErr] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<CommunitySubject[] | null>(null);
  const [editing, setEditing] = useState<CommunitySubject | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<CommunitySubject | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("community_hashtags", { p_community: community.id });
    setSubjects(((data ?? []) as CommunitySubject[]).slice());
  }, [supabase, community.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function saveSuffix() {
    const v = suffix.trim().toUpperCase();
    if (v && !/^[A-Za-z0-9]{1,4}$/.test(v)) return setSuffixErr("Use de 1 a 4 letras ou números (ex.: OX).");
    setSuffixBusy(true);
    setSuffixErr(null);
    const { error } = await supabase.rpc("community_set_suffix", { p_community: community.id, p_suffix: v });
    setSuffixBusy(false);
    if (error) return setSuffixErr(communityError(error.message));
    setSavedSuffix(v);
    setSuffix(v);
    community.hashtagSuffix = v || null; // reflete no contexto local (composer/preview)
    toast(v ? `Sufixo definido: ${v}` : "Sufixo removido.");
    load();
  }

  async function remove() {
    if (!confirmDel) return;
    setBusy(true);
    const { error } = await supabase.rpc("community_hashtag_delete", { p_hashtag: confirmDel.id });
    setBusy(false);
    setConfirmDel(null);
    if (error) return toast(communityError(error.message), true);
    toast("Assunto excluído. As publicações continuam na comunidade.");
    load();
  }

  async function move(i: number, dir: -1 | 1) {
    if (!subjects) return;
    const j = i + dir;
    if (j < 0 || j >= subjects.length) return;
    const next = [...subjects];
    [next[i], next[j]] = [next[j], next[i]];
    setSubjects(next);
    setBusy(true);
    await supabase.rpc("community_hashtag_reorder", { p_community: community.id, p_ids: next.map((s) => s.id) });
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      {/* Sufixo da comunidade */}
      <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <AtSign className="h-4 w-4 text-orbit-cyan" /> Sufixo da comunidade
        </p>
        <p className="mt-1 text-xs text-white/50">
          Um código curto (1 ou 2 letras) que entra no fim de toda hashtag de assunto, para separar de outras comunidades. Ex.: <span className="text-white/75">OX</span>, <span className="text-white/75">DA</span>.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={suffix}
            onChange={(e) => setSuffix(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase())}
            placeholder="OX"
            aria-label="Sufixo da comunidade"
            className={clsx(field, "w-28 text-center font-bold tracking-widest")}
          />
          <button
            type="button"
            onClick={saveSuffix}
            disabled={suffixBusy || suffix.trim().toUpperCase() === savedSuffix}
            className="flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow disabled:opacity-50"
          >
            {suffixBusy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
        <p className="mt-2 text-xs text-white/45">
          Prévia: <span className="font-semibold text-orbit-cyan">{subjectHashtag("Ian Somerhalder", suffix)}</span>
        </p>
        {suffixErr && <p className="mt-2 text-xs text-red-300">{suffixErr}</p>}
      </section>

      {/* Catálogo de assuntos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/50">Cadastre os nomes (ator, personagem, tema). Cada um vira uma hashtag pesquisável com o sufixo no fim.</p>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow"
          >
            <Plus className="h-4 w-4" /> Novo assunto
          </button>
        </div>

        {!subjects ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState icon={<Hash className="h-6 w-6" />} title="Nenhum assunto ainda" text="Cadastre atores, personagens ou temas. Ao publicar, viram chips que inserem a hashtag; e as pessoas acham por nome." />
        ) : (
          <ul className="space-y-2">
            {subjects.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3">
                <div className="flex shrink-0 flex-col">
                  <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Subir" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" disabled={busy || i === subjects.length - 1} onClick={() => move(i, 1)} aria-label="Descer" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => setEditing(s)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-white">{s.label}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
                    <span className="rounded-full bg-orbit-purple/15 px-1.5 py-0.5 font-semibold text-orbit-cyan">{subjectHashtag(s.label, savedSuffix)}</span>
                    <span>{s.count} publicaç{s.count === 1 ? "ão" : "ões"}</span>
                  </span>
                </button>
                <button type="button" onClick={() => setConfirmDel(s)} aria-label="Excluir assunto" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-300/80 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <SubjectEditor
          subject={editing === "new" ? null : editing}
          suffix={savedSuffix}
          onClose={() => setEditing(null)}
          onSaved={() => (setEditing(null), load(), toast("Assunto salvo."))}
        />
      )}
      <Confirm
        open={!!confirmDel}
        title="Excluir assunto?"
        message="O assunto sai do catálogo. As publicações já feitas continuam na comunidade — só param de aparecer nesta lista."
        confirmLabel="Excluir assunto"
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  );
}

function SubjectEditor({ subject, suffix, onClose, onSaved }: { subject: CommunitySubject | null; suffix: string; onClose: () => void; onSaved: () => void }) {
  const { supabase, community } = useCommunity();
  const [label, setLabel] = useState(subject?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (label.trim().length < 1) return setError("Digite o nome do assunto.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("community_hashtag_save", { p_community: community.id, p: { id: subject?.id, label: label.trim() } as never });
    setBusy(false);
    if (e) return setError(/hashtag_taken/.test(e.message) ? "Já existe um assunto com esse nome." : /too_many_hashtags/.test(e.message) ? "Limite de assuntos atingido." : communityError(e.message));
    onSaved();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={subject ? "Editar assunto" : "Novo assunto"}
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <span className="min-w-0 flex-1" />}
          <button type="button" onClick={save} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Nome (ex.: Ian Somerhalder)" className={clsx(field, "font-semibold")} autoFocus />
        <p className="text-xs text-white/45">
          Hashtag gerada: <span className="font-semibold text-orbit-cyan">{label.trim() ? subjectHashtag(label, suffix) : "—"}</span>
        </p>
        {!suffix && <p className="text-[11px] text-amber-400/90">Defina o sufixo da comunidade acima para as hashtags ficarem completas.</p>}
      </div>
    </Sheet>
  );
}
