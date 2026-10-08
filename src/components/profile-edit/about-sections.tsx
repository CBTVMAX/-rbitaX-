"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignLeft, BookOpen, Briefcase, Check, Clapperboard, Eye, Flag, Gamepad2, Globe2, GraduationCap, Home, Hourglass, Languages, Loader2, Music2, Plus, Quote, ScanFace, Sparkles, Trash2, UsersRound, VenetianMask, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import { Field, inputClass, Section, selectClass, SelectWrap } from "@/components/profile-edit/form-ui";
import {
  ABOUT_VISIBILITY_OPTIONS,
  CHARACTER_FIELDS,
  FAVORITE_FIELDS,
  type AboutField,
  type AboutVisibility,
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

/** Quem vê este campo: Público · Amigos · Só eu (aplicado no servidor, em profile_about). */
export function VisibilityPick({ field, about, set }: { field: AboutField; about: ProfileAbout; set: Set }) {
  const value: AboutVisibility = about.visibility?.[field] ?? "all";
  return (
    <label className="relative inline-flex shrink-0 items-center" title="Quem vê">
      <Eye className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-white/45" />
      <select
        aria-label="Quem vê"
        value={value}
        onChange={(e) => {
          const next = { ...(about.visibility ?? {}) };
          if (e.target.value === "all") delete next[field];
          else next[field] = e.target.value as AboutVisibility;
          set({ visibility: next });
        }}
        className={`h-9 appearance-none rounded-full border bg-space-card pl-7 pr-3 text-xs font-medium outline-none transition focus:border-orbit-purple ${
          value === "all" ? "border-white/12 text-white/70" : "border-orbit-purple/50 text-orbit-cyan"
        }`}
      >
        {ABOUT_VISIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function WithVisibility({ field, about, set, children }: { field: AboutField; about: ProfileAbout; set: Set; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="pt-1.5">
        <VisibilityPick field={field} about={about} set={set} />
      </div>
    </div>
  );
}

function SectionVisibility({ field, about, set }: { field: AboutField; about: ProfileAbout; set: Set }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-xs text-white/55">Quem vê esta seção</span>
      <VisibilityPick field={field} about={about} set={set} />
    </div>
  );
}

/** Sobre mim: texto longo de apresentação. */
export function AboutMeSection({ about, set }: { about: ProfileAbout; set: Set }) {
  const text = about.aboutMe ?? "";
  return (
    <Section title="Sobre mim" subtitle="Sua apresentação completa. Aparece em “Mais informações”." icon={AlignLeft}>
      <WithVisibility field="aboutMe" about={about} set={set}>
        <textarea
          value={text}
          onChange={(e) => set({ aboutMe: e.target.value })}
          maxLength={2000}
          rows={6}
          placeholder="Conte quem você é, do que gosta, o que procura aqui…"
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <p className="mt-1 text-right text-[11px] text-white/35">{text.length.toLocaleString("pt-BR")}/2.000</p>
      </WithVisibility>
    </Section>
  );
}

const FAVORITE_ICON = { music: Music2, movies: Clapperboard, books: BookOpen, games: Gamepad2 } as const;
const CHARACTER_ICON = { universe: Globe2, faceclaim: ScanFace, charAge: Hourglass, affiliation: Flag } as const;

/** Músicas, filmes e séries, livros e jogos. */
export function FavoritesSection({ about, set }: { about: ProfileAbout; set: Set }) {
  return (
    <Section title="Favoritos" subtitle="O que você ouve, assiste, lê e joga." icon={Sparkles}>
      {FAVORITE_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} icon={FAVORITE_ICON[f.key]}>
          <WithVisibility field={f.key} about={about} set={set}>
            <input
              value={about.favorites?.[f.key] ?? ""}
              onChange={(e) => set({ favorites: { ...(about.favorites ?? {}), [f.key]: e.target.value } })}
              maxLength={300}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </WithVisibility>
        </Field>
      ))}
    </Section>
  );
}

