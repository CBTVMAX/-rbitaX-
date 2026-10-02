"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, BookOpen, Camera, Info, Loader2, Minus, Plus, Quote, Trash2, X } from "lucide-react";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import {
  answerText,
  fontCss,
  isBlank,
  pointsUsed,
  radiusCls,
  safeMedia,
  SHAPE_RATIO,
  spacingCls,
  titleSizeCls,
  type Block,
  type FieldBlock,
  type SheetAnswers,
  type SheetTemplate,
} from "@/lib/sheets";

export type Mode = "form" | "view" | "preview";

/** Variáveis de cor/fonte do modelo, aplicadas só dentro da ficha (o resto do Órbita X não muda). */
export function sheetVars(t: SheetTemplate): React.CSSProperties {
  const s = t.style;
  return {
    ["--sh-accent" as string]: s.accent,
    ["--sh-title" as string]: s.titleColor,
    ["--sh-text" as string]: s.textColor,
    ["--sh-bg" as string]: s.background,
    ["--sh-border" as string]: s.border,
    fontFamily: fontCss(s.bodyFont),
    color: s.textColor,
  };
}

export function SheetHeader({ t, children }: { t: SheetTemplate; children?: React.ReactNode }) {
  const cover = safeMedia(t.coverUrl);
  return (
    <header className={clsx("relative overflow-hidden border", radiusCls(t.style.radius))} style={{ borderColor: "var(--sh-border)", background: "var(--sh-bg)" }}>
      {cover && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
        </>
      )}
      <div className={clsx("relative px-5 md:px-8", cover ? "py-10 md:py-14" : "py-6 md:py-8")}>
        <h1 className={clsx("break-words font-semibold uppercase tracking-wide", titleSizeCls(t.style.titleSize))} style={{ fontFamily: fontCss(t.style.titleFont), color: "var(--sh-title)" }}>
          {t.title || "Ficha"}
        </h1>
        {t.subtitle && (
          <p className="mt-2 text-sm uppercase tracking-[0.3em] opacity-80" style={{ fontFamily: fontCss(t.style.titleFont), color: "var(--sh-title)" }}>
            {t.subtitle}
          </p>
        )}
        {t.description && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed opacity-90">{t.description}</p>}
        {children}
      </div>
    </header>
  );
}

export function RulesNotice({ t }: { t: SheetTemplate }) {
  if (!t.rulesText && !t.rulesUrl) return null;
  return (
    <div className={clsx("flex flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center", radiusCls(t.style.radius))} style={{ borderColor: "var(--sh-border)", background: "var(--sh-bg)" }}>
      <BookOpen className="h-5 w-5 shrink-0" style={{ color: "var(--sh-accent)" }} />
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm opacity-90">{t.rulesText || "Leia as regras antes de preencher."}</p>
      {safeHref(t.rulesUrl) && (
        <a href={safeHref(t.rulesUrl)!} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--sh-accent)", color: "var(--sh-accent)" }}>
          Acessar regras ↗
        </a>
      )}
    </div>
  );
}

const safeHref = (u?: string) => (u && /^https?:\/\/\S+$/i.test(u) ? u : u && u.startsWith("/") ? u : null);

/** Agrupa os blocos em caixas: cada seção abre uma caixa com os blocos até a próxima seção. */
function groups(blocks: Block[]) {
  const out: { section: Extract<Block, { kind: "section" }> | null; items: Block[] }[] = [];
  for (const b of blocks) {
    if (b.kind === "section") out.push({ section: b, items: [] });
    else if (!out.length) out.push({ section: null, items: [b] });
    else out[out.length - 1].items.push(b);
  }
  return out;
}

