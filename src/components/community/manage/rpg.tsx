"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { communityError } from "@/lib/communities";
import { RPG_FIELD_TYPES, type RpgConfig, type RpgField, type RpgFieldType } from "@/lib/rpg";
import { useCommunity } from "../context";
import { Confirm, EmptyState, Sheet } from "../ui";

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-space-bg/40 p-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="block text-xs text-white/45">{hint}</span>}
      </span>
      <span className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-orbit-gradient" : "bg-white/15")}>
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function RpgSection() {
  const { supabase, community, toast } = useCommunity();
  const [config, setConfig] = useState<RpgConfig | null>(null);
  const [fields, setFields] = useState<RpgField[] | null>(null);
  const [editing, setEditing] = useState<RpgField | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<RpgField | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: cfg }, { data: fl }] = await Promise.all([
      supabase.rpc("rpg_config", { p_community: community.id }),
      supabase.rpc("rpg_fields", { p_community: community.id }),
    ]);
    setConfig((Array.isArray(cfg) ? cfg[0] : null) as RpgConfig | null);
    setFields((fl ?? []) as RpgField[]);
  }, [supabase, community.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig(patch: Partial<RpgConfig>) {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setBusy(true);
    const { error } = await supabase.rpc("rpg_set_config", {
      p_community: community.id,
      p: { isRpg: next.isRpg, requireApproval: next.requireApproval, whoCanCreate: next.whoCanCreate, allowHtml: next.allowHtml, intro: next.intro } as never,
    });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
  }

  async function move(i: number, dir: -1 | 1) {
    if (!fields) return;
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
    await supabase.rpc("rpg_field_reorder", { p_community: community.id, p_ids: next.map((f) => f.id) });
  }

  async function remove() {
    if (!confirmDel) return;
    setBusy(true);
    const { error } = await supabase.rpc("rpg_field_delete", { p_field: confirmDel.id });
    setBusy(false);
    setConfirmDel(null);
    if (error) return toast(communityError(error.message), true);
    toast("Campo excluído.");
    load();
  }

  if (!config || !fields) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-6">
      <Toggle on={config.isRpg} onChange={(v) => saveConfig({ isRpg: v })} label="Ativar sistema de fichas (RPG)" hint="Cria a área 'Personagens / Fichas' na comunidade." />

      {config.isRpg && (
        <>
          <section className="space-y-3 rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
            <p className="text-sm font-semibold text-white">Configurações do RPG</p>
            <Toggle on={config.requireApproval} onChange={(v) => saveConfig({ requireApproval: v })} label="Aprovar fichas antes de publicar" hint="Novas fichas ficam pendentes até um admin aprovar." />
            <Toggle on={config.allowHtml} onChange={(v) => saveConfig({ allowHtml: v })} label="Permitir personalização por HTML" hint="HTML de formatação, sanitizado. Sem scripts." />
            <div>
              <label className="mb-1 block text-xs text-white/60">Quem pode criar personagem</label>
              <select value={config.whoCanCreate} onChange={(e) => saveConfig({ whoCanCreate: e.target.value as RpgConfig["whoCanCreate"] })} className={field}>
                <option value="member">Qualquer membro</option>
                <option value="editor">Editores e acima</option>
                <option value="admin">Somente administradores</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Introdução (opcional)</label>
              <textarea value={config.intro ?? ""} onChange={(e) => setConfig({ ...config, intro: e.target.value })} onBlur={() => saveConfig({ intro: config.intro })} rows={2} maxLength={500} placeholder="Explique o RPG para os membros…" className={clsx(field, "resize-y")} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/50">Campos da ficha. Cada personagem preenche estes campos. Agrupe por seção (ex.: Visão Geral, História).</p>
              <button type="button" onClick={() => setEditing("new")} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow">
                <Plus className="h-4 w-4" /> Novo campo
              </button>
            </div>
            {fields.length === 0 ? (
              <EmptyState icon={<Plus className="h-6 w-6" />} title="Nenhum campo ainda" text="Adicione campos como Nome, Idade, História, Aparência, Habilidades…" />
            ) : (
              <ul className="space-y-2">
                {fields.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3">
                    <div className="flex shrink-0 flex-col">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
                      <button type="button" disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label="Descer" className="text-white/40 hover:text-white disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
                    </div>
                    <button type="button" onClick={() => setEditing(f)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold text-white">{f.label}{f.required && <span className="text-orbit-pink"> *</span>}</span>
                      <span className="text-[11px] text-white/45">{RPG_FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type}{f.section ? ` · ${f.section}` : ""}</span>
                    </button>
                    <button type="button" onClick={() => setConfirmDel(f)} aria-label="Excluir campo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-300/80 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {editing && <FieldEditor field={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), load(), toast("Campo salvo."))} />}
      <Confirm open={!!confirmDel} title="Excluir campo?" message="O campo sai da ficha. Fichas já preenchidas mantêm o valor guardado, mas ele deixa de aparecer." confirmLabel="Excluir campo" busy={busy} onConfirm={remove} onClose={() => setConfirmDel(null)} />
    </div>
  );
}

function FieldEditor({ field: existing, onClose, onSaved }: { field: RpgField | null; onClose: () => void; onSaved: () => void }) {
  const { supabase, community } = useCommunity();
  const [label, setLabel] = useState(existing?.label ?? "");
  const [type, setType] = useState<RpgFieldType>(existing?.type ?? "text");
  const [section, setSection] = useState(existing?.section ?? "");
  const [required, setRequired] = useState(existing?.required ?? false);
  const [options, setOptions] = useState((existing?.options ?? []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (label.trim().length < 1) return setError("Dê um nome ao campo.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("rpg_field_save", {
      p_community: community.id,
      p: {
        id: existing?.id,
        label: label.trim(),
        type,
        required,
        section: section.trim(),
        options: type === "select" ? options.split("\n").map((o) => o.trim()).filter(Boolean) : [],
      } as never,
    });
    setBusy(false);
    if (e) return setError(communityError(e.message));
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={existing ? "Editar campo" : "Novo campo da ficha"} footer={
      <div className="flex items-center gap-2">
        {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <span className="min-w-0 flex-1" />}
        <button type="button" onClick={save} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    }>
      <div className="space-y-3 pt-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Nome do campo (ex.: História)" className={clsx(field, "font-semibold")} autoFocus />
        <div>
          <label className="mb-1 block text-xs text-white/60">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as RpgFieldType)} className={field}>
            {RPG_FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {type === "select" && (
          <div>
            <label className="mb-1 block text-xs text-white/60">Opções (uma por linha)</label>
            <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={4} className={clsx(field, "resize-y")} placeholder={"Ativo\nInativo\nEm jogo"} />
          </div>
        )}
        <input value={section} onChange={(e) => setSection(e.target.value)} maxLength={40} placeholder="Seção (opcional, ex.: Visão Geral)" className={field} />
        <label className="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--app-accent,139_92_246))]" />
          Campo obrigatório
        </label>
      </div>
    </Sheet>
  );
}