/** Ficha do personagem, para perfis de roleplay. */
export function CharacterSection({ about, set }: { about: ProfileAbout; set: Set }) {
  return (
    <Section title="Personagem" subtitle="Para perfis de roleplay. Deixe em branco se não for o seu caso." icon={VenetianMask}>
      {CHARACTER_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} icon={CHARACTER_ICON[f.key]}>
          <WithVisibility field={f.key} about={about} set={set}>
            <input
              value={about.character?.[f.key] ?? ""}
              onChange={(e) => set({ character: { ...(about.character ?? {}), [f.key]: e.target.value } })}
              maxLength={f.max}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </WithVisibility>
        </Field>
      ))}
    </Section>
  );
}

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
        <WithVisibility field="hometown" about={about} set={set}>
          <input value={about.hometown ?? ""} onChange={(e) => set({ hometown: e.target.value })} maxLength={80} placeholder="Ex.: Salvador, Bahia" className={inputClass} />
        </WithVisibility>
      </Field>
      <Field label="Idiomas" icon={Languages}>
        <div className="space-y-2">
          <div className="flex justify-end">
            <VisibilityPick field="languages" about={about} set={set} />
          </div>
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
      <SectionVisibility field="education" about={about} set={set} />
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

type MyCommunity = { id: string; name: string; slug: string; avatarUrl: string | null };

function CommunityFace({ url, size = 28 }: { url?: string | null; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/60" style={{ width: size, height: size }}>
      <UsersRound className="h-4 w-4" />
    </span>
  );
}

/** Carreira: onde trabalha ou trabalhou — pode ser uma comunidade do Órbita X (como no VK). */
export function CareerSection({ about, set, userId }: { about: ProfileAbout; set: Set; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const items = about.career ?? [];
  const update = (i: number, patch: Partial<ProfileCareer>) => set({ career: items.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const [picking, setPicking] = useState<number | null>(null);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);

  useEffect(() => {
    if (picking === null || mine) return;
    (async () => {
      const { data } = await supabase
        .from("CommunityMember")
        .select("community:Community(id, name, slug, avatarUrl)")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })
        .limit(200);
      const list = ((data ?? []) as unknown as { community: MyCommunity | null }[]).map((r) => r.community).filter(Boolean) as MyCommunity[];
      setMine(list);
    })();
  }, [picking, mine, supabase, userId]);

  function choose(c: MyCommunity) {
    if (picking === null) return;
    update(picking, { company: c.name, community: c.id, communityName: c.name, communitySlug: c.slug, communityAvatar: c.avatarUrl ?? undefined });
    setPicking(null);
  }

  return (
    <Section title="Carreira" subtitle="Empresas, cargos e período — ou uma comunidade sua do Órbita X." icon={Briefcase}>
      <SectionVisibility field="career" about={about} set={set} />
      {items.map((c, i) => (
        <ItemCard key={i} label="Remover emprego" onRemove={() => set({ career: items.filter((_, j) => j !== i) })}>
          {c.community ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-orbit-purple/40 bg-orbit-purple/10 px-3 py-2">
              <CommunityFace url={c.communityAvatar} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{c.communityName ?? c.company}</span>
                <span className="block text-[11px] text-white/50">Comunidade do Órbita X</span>
              </span>
              <button
                type="button"
                onClick={() => update(i, { community: undefined, communityName: undefined, communitySlug: undefined, communityAvatar: undefined })}
                aria-label="Desmarcar comunidade"
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <input value={c.company} onChange={(ev) => update(i, { company: ev.target.value })} maxLength={100} placeholder="Empresa ou local de trabalho" className={smallInput} />
              <button type="button" onClick={() => setPicking(i)} className="flex items-center gap-1.5 px-1 text-xs font-medium text-orbit-cyan hover:underline">
                <UsersRound className="h-3.5 w-3.5" /> Marcar uma comunidade minha do Órbita X
              </button>
            </>
          )}
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

      <Sheet open={picking !== null} onClose={() => setPicking(null)} title="Marcar comunidade">
        <div className="max-h-[60vh] space-y-1 overflow-y-auto pb-2">
          {mine === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : mine.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-white/45">Você ainda não participa de nenhuma comunidade.</p>
          ) : (
            mine.map((c) => (
              <button key={c.id} type="button" onClick={() => choose(c)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]">
                <CommunityFace url={c.avatarUrl} size={40} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{c.name}</span>
                {picking !== null && items[picking]?.community === c.id && <Check className="h-4 w-4 text-orbit-cyan" />}
              </button>
            ))
          )}
        </div>
      </Sheet>
    </Section>
  );
}

/** Lema de vida (posição de vida do VK, sem política nem religião). */
export function LifeSection({ about, set }: { about: ProfileAbout; set: Set }) {
  return (
    <Section title="Lema de vida" subtitle="Sua frase, o que importa pra você e o que te inspira." icon={Quote}>
      <SectionVisibility field="life" about={about} set={set} />
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