export function SheetBody({
  t,
  mode,
  answers,
  narrator = {},
  onChange,
  onNarrator,
  canNarrate = false,
  errorId,
  upload,
}: {
  t: SheetTemplate;
  mode: Mode;
  answers: SheetAnswers;
  narrator?: SheetAnswers;
  onChange?: (id: string, v: unknown) => void;
  onNarrator?: (id: string, v: unknown) => void;
  canNarrate?: boolean;
  errorId?: string | null;
  upload?: (file: File) => Promise<string>;
}) {
  const s = t.style;
  let n = 0;
  return (
    <div className={spacingCls(s.spacing)}>
      {groups(t.blocks).map((g, gi) => {
        const inner = (
          <div className="grid gap-4 md:grid-cols-2">
            {g.items.map((b) => (
              <BlockItem
                key={b.id}
                b={b}
                t={t}
                mode={mode}
                value={b.kind === "field" && b.narratorOnly ? narrator[b.id] : b.kind === "field" ? answers[b.id] : undefined}
                onChange={b.kind === "field" ? (b.narratorOnly ? (canNarrate ? onNarrator : undefined) : onChange) : undefined}
                narratorEditable={b.kind === "field" && b.narratorOnly && canNarrate && mode === "view"}
                error={b.kind === "field" && errorId === b.id}
                upload={upload}
              />
            ))}
          </div>
        );
        if (!g.section) return <div key={gi}>{inner}</div>;
        n += 1;
        return (
          <section
            key={g.section.id}
            className={clsx(s.boxed && "border p-4 md:p-5", s.boxed && radiusCls(s.radius), !s.boxed && s.separators && gi > 0 && "border-t pt-5")}
            style={{ borderColor: "var(--sh-border)", background: s.boxed ? "var(--sh-bg)" : undefined }}
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: "var(--sh-accent)" }}>
                {g.section.icon || n}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold uppercase tracking-wide" style={{ fontFamily: fontCss(s.titleFont), color: "var(--sh-title)" }}>
                  {g.section.title || "Seção"}
                </h2>
                {g.section.description && <p className="mt-0.5 whitespace-pre-wrap text-xs opacity-70">{g.section.description}</p>}
              </div>
            </div>
            {inner}
          </section>
        );
      })}
    </div>
  );
}

