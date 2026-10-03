"use client";

import { useState } from "react";
import { Briefcase, GraduationCap, Home, Languages, Plus, Quote, Sparkles, Trash2, X } from "lucide-react";
import { Field, inputClass, Section, selectClass, SelectWrap } from "@/components/profile-edit/form-ui";
import {
  EDUCATION_LEVELS,
  HABIT_VIEWS,
  LANGUAGE_OPTIONS,
  LIFE_PRIORITIES,
  PEOPLE_VALUES,
  type ProfileAbout,
  type ProfileCareer,
  type ProfileEducation,
} from "@/lib/profile-options";

const MAX_LANGUAGES = 10;
const MAX_ITEMS = 5;
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 6 - 1950 + 1 }, (_, i) => String(thisYear + 6 - i));

const smallInput = inputClass.replace("px-4 py-3", "px-3 py-2.5");
const smallSelect = selectClass.replace("px-4 py-3", "px-3 py-2.5");

type Set = (patch: Partial<ProfileAbout>) => void;

function YearSelect({ value, onChange, placeholder }: { value?: number; onChange: (v?: number) => void; placeholder: string }) {
  return (
    <SelectWrap>
      <select value={value ? String(value) : ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} className={smallSelect}>
        <option value="">{placeholder}</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </SelectWrap>
  );
}

function Choice({ value, onChange, options, placeholder }: { value?: string; onChange: (v?: string) => void; options: string[]; placeholder: string }) {
  return (
    <SelectWrap>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={selectClass}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </SelectWrap>
  );
}

function ItemCard({ children, onRemove, label }: { children: React.ReactNode; onRemove: () => void; label: string }) {
  return (
    <div className="relative space-y-2 rounded-xl border border-white/10 bg-space-bg/40 p-3 pr-11">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-sm font-medium text-orbit-cyan transition hover:border-orbit-purple/50"
    >
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

/** Cidade natal e idiomas. */
export function OriginSection({ about, set }: { about: ProfileAbout; set: Set }) {
  const languages = about.languages ?? [];
  const [other, setOther] = useState("");
  const add = (lang: string) => {
    const v = lang.trim().slice(0, 30);
    if (!v || languages.length >= MAX_LANGUAGES || languages.some((l) => l.toLowerCase() === v.toLowerCase())) return;
    set({ languages: [...languages, v] });
  };
  return (
    <Section title="Cidade natal e idiomas" subtitle="De onde você é e quais idiomas fala." icon={Home}>
      <Field label="Cidade natal" icon={Home}>
        <input value={about.hometown ?? ""} onChange={(e) => set({ hometown: e.target.value })} maxLength={80} placeholder="Ex.: Salvador, Bahia" className={inputClass} />
      </Field>
      <Field label="Idiomas" icon={Languages}>
        <div className="space-y-2">
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {languages.map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full border border-orbit-purple/40 bg-orbit-purple/10 py-1 pl-3 pr-1.5 text-xs text-white">
                  {l}
                  <button type="button" onClick={() => set({ languages: languages.filter((x) => x !== l) })} aria-label={`Remover ${l}`} className="rounded-full p-0.5 text-white/60 hover:bg-white/10 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {languages.length < MAX_LANGUAGES && (
            <div className="flex gap-2">
              <SelectWrap>
                <select
                  value=""
                  onChange={(e) => (e.target.value === "__other" ? setOther(" ") : add(e.target.value))}
                  className={selectClass}
                >
                  <option value="">Adicionar idioma…</option>
                  {LANGUAGE_OPTIONS.filter((o) => !languages.includes(o)).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  <option value="__other">Outro…</option>
                </select>
              </SelectWrap>
            </div>
          )}
          {other !== "" && (
            <div className="flex gap-2">
              <input
                autoFocus
                value={other.trimStart()}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add(other), setOther(""))}
                maxLength={30}
                placeholder="Nome do idioma"
                className={smallInput}
              />
              <button type="button" onClick={() => (add(other), setOther(""))} className="shrink-0 rounded-xl bg-orbit-gradient px-4 text-sm font-semibold text-snow">
                Adicionar
              </button>
            </div>
          )}
        </div>
      </Field>
    </Section>
  );
}