function BlockItem({
  b,
  t,
  mode,
  value,
  onChange,
  narratorEditable,
  error,
  upload,
}: {
  b: Block;
  t: SheetTemplate;
  mode: Mode;
  value: unknown;
  onChange?: (id: string, v: unknown) => void;
  narratorEditable: boolean;
  error: boolean;
  upload?: (file: File) => Promise<string>;
}) {
  if (b.kind === "divider") return <hr className="md:col-span-2" style={{ borderColor: "var(--sh-border)" }} />;
  if (b.kind === "image") {
    const src = safeMedia(b.url);
    if (!src) return null;
    return (
      <figure className="md:col-span-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={clsx("w-full object-cover", radiusCls(t.style.radius))} />
        {b.caption && <figcaption className="mt-1.5 text-center text-xs opacity-70">{b.caption}</figcaption>}
      </figure>
    );
  }
  if (b.kind === "text") {
    const Icon = b.tone === "warning" ? AlertTriangle : b.tone === "info" ? Info : b.tone === "quote" ? Quote : null;
    const tone =
      b.tone === "warning" ? "border-amber-400/40 bg-amber-400/[0.07]" : b.tone === "info" ? "border-sky-400/30 bg-sky-400/[0.06]" : b.tone === "quote" ? "border-white/15 italic" : "border-transparent";
    return (
      <div className={clsx("flex gap-3 border px-4 py-3 md:col-span-2", radiusCls(t.style.radius), tone)}>
        {Icon && <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", b.tone === "warning" ? "text-amber-300" : "opacity-70")} />}
        <div className="min-w-0">
          {b.title && <p className="font-semibold uppercase tracking-wide" style={{ color: b.tone === "warning" ? undefined : "var(--sh-title)" }}>{b.title}</p>}
          {b.body && <p className="whitespace-pre-wrap text-sm leading-relaxed opacity-90">{b.body}</p>}
        </div>
      </div>
    );
  }
  if (b.kind !== "field") return null;
  const f = b;
  const wide = !f.half || ["long", "gallery", "points", "single", "multi", "list"].includes(f.type);
  const editing = ((mode === "form" || mode === "preview") && !f.narratorOnly && !f.locked) || narratorEditable;
  return (
    <div id={`campo-${f.id}`} className={clsx("min-w-0 scroll-mt-24", wide && "md:col-span-2")}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--sh-title)" }}>
          {f.label || "Pergunta"}
          {f.required && !f.narratorOnly && editing && <span className="ml-0.5 text-red-400">*</span>}
        </span>
        {f.narratorOnly && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70">Narrador</span>}
      </div>
      {f.help && <p className="mb-2 whitespace-pre-wrap text-xs opacity-60">{f.help}</p>}
      {editing ? (
        <FieldInput f={f} t={t} value={value} onChange={(v) => onChange?.(f.id, v)} error={error} upload={upload} disabled={mode === "preview"} />
      ) : (
        <FieldValue f={f} t={t} value={value} />
      )}
    </div>
  );
}

const inputBase = "w-full border bg-black/20 px-3.5 py-2.5 text-sm outline-none transition placeholder:opacity-40 focus:border-[color:var(--sh-accent)]";

function FieldInput({
  f,
  t,
  value,
  onChange,
  error,
  upload,
  disabled,
}: {
  f: FieldBlock;
  t: SheetTemplate;
  value: unknown;
  onChange: (v: unknown) => void;
  error: boolean;
  upload?: (file: File) => Promise<string>;
  disabled: boolean;
}) {
  const r = radiusCls(t.style.radius === "xl" ? "lg" : t.style.radius);
  const cls = clsx(inputBase, r, error ? "border-red-400/70" : "border-[color:var(--sh-border)]");
  const str = typeof value === "string" ? value : "";
  const pill = (on: boolean) => clsx("flex min-h-[44px] items-center gap-2.5 border px-3.5 py-2 text-left text-sm transition", r, !on && "border-[color:var(--sh-border)] hover:bg-white/[0.03]");
  const pillStyle = (on: boolean): React.CSSProperties | undefined => (on ? { borderColor: "var(--sh-accent)", background: "color-mix(in srgb, var(--sh-accent) 15%, transparent)" } : undefined);
  const dot = (on: boolean, square = false) => (
    <span className={clsx("flex h-4 w-4 shrink-0 items-center justify-center border-2", square ? "rounded" : "rounded-full")} style={{ borderColor: on ? "var(--sh-accent)" : "rgba(255,255,255,0.3)" }}>
      {on && <span className={clsx("h-2 w-2", square ? "rounded-sm" : "rounded-full")} style={{ background: "var(--sh-accent)" }} />}
    </span>
  );

  switch (f.type) {
    case "long":
      return <textarea value={str} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={8000} placeholder={f.placeholder || "Escreva aqui…"} className={clsx(cls, "resize-y")} disabled={disabled} />;
    case "number":
      return <input value={str} onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))} inputMode="decimal" placeholder={f.placeholder || "0"} className={cls} disabled={disabled} />;
    case "date":
      return <input type="date" value={str} onChange={(e) => onChange(e.target.value)} className={clsx(cls, "[color-scheme:dark]")} disabled={disabled} />;
    case "single":
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(f.options ?? []).map((o) => (
            <button key={o} type="button" onClick={() => onChange(str === o ? "" : o)} className={pill(str === o)} style={pillStyle(str === o)} disabled={disabled}>
              {dot(str === o)} <span className="min-w-0 break-words">{o}</span>
            </button>
          ))}
        </div>
      );
    case "multi": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(f.options ?? []).map((o) => {
            const on = arr.includes(o);
            return (
              <button key={o} type="button" onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])} className={pill(on)} style={pillStyle(on)} disabled={disabled}>
                {dot(on, true)} <span className="min-w-0 break-words">{o}</span>
              </button>
            );
          })}
        </div>
      );
    }
    case "yesno":
      return (
        <div className="flex gap-2">
          {(["sim", "nao"] as const).map((o) => (
            <button key={o} type="button" onClick={() => onChange(str === o ? "" : o)} className={clsx(pill(str === o), "flex-1 justify-center")} style={pillStyle(str === o)} disabled={disabled}>
              {dot(str === o)} {o === "sim" ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      );
    case "list": {
      const count = Math.max(1, Math.min(20, f.listCount ?? 3));
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => (
            <input
              key={i}
              value={arr[i] ?? ""}
              maxLength={80}
              onChange={(e) => {
                const next = Array.from({ length: count }, (_, k) => (k === i ? e.target.value : arr[k] ?? ""));
                onChange(next);
              }}
              placeholder={f.placeholder ? `${f.placeholder}` : `Item ${i + 1}`}
              className={cls}
              disabled={disabled}
            />
          ))}
        </div>
      );
    }
    case "points":
      return <PointsInput f={f} value={value} onChange={onChange} r={r} disabled={disabled} />;
    case "image":
      return <ImageInput f={f} value={str} onChange={onChange} upload={upload} r={r} disabled={disabled} error={error} />;
    case "gallery":
      return <GalleryInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} upload={upload} r={r} disabled={disabled} />;
    default:
      return <input value={str} onChange={(e) => onChange(e.target.value)} maxLength={f.type === "location" ? 120 : 300} placeholder={f.placeholder || (f.type === "location" ? "Ex.: Dentro da cidade" : "Escreva aqui…")} className={cls} disabled={disabled} />;
  }
}

function PointsInput({ f, value, onChange, r, disabled }: { f: FieldBlock; value: unknown; onChange: (v: unknown) => void; r: string; disabled: boolean }) {
  const p = f.points ?? { total: 0, min: 0, max: 0, allowLeftover: true, attrs: [] };
  const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, number>) : {};
  const used = pointsUsed(obj);
  const left = p.total - used;
  const set = (id: string, n: number) => onChange({ ...obj, [id]: Math.max(p.min, Math.min(p.max, n)) });
  return (
    <div>
      <p className="mb-2 text-xs font-semibold" style={{ color: left < 0 ? "#f87171" : "var(--sh-accent)" }}>
        {left >= 0 ? `${left} de ${p.total} pontos restantes` : `${-left} pontos acima do limite`}
      </p>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {p.attrs.map((a) => {
          const v = Number(obj[a.id] ?? p.min) || 0;
          return (
            <div key={a.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
              <button type="button" onClick={() => set(a.id, v - 1)} disabled={disabled || v <= p.min} aria-label={`Diminuir ${a.name}`} className={clsx("flex h-8 w-8 items-center justify-center border border-[color:var(--sh-border)] disabled:opacity-30", r)}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm tabular-nums">{v}</span>
              <button type="button" onClick={() => set(a.id, v + 1)} disabled={disabled || v >= p.max || left <= 0} aria-label={`Aumentar ${a.name}`} className={clsx("flex h-8 w-8 items-center justify-center border border-[color:var(--sh-border)] disabled:opacity-30", r)}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImageInput({ f, value, onChange, upload, r, disabled, error }: { f: FieldBlock; value: string; onChange: (v: unknown) => void; upload?: (file: File) => Promise<string>; r: string; disabled: boolean; error: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ratio = SHAPE_RATIO[f.shape ?? "square"];
  const src = safeMedia(value);

  async function send(file: File) {
    if (!upload) return;
    setBusy(true);
    try {
      onChange(await upload(file));
    } finally {
      setBusy(false);
    }
  }
  function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    if (ratio) setCrop(file);
    else send(file);
  }
  const aspect = ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "4 / 3" };
  return (
    <div className="max-w-sm">
      <div className={clsx("relative overflow-hidden border bg-black/20", r, error ? "border-red-400/70" : "border-[color:var(--sh-border)]")} style={aspect}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} disabled={disabled || busy} className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm opacity-70 hover:opacity-100">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-7 w-7" />}
            {busy ? "Enviando…" : "Adicionar foto"}
          </button>
        )}
        {src && busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </span>
        )}
      </div>
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => input.current?.click()} className="rounded-lg border border-[color:var(--sh-border)] px-3 py-1.5 hover:bg-white/[0.05]">
            {src ? "Substituir" : "Da galeria"}
          </button>
          <button type="button" onClick={() => camera.current?.click()} className="rounded-lg border border-[color:var(--sh-border)] px-3 py-1.5 hover:bg-white/[0.05]">
            Tirar foto
          </button>
          {src && (
            <button type="button" onClick={() => onChange("")} className="flex items-center gap-1 rounded-lg border border-red-400/30 px-3 py-1.5 text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      {crop && ratio && (
        <CoverCropDialog
          file={crop}
          ratio={ratio}
          ratioLabel={f.shape === "portrait" ? "3:4" : f.shape === "landscape" ? "16:9" : "1:1"}
          recommended={f.shape === "portrait" ? { w: 900, h: 1200 } : f.shape === "landscape" ? { w: 1600, h: 900 } : { w: 1000, h: 1000 }}
          title={f.label || "Ajustar imagem"}
          confirmLabel="Usar esta imagem"
          onCancel={() => setCrop(null)}
          onConfirm={async (blob) => {
            setCrop(null);
            const ext = blob.type === "image/webp" ? "webp" : "jpg";
            await send(new File([blob], `ficha.${ext}`, { type: blob.type }));
          }}
        />
      )}
    </div>
  );
}