/** Formação: escolas, faculdades e cursos. */
export function EducationSection({ about, set }: { about: ProfileAbout; set: Set }) {
  const items = about.education ?? [];
  const update = (i: number, patch: Partial<ProfileEducation>) => set({ education: items.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  return (
    <Section title="Formação" subtitle="Escola, faculdade, cursos técnicos e livres." icon={GraduationCap}>
      {items.map((e, i) => (
        <ItemCard key={i} label="Remover formação" onRemove={() => set({ education: items.filter((_, j) => j !== i) })}>
          <SelectWrap>
            <select value={e.level ?? ""} onChange={(ev) => update(i, { level: ev.target.value || undefined })} className={smallSelect}>
              <option value="">Nível</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </SelectWrap>
          <input value={e.school} onChange={(ev) => update(i, { school: ev.target.value })} maxLength={100} placeholder="Instituição (ex.: USP)" className={smallInput} />
          <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
            <input value={e.course ?? ""} onChange={(ev) => update(i, { course: ev.target.value })} maxLength={100} placeholder="Curso" className={smallInput} />
            <YearSelect value={e.year} onChange={(year) => update(i, { year })} placeholder="Ano" />
          </div>
        </ItemCard>
      ))}
      {items.length < MAX_ITEMS && <AddButton onClick={() => set({ education: [...items, { school: "" }] })}>Adicionar formação</AddButton>}
    </Section>
  );
}

/** Carreira: onde trabalha ou trabalhou. */
export function CareerSection({ about, set }: { about: ProfileAbout; set: Set }) {
  const items = about.career ?? [];
  const update = (i: number, patch: Partial<ProfileCareer>) => set({ career: items.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  return (
    <Section title="Carreira" subtitle="Empresas, cargos e período." icon={Briefcase}>
      {items.map((c, i) => (
        <ItemCard key={i} label="Remover emprego" onRemove={() => set({ career: items.filter((_, j) => j !== i) })}>
          <input value={c.company} onChange={(ev) => update(i, { company: ev.target.value })} maxLength={100} placeholder="Empresa ou local de trabalho" className={smallInput} />
          <div className="grid grid-cols-2 gap-2">
            <input value={c.role ?? ""} onChange={(ev) => update(i, { role: ev.target.value })} maxLength={100} placeholder="Cargo" className={smallInput} />
            <input value={c.city ?? ""} onChange={(ev) => update(i, { city: ev.target.value })} maxLength={80} placeholder="Cidade" className={smallInput} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <YearSelect value={c.from} onChange={(from) => update(i, { from })} placeholder="Desde" />
            <YearSelect value={c.to} onChange={(to) => update(i, { to })} placeholder="Até (atual)" />
          </div>
        </ItemCard>
      ))}
      {items.length < MAX_ITEMS && <AddButton onClick={() => set({ career: [...items, { company: "" }] })}>Adicionar emprego</AddButton>}
    </Section>
  );
}

/** Lema de vida (posição de vida do VK, sem política nem religião). */
export function LifeSection({ about, set }: { about: ProfileAbout; set: Set }) {
  return (
    <Section title="Lema de vida" subtitle="Sua frase, o que importa pra você e o que te inspira." icon={Quote}>
      <Field label="Lema" icon={Quote}>
        <textarea
          value={about.motto ?? ""}
          onChange={(e) => set({ motto: e.target.value })}
          maxLength={160}
          rows={2}
          placeholder="Ex.: Viva e deixe viver."
          className={`${inputClass} resize-none`}
        />
      </Field>
      <Field label="Prioridade na vida" icon={Sparkles}>
        <Choice value={about.priority} onChange={(priority) => set({ priority })} options={LIFE_PRIORITIES} placeholder="Não selecionado" />
      </Field>
      <Field label="O mais importante nas pessoas" icon={Sparkles}>
        <Choice value={about.peopleValue} onChange={(peopleValue) => set({ peopleValue })} options={PEOPLE_VALUES} placeholder="Não selecionado" />
      </Field>
      <Field label="Visão sobre fumo" icon={Sparkles}>
        <Choice value={about.smoking} onChange={(smoking) => set({ smoking })} options={HABIT_VIEWS} placeholder="Não selecionado" />
      </Field>
      <Field label="Visão sobre álcool" icon={Sparkles}>
        <Choice value={about.alcohol} onChange={(alcohol) => set({ alcohol })} options={HABIT_VIEWS} placeholder="Não selecionado" />
      </Field>
      <Field label="Inspirações" icon={Sparkles}>
        <input value={about.inspiredBy ?? ""} onChange={(e) => set({ inspiredBy: e.target.value })} maxLength={160} placeholder="Pessoas, livros, lugares…" className={inputClass} />
      </Field>
    </Section>
  );
}