function GalleryInput({ value, onChange, upload, r, disabled }: { value: string[]; onChange: (v: unknown) => void; upload?: (file: File) => Promise<string>; r: string; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const list = value.filter((u) => safeMedia(u));
  async function add(files: FileList | null) {
    if (!files || !upload) return;
    const pickList = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 24 - list.length);
    setBusy(pickList.length);
    const urls: string[] = [];
    for (const f of pickList) {
      try {
        urls.push(await upload(f));
      } catch {
        /* ignora a imagem que falhou */
      }
      setBusy((n) => n - 1);
    }
    onChange([...list, ...urls]);
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {list.map((u, i) => (
        <div key={u + i} className={clsx("relative aspect-square overflow-hidden border border-[color:var(--sh-border)]", r)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remover imagem" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!disabled && list.length < 24 && (
        <button type="button" onClick={() => input.current?.click()} disabled={busy > 0} className={clsx("flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-[color:var(--sh-border)] text-xs opacity-70 hover:opacity-100", r)}>
          {busy > 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {busy > 0 ? `Enviando ${busy}…` : "Adicionar"}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
    </div>
  );
}

/** Resposta em modo leitura (ficha aprovada/visualização). */
export function FieldValue({ f, t, value }: { f: FieldBlock; t: SheetTemplate; value: unknown }) {
  const r = radiusCls(t.style.radius === "xl" ? "lg" : t.style.radius);
  if (isBlank(value)) return <p className="text-sm italic opacity-50">{f.narratorOnly ? "O narrador vai preencher." : "—"}</p>;
  const chip = (x: string) => (
    <span key={x} className={clsx("border px-3 py-1 text-sm", r)} style={{ borderColor: "var(--sh-border)" }}>
      {x}
    </span>
  );
  if (f.type === "single" || f.type === "yesno") {
    return (
      <span className={clsx("inline-block border px-3 py-1 text-sm font-medium", r)} style={{ borderColor: "var(--sh-accent)", color: "var(--sh-accent)", background: "color-mix(in srgb, var(--sh-accent) 12%, transparent)" }}>
        {answerText(f, value)}
      </span>
    );
  }
  if ((f.type === "multi" || f.type === "list") && Array.isArray(value)) return <div className="flex flex-wrap gap-2">{(value as string[]).filter((x) => x?.trim()).map(chip)}</div>;
  if (f.type === "image") {
    const src = safeMedia(value);
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={f.label} className={clsx("max-w-xs object-cover", r)} style={{ aspectRatio: SHAPE_RATIO[f.shape ?? "square"] ? String(SHAPE_RATIO[f.shape ?? "square"]) : undefined }} />
    ) : null;
  }
  if (f.type === "gallery" && Array.isArray(value)) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {(value as string[]).filter((u) => safeMedia(u)).map((u, i) => (
          <a key={u + i} href={u} target="_blank" rel="noopener noreferrer" className={clsx("block aspect-square overflow-hidden", r)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
          </a>
        ))}
      </div>
    );
  }
  if (f.type === "points" && f.points && typeof value === "object") {
    const obj = value as Record<string, number>;
    return (
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {f.points.attrs.map((a) => {
          const v = Number(obj[a.id] ?? 0) || 0;
          return (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate">{a.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${f.points!.max ? (v / f.points!.max) * 100 : 0}%`, background: "var(--sh-accent)" }} />
              </span>
              <span className="w-10 text-right text-xs tabular-nums opacity-70">
                {v}/{f.points!.max}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return <p className={clsx("break-words text-sm leading-relaxed", f.type === "long" && "whitespace-pre-wrap")}>{answerText(f, value)}</p>;
}
