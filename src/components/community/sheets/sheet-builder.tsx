"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  Heading,
  ImageIcon,
  ImagePlus,
  ListChecks,
  Loader2,
  Minus,
  Monitor,
  Pencil,
  Plus,
  Rocket,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { uploadCommunityFile } from "@/lib/communities";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import {
  CARD_ROLES,
  cloneBlock,
  FIELD_TYPES,
  FONTS,
  newField,
  normalizeTemplate,
  safeMedia,
  sheetError,
  uid,
  type Block,
  type FieldBlock,
  type FieldType,
  type SheetAnswers,
  type SheetTemplate,
  type TemplateBundle,
} from "@/lib/sheets";
import { useCommunity } from "../context";
import { Confirm } from "../ui";
import { RulesNotice, SheetBody, SheetHeader, sheetVars } from "./sheet-render";

const input = "w-full rounded-xl border border-white/10 bg-space-bg/60 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-orbit-purple/60";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50";

function Switch({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-white">{title}</span>
        {desc && <span className="block text-[11px] text-white/45">{desc}</span>}
      </span>
      <span className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-orbit-gradient" : "bg-white/15")}>
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Construtor de Ficha: a administração monta o modelo em blocos; os membros só respondem. */
export function SheetBuilder() {
  const { supabase, community, viewer, toast } = useCommunity();
  const [bundle, setBundle] = useState<TemplateBundle | null>(null);
  const [missing, setMissing] = useState(false);
  const [t, setT] = useState<SheetTemplate | null>(null);
  const [tab, setTab] = useState<"conteudo" | "aparencia" | "config">("conteudo");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [open, setOpen] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);
  const [askPublish, setAskPublish] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<SheetAnswers>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.rpc("sheet_template_get" as never, { p_community: community.id } as never).then(({ data, error }) => {
      if (error) {
        setMissing(true);
        setT(normalizeTemplate(null, community.name));
        return;
      }
      const b = data as unknown as TemplateBundle;
      setBundle(b);
      const draft = b.draft && Object.keys(b.draft).length ? b.draft : b.published;
      setT(normalizeTemplate(draft, community.name));
    });
  }, [supabase, community.id, community.name]);

  const save = useCallback(
    async (next: SheetTemplate) => {
      setSaveState("saving");
      const { error } = await supabase.rpc("sheet_template_save" as never, { p_community: community.id, p_draft: next } as never);
      if (error) {
        setSaveState("error");
        toast(sheetError(error.message), true);
        return false;
      }
      dirty.current = false;
      setSaveState("saved");
      return true;
    },
    [supabase, community.id, toast]
  );

  // Rascunho salvo sozinho, um instante depois de cada mudança.
  const update = useCallback(
    (fn: (x: SheetTemplate) => SheetTemplate) => {
      setT((cur) => {
        if (!cur) return cur;
        const next = fn(cur);
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        if (!missing) timer.current = setTimeout(() => save(next), 1200);
        return next;
      });
    },
    [save, missing]
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function publish() {
    if (!t) return;
    setPublishing(true);
    if (timer.current) clearTimeout(timer.current);
    const ok = await save(t);
    if (!ok) return setPublishing(false);
    const { data, error } = await supabase.rpc("sheet_template_publish" as never, { p_community: community.id } as never);
    setPublishing(false);
    setAskPublish(false);
    if (error) return toast(sheetError(error.message), true);
    setBundle((b) => (b ? { ...b, published: t, version: Number(data) || b.version + 1, publishedAt: new Date().toISOString() } : b));
    toast("Ficha publicada! Os membros já podem preencher.");
  }

  const setBlock = (id: string, patch: Partial<Block>) => update((x) => ({ ...x, blocks: x.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) }));
  const removeBlock = (id: string) => update((x) => ({ ...x, blocks: x.blocks.filter((b) => b.id !== id) }));
  const move = (id: string, d: number) =>
    update((x) => {
      const i = x.blocks.findIndex((b) => b.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= x.blocks.length) return x;
      const blocks = [...x.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...x, blocks };
    });
  const dropOn = (targetId: string) =>
    update((x) => {
      if (!dragId || dragId === targetId) return x;
      const blocks = [...x.blocks];
      const from = blocks.findIndex((b) => b.id === dragId);
      const [b] = blocks.splice(from, 1);
      const to = blocks.findIndex((y) => y.id === targetId);
      blocks.splice(to, 0, b);
      return { ...x, blocks };
    });
  const duplicate = (id: string) =>
    update((x) => {
      const i = x.blocks.findIndex((b) => b.id === id);
      if (i < 0) return x;
      const src = x.blocks[i];
      let copies: Block[] = [cloneBlock(src)];
      let end = i + 1;
      // Duplicar seção leva junto os blocos dela (até a próxima seção).
      if (src.kind === "section") {
        while (end < x.blocks.length && x.blocks[end].kind !== "section") end++;
        copies = x.blocks.slice(i, end).map((b) => cloneBlock(b));
        if (copies[0].kind === "section") copies[0] = { ...copies[0], title: `${copies[0].title} (cópia)` };
      }
      const blocks = [...x.blocks];
      blocks.splice(end, 0, ...copies);
      return { ...x, blocks };
    });
  const add = (b: Block) => {
    update((x) => ({ ...x, blocks: [...x.blocks, b] }));
    setOpen(b.id);
    setTimeout(() => document.getElementById(`bloco-${b.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const unpublished = useMemo(() => !!bundle?.published && !!t && JSON.stringify(normalizeTemplate(bundle.published)) !== JSON.stringify(t), [bundle, t]);

  if (!t) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  const status = !bundle?.published ? "Rascunho — ainda não publicada" : unpublished ? `Publicada (v${bundle.version}) · alterações não publicadas` : `Publicada (v${bundle.version})`;

  return (
    <div className="space-y-4">
      {missing && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
          O sistema de fichas ainda não foi ativado no banco de dados. Você pode montar e visualizar, mas para salvar e publicar é preciso rodar o SQL &quot;community_sheets&quot; no Supabase.
        </p>
      )}

      <div className="relative z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-space-bg/90 px-4 py-3 backdrop-blur md:sticky md:top-16 md:mx-0 md:rounded-2xl md:border">
        <div className="mr-auto min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-white/45">{status}</p>
          <p className="text-xs text-white/55">
            {saveState === "saving" ? "Salvando rascunho…" : saveState === "saved" ? "Rascunho salvo" : saveState === "error" ? "Não salvou — tente de novo" : "As alterações são salvas automaticamente"}
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 p-0.5">
          {(
            [
              ["edit", "Editar", Pencil],
              ["preview", "Visualizar", Eye],
            ] as const
          ).map(([id, l, Icon]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={clsx("flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition", mode === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white")}>
              <Icon className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAskPublish(true)} disabled={missing || publishing || (!!bundle?.published && !unpublished) || !t.blocks.length} className="flex h-10 items-center gap-1.5 rounded-xl bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow disabled:opacity-40">
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publicar ficha
        </button>
      </div>

      {mode === "preview" ? (
        <div>
          <div className="mb-3 flex justify-center gap-2">
            {(
              [
                ["desktop", "Computador", Monitor],
                ["mobile", "Celular", Smartphone],
              ] as const
            ).map(([id, l, Icon]) => (
              <button key={id} type="button" onClick={() => setDevice(id)} className={clsx("flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm", device === id ? "border-orbit-purple/50 bg-orbit-purple/10 text-white" : "border-white/10 text-white/60")}>
                <Icon className="h-4 w-4" /> {l}
              </button>
            ))}
          </div>
          <p className="mb-3 text-center text-xs text-white/45">É exatamente assim que o membro vai ver. Dá para testar preenchendo — nada é salvo.</p>
          <div className={clsx("mx-auto transition-all", device === "mobile" ? "max-w-[390px] rounded-[32px] border-[6px] border-white/10 p-2" : "max-w-5xl")}>
            <div className="space-y-4" style={sheetVars(t)}>
              <SheetHeader t={t} />
              <RulesNotice t={t} />
              <SheetBody t={t} mode="form" answers={previewAnswers} onChange={(id, v) => setPreviewAnswers((a) => ({ ...a, [id]: v }))} upload={async () => ""} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <span className="flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm text-white/70">Salvar rascunho</span>
                <span className="flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold text-white" style={{ background: t.style.accent }}>
                  Enviar ficha
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-space-card/60 p-1 [scrollbar-width:none]">
            {(
              [
                ["conteudo", "Conteúdo"],
                ["aparencia", "Aparência"],
                ["config", "Configurações"],
              ] as const
            ).map(([id, l]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={clsx("h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition", tab === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white")}>
                {l}
              </button>
            ))}
          </div>

          {tab === "conteudo" && (
            <div className="space-y-3">
              <HeaderEditor t={t} update={update} upload={(f) => uploadCommunityFile(supabase, viewer!.id, community.id, f, "image").then((r) => r.url)} />

              {t.blocks.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
                  A ficha está vazia. Comece adicionando uma seção (ex.: &quot;Dados básicos&quot;) e as perguntas dela.
                </p>
              )}

              {t.blocks.map((b, i) => (
                <div
                  key={b.id}
                  id={`bloco-${b.id}`}
                  draggable
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(b.id)}
                  className={clsx(
                    "rounded-2xl border bg-space-card/70 transition",
                    b.kind === "section" ? "border-orbit-purple/30" : "border-white/[0.08]",
                    b.kind !== "section" && "md:ml-6",
                    dragId === b.id && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-white/30 md:block" />
                    <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <BlockIcon b={b} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{blockTitle(b)}</span>
                        <span className="block truncate text-[11px] text-white/45">{blockHint(b)}</span>
                      </span>
                      <ChevronDown className={clsx("ml-auto h-4 w-4 shrink-0 text-white/40 transition", open === b.id && "rotate-180")} />
                    </button>
                    <div className="flex shrink-0 items-center">
                      <IconBtn label="Subir" onClick={() => move(b.id, -1)} disabled={i === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Descer" onClick={() => move(b.id, 1)} disabled={i === t.blocks.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label={b.kind === "section" ? "Duplicar seção" : "Duplicar"} onClick={() => duplicate(b.id)}>
                        <Copy className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Remover" onClick={() => removeBlock(b.id)} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                  {open === b.id && (
                    <div className="border-t border-white/[0.06] p-3 md:p-4">
                      <BlockEditor b={b} set={(patch) => setBlock(b.id, patch)} upload={(f) => uploadCommunityFile(supabase, viewer!.id, community.id, f, "image").then((r) => r.url)} />
                    </div>
                  )}
                </div>
              ))}

              <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-white/10 bg-space-surface/95 p-2 shadow-2xl backdrop-blur md:bottom-3">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Adicionar</p>
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  <AddBtn icon={Heading} onClick={() => add({ id: uid(), kind: "section", title: "Nova seção", description: "" })}>
                    Seção
                  </AddBtn>
                  <AddBtn icon={Type} onClick={() => add(newField("short"))}>
                    Pergunta
                  </AddBtn>
                  <AddBtn icon={ListChecks} onClick={() => add(newField("single"))}>
                    Seleção
                  </AddBtn>
                  <AddBtn icon={SlidersHorizontal} onClick={() => add({ ...newField("points"), label: "Atributos" })}>
                    Atributos
                  </AddBtn>
                  <AddBtn icon={ImagePlus} onClick={() => add({ ...newField("image"), label: "Foto" })}>
                    Campo de imagem
                  </AddBtn>
                  <AddBtn icon={AlignLeft} onClick={() => add({ id: uid(), kind: "text", title: "", body: "", tone: "info" })}>
                    Texto
                  </AddBtn>
                  <AddBtn icon={ImageIcon} onClick={() => add({ id: uid(), kind: "image", url: "" })}>
                    Imagem
                  </AddBtn>
                  <AddBtn icon={Minus} onClick={() => add({ id: uid(), kind: "divider" })}>
                    Divisória
                  </AddBtn>
                </div>
              </div>
            </div>
          )}

          {tab === "aparencia" && <StyleEditor t={t} update={update} />}

          {tab === "config" && (
            <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-space-card/70 p-4">
              <Switch on={t.settings.requireApproval} onChange={(v) => update((x) => ({ ...x, settings: { ...x.settings, requireApproval: v } }))} title="Exigir aprovação" desc="As fichas enviadas ficam pendentes até a administração aprovar." />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <label>
                  <span className={label}>Fichas por membro</span>
                  <input type="number" min={1} max={20} value={t.settings.maxPerMember} onChange={(e) => update((x) => ({ ...x, settings: { ...x.settings, maxPerMember: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } }))} className={input} />
                </label>
                <label>
                  <span className={label}>Texto do botão</span>
                  <input value={t.settings.buttonLabel} maxLength={40} onChange={(e) => update((x) => ({ ...x, settings: { ...x.settings, buttonLabel: e.target.value } }))} className={input} placeholder="Criar minha ficha" />
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <Confirm
        open={askPublish}
        title="Publicar a ficha?"
        message={bundle?.published ? "Os membros passam a ver a versão nova. Fichas já enviadas continuam com as respostas que têm." : "A ficha fica disponível em Comunidade → Fichas → Criar minha ficha."}
        confirmLabel="Publicar"
        danger={false}
        busy={publishing}
        onConfirm={publish}
        onClose={() => setAskPublish(false)}
      />
    </div>
  );
}

function IconBtn({ label: l, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={l} title={l} className={clsx("flex h-9 w-9 items-center justify-center rounded-lg transition disabled:opacity-25", danger ? "text-white/50 hover:bg-red-500/10 hover:text-red-300" : "text-white/50 hover:bg-white/[0.06] hover:text-white")}>
      {children}
    </button>
  );
}

function AddBtn({ icon: Icon, onClick, children }: { icon: React.ComponentType<{ className?: string }>; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/85 transition hover:border-orbit-purple/40 hover:bg-orbit-purple/10">
      <Plus className="h-3.5 w-3.5 text-orbit-cyan" />
      <Icon className="h-4 w-4 text-white/60" /> {children}
    </button>
  );
}

function BlockIcon({ b }: { b: Block }) {
  const Icon = b.kind === "section" ? Heading : b.kind === "text" ? AlignLeft : b.kind === "image" ? ImageIcon : b.kind === "divider" ? Minus : b.type === "points" ? SlidersHorizontal : b.type === "image" || b.type === "gallery" ? ImagePlus : b.type === "single" || b.type === "multi" ? ListChecks : Type;
  return (
    <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", b.kind === "section" ? "bg-orbit-gradient text-snow" : "bg-white/[0.06] text-white/70")}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

function blockTitle(b: Block) {
  if (b.kind === "section") return b.title || "Seção sem título";
  if (b.kind === "text") return b.title || b.body.slice(0, 60) || "Texto informativo";
  if (b.kind === "image") return "Imagem";
  if (b.kind === "divider") return "Divisória";
  return b.label || "Pergunta sem título";
}
function blockHint(b: Block) {
  if (b.kind === "section") return "Seção";
  if (b.kind === "text") return "Texto fixo (o membro só lê)";
  if (b.kind === "image") return b.url ? "Imagem entre seções" : "Escolha uma imagem";
  if (b.kind === "divider") return "Linha separadora";
  const type = FIELD_TYPES.find((x) => x.id === b.type)?.label ?? "";
  return [type, b.required && "obrigatório", b.narratorOnly && "só narrador", b.card && CARD_ROLES.find((c) => c.id === b.card)?.label].filter(Boolean).join(" · ");
}

function ImagePicker({ value, onChange, upload, ratio, ratioLabel, hint }: { value?: string; onChange: (url: string) => void; upload: (f: File) => Promise<string>; ratio?: number; ratioLabel?: string; hint: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState<File | null>(null);
  const src = safeMedia(value);
  async function send(f: File) {
    setBusy(true);
    try {
      onChange(await upload(f));
    } catch {
      /* o toast vem do envio */
    }
    setBusy(false);
  }
  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => ref.current?.click()} className="relative flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/[0.03] text-white/50 hover:text-white">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </button>
        <div className="space-y-1.5 text-xs text-white/50">
          <p>{hint}</p>
          {src && (
            <button type="button" onClick={() => onChange("")} className="flex items-center gap-1 text-red-300 hover:underline">
              <X className="h-3.5 w-3.5" /> Remover
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !f.type.startsWith("image/")) return;
          if (ratio) setCrop(f);
          else send(f);
        }}
      />
      {crop && ratio && (
        <CoverCropDialog
          file={crop}
          ratio={ratio}
          ratioLabel={ratioLabel}
          recommended={{ w: 1600, h: Math.round(1600 / ratio) }}
          title="Ajustar imagem"
          confirmLabel="Usar esta imagem"
          onCancel={() => setCrop(null)}
          onConfirm={async (blob) => {
            setCrop(null);
            await send(new File([blob], `ficha.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
          }}
        />
      )}
    </div>
  );
}

function HeaderEditor({ t, update, upload }: { t: SheetTemplate; update: (fn: (x: SheetTemplate) => SheetTemplate) => void; upload: (f: File) => Promise<string> }) {
  const set = (patch: Partial<SheetTemplate>) => update((x) => ({ ...x, ...patch }));
  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-space-card/70 p-4">
      <p className="text-sm font-semibold text-white">Cabeçalho da ficha</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={label}>Título</span>
          <input value={t.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} className={input} placeholder="Ex.: Ficha do personagem" />
        </label>
        <label>
          <span className={label}>Subtítulo</span>
          <input value={t.subtitle ?? ""} maxLength={80} onChange={(e) => set({ subtitle: e.target.value })} className={input} placeholder="Ex.: Trama: Projeto Estes" />
        </label>
      </div>
      <label className="block">
        <span className={label}>Descrição / sinopse</span>
        <textarea value={t.description ?? ""} maxLength={2000} rows={3} onChange={(e) => set({ description: e.target.value })} className={clsx(input, "resize-y")} placeholder="Texto que aparece no topo da ficha" />
      </label>
      <div>
        <span className={label}>Capa da ficha</span>
        <ImagePicker value={t.coverUrl} onChange={(url) => set({ coverUrl: url })} upload={upload} ratio={16 / 5} ratioLabel="16:5" hint="Imagem de fundo do cabeçalho (1600×500 recomendado)." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={label}>Aviso de regras (opcional)</span>
          <input value={t.rulesText ?? ""} maxLength={300} onChange={(e) => set({ rulesText: e.target.value })} className={input} placeholder="Ex.: Leia as regras antes de preencher." />
        </label>
        <label>
          <span className={label}>Link das regras (opcional)</span>
          <input value={t.rulesUrl ?? ""} maxLength={400} onChange={(e) => set({ rulesUrl: e.target.value })} className={input} placeholder="https://… ou /comunidades/…" />
        </label>
      </div>
    </div>
  );
}

function BlockEditor({ b, set, upload }: { b: Block; set: (patch: Partial<Block>) => void; upload: (f: File) => Promise<string> }) {
  if (b.kind === "section") {
    return (
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label>
          <span className={label}>Título da seção</span>
          <input value={b.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} className={input} placeholder="Ex.: Dados básicos" />
        </label>
        <label>
          <span className={label}>Ícone/número</span>
          <input value={b.icon ?? ""} maxLength={3} onChange={(e) => set({ icon: e.target.value })} className={input} placeholder="auto" />
        </label>
        <label className="sm:col-span-2">
          <span className={label}>Instrução da seção (opcional)</span>
          <input value={b.description ?? ""} maxLength={300} onChange={(e) => set({ description: e.target.value })} className={input} placeholder="Ex.: Escreva 4 palavras." />
        </label>
      </div>
    );
  }
  if (b.kind === "text") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["info", "Informação"],
              ["warning", "Destaque/aviso"],
              ["quote", "Citação"],
              ["plain", "Texto simples"],
            ] as const
          ).map(([id, l]) => (
            <button key={id} type="button" onClick={() => set({ tone: id })} className={clsx("rounded-lg border px-3 py-1.5 text-xs", b.tone === id ? "border-orbit-purple/50 bg-orbit-purple/10 text-white" : "border-white/10 text-white/60")}>
              {l}
            </button>
          ))}
        </div>
        <input value={b.title ?? ""} maxLength={120} onChange={(e) => set({ title: e.target.value })} className={input} placeholder="Título (opcional) — ex.: Esta ficha é do personagem com memória" />
        <textarea value={b.body} maxLength={3000} rows={3} onChange={(e) => set({ body: e.target.value })} className={clsx(input, "resize-y")} placeholder="Texto que o membro só lê" />
      </div>
    );
  }
  if (b.kind === "image") {
    return (
      <div className="space-y-3">
        <ImagePicker value={b.url} onChange={(url) => set({ url })} upload={upload} hint="Imagem que aparece entre as seções." />
        <input value={b.caption ?? ""} maxLength={160} onChange={(e) => set({ caption: e.target.value })} className={input} placeholder="Legenda (opcional)" />
      </div>
    );
  }
  if (b.kind === "divider") return <p className="text-xs text-white/50">Uma linha para separar partes da ficha.</p>;
  return <FieldEditor f={b} set={set as (p: Partial<FieldBlock>) => void} />;
}

function FieldEditor({ f, set }: { f: FieldBlock; set: (p: Partial<FieldBlock>) => void }) {
  const changeType = (type: FieldType) => {
    const fresh = newField(type);
    set({ type, options: f.options ?? fresh.options, listCount: f.listCount ?? fresh.listCount, points: f.points ?? fresh.points, shape: f.shape ?? fresh.shape, filter: type === "single" ? f.filter : false });
  };
  const opts = f.options ?? [];
  const pts = f.points;
  return (
    <div className="space-y-4">
      <label className="block">
        <span className={label}>Pergunta</span>
        <input value={f.label} maxLength={120} onChange={(e) => set({ label: e.target.value })} className={input} placeholder="Ex.: Qual é o maior medo do seu personagem?" autoFocus />
      </label>
      <label className="block">
        <span className={label}>Descrição / instrução (opcional)</span>
        <input value={f.help ?? ""} maxLength={300} onChange={(e) => set({ help: e.target.value })} className={input} placeholder="Ex.: Descreva até três medos." />
      </label>

      <div>
        <span className={label}>Tipo de resposta</span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {FIELD_TYPES.map((x) => (
            <button key={x.id} type="button" onClick={() => changeType(x.id)} className={clsx("rounded-xl border px-3 py-2 text-left transition", f.type === x.id ? "border-orbit-purple/60 bg-orbit-purple/10" : "border-white/10 hover:bg-white/[0.03]")}>
              <span className="flex items-center gap-1.5 text-sm text-white">
                {f.type === x.id && <Check className="h-3.5 w-3.5 text-orbit-cyan" />} {x.label}
              </span>
              <span className="block text-[10px] text-white/40">{x.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {(f.type === "single" || f.type === "multi") && (
        <div>
          <span className={label}>Opções</span>
          <div className="space-y-1.5">
            {opts.map((o, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={o}
                  maxLength={80}
                  onChange={(e) => set({ options: opts.map((x, k) => (k === i ? e.target.value : x)) })}
                  className={input}
                  placeholder={`Opção ${i + 1}`}
                />
                <IconBtn label="Subir" onClick={() => set({ options: swap(opts, i, i - 1) })} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Remover opção" onClick={() => set({ options: opts.filter((_, k) => k !== i) })} danger>
                  <X className="h-4 w-4" />
                </IconBtn>
              </div>
            ))}
            {opts.length < 40 && (
              <button type="button" onClick={() => set({ options: [...opts, ""] })} className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-white/70 hover:text-white">
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            )}
          </div>
        </div>
      )}

      {f.type === "list" && (
        <label className="block max-w-[200px]">
          <span className={label}>Quantidade de respostas</span>
          <input type="number" min={1} max={20} value={f.listCount ?? 3} onChange={(e) => set({ listCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={input} />
        </label>
      )}

      {f.type === "image" && (
        <div>
          <span className={label}>Formato do recorte</span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["square", "Quadrado"],
                ["portrait", "Retrato 3:4"],
                ["landscape", "Paisagem 16:9"],
                ["free", "Livre (sem recorte)"],
              ] as const
            ).map(([id, l]) => (
              <button key={id} type="button" onClick={() => set({ shape: id })} className={clsx("rounded-lg border px-3 py-1.5 text-xs", (f.shape ?? "square") === id ? "border-orbit-purple/50 bg-orbit-purple/10 text-white" : "border-white/10 text-white/60")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {f.type === "points" && pts && (
        <div className="space-y-3 rounded-xl border border-white/10 p-3">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["total", "Total de pontos"],
                ["min", "Mínimo"],
                ["max", "Máximo"],
              ] as const
            ).map(([k, l]) => (
              <label key={k}>
                <span className={label}>{l}</span>
                <input type="number" min={0} max={1000} value={pts[k]} onChange={(e) => set({ points: { ...pts, [k]: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) } })} className={input} />
              </label>
            ))}
          </div>
          <Switch on={pts.allowLeftover} onChange={(v) => set({ points: { ...pts, allowLeftover: v } })} title="Pode sobrar pontos" desc="Desligado: o membro precisa distribuir todos para enviar." />
          <div>
            <span className={label}>Atributos</span>
            <div className="space-y-1.5">
              {pts.attrs.map((a, i) => (
                <div key={a.id} className="flex gap-1.5">
                  <input value={a.name} maxLength={40} onChange={(e) => set({ points: { ...pts, attrs: pts.attrs.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) } })} className={input} placeholder={`Atributo ${i + 1}`} />
                  <IconBtn label="Subir" onClick={() => set({ points: { ...pts, attrs: swap(pts.attrs, i, i - 1) } })} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Remover atributo" onClick={() => set({ points: { ...pts, attrs: pts.attrs.filter((_, k) => k !== i) } })} danger>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              ))}
              {pts.attrs.length < 40 && (
                <button type="button" onClick={() => set({ points: { ...pts, attrs: [...pts.attrs, { id: uid(), name: "" }] } })} className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-white/70 hover:text-white">
                  <Plus className="h-3.5 w-3.5" /> Adicionar atributo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {["short", "long", "number", "location", "list"].includes(f.type) && (
        <label className="block">
          <span className={label}>Exemplo dentro do campo (opcional)</span>
          <input value={f.placeholder ?? ""} maxLength={80} onChange={(e) => set({ placeholder: e.target.value })} className={input} placeholder="Ex.: Reservado" />
        </label>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Switch on={f.required} onChange={(v) => set({ required: v })} title="Campo obrigatório" />
        <Switch on={f.editableAfterApproval} onChange={(v) => set({ editableAfterApproval: v })} title="Permitir edição após aprovação" />
        <Switch on={f.narratorOnly} onChange={(v) => set({ narratorOnly: v, required: v ? false : f.required })} title="Só o narrador preenche" desc="O membro vê, mas não edita." />
        <Switch on={!!f.half} onChange={(v) => set({ half: v })} title="Meia largura" desc="Dois campos lado a lado no computador." />
        {f.type === "single" && <Switch on={!!f.filter} onChange={(v) => set({ filter: v })} title="Usar como filtro na lista" desc="Ex.: Raça, Papel na trama." />}
      </div>

      <label className="block max-w-sm">
        <span className={label}>Mostrar no cartão da lista</span>
        <select value={f.card ?? ""} onChange={(e) => set({ card: e.target.value as FieldBlock["card"] })} className={input}>
          {CARD_ROLES.filter((c) => !(c.id === "avatar" || c.id === "cover") || f.type === "image").map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function swap<T>(arr: T[], i: number, j: number) {
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

function StyleEditor({ t, update }: { t: SheetTemplate; update: (fn: (x: SheetTemplate) => SheetTemplate) => void }) {
  const s = t.style;
  const set = (patch: Partial<SheetTemplate["style"]>) => update((x) => ({ ...x, style: { ...x.style, ...patch } }));
  const color = (k: "accent" | "titleColor" | "textColor" | "background" | "border", l: string) => (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
      <input type="color" value={s[k]} onChange={(e) => set({ [k]: e.target.value })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
      <span className="text-sm text-white/80">{l}</span>
    </label>
  );
  const choice = <K extends keyof SheetTemplate["style"]>(k: K, list: [SheetTemplate["style"][K], string][]) => (
    <div className="flex flex-wrap gap-1.5">
      {list.map(([v, l]) => (
        <button key={String(v)} type="button" onClick={() => set({ [k]: v } as Partial<SheetTemplate["style"]>)} className={clsx("rounded-lg border px-3 py-1.5 text-xs", s[k] === v ? "border-orbit-purple/50 bg-orbit-purple/10 text-white" : "border-white/10 text-white/60")}>
          {l}
        </button>
      ))}
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-space-card/70 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={label}>Fonte do título</span>
            <select value={s.titleFont} onChange={(e) => set({ titleFont: e.target.value })} className={input}>
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Fonte do texto</span>
            <select value={s.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })} className={input}>
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <span className={label}>Tamanho do título</span>
          {choice("titleSize", [
            ["md", "Médio"],
            ["lg", "Grande"],
            ["xl", "Muito grande"],
          ])}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {color("accent", "Destaque")}
          {color("titleColor", "Títulos")}
          {color("textColor", "Texto")}
          {color("background", "Fundo das caixas")}
          {color("border", "Bordas")}
        </div>
        <div>
          <span className={label}>Cantos</span>
          {choice("radius", [
            ["none", "Retos"],
            ["md", "Leves"],
            ["lg", "Arredondados"],
            ["xl", "Bem arredondados"],
          ])}
        </div>
        <div>
          <span className={label}>Espaçamento</span>
          {choice("spacing", [
            ["compact", "Compacto"],
            ["normal", "Normal"],
            ["relaxed", "Amplo"],
          ])}
        </div>
        <Switch on={s.boxed} onChange={(v) => set({ boxed: v })} title="Seções em caixas" />
        <Switch on={s.separators} onChange={(v) => set({ separators: v })} title="Linhas separadoras" desc="Quando as seções não estão em caixas." />
      </div>
      <div className="rounded-2xl border border-white/[0.08] p-3" style={sheetVars(t)}>
        <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Prévia</p>
        <SheetHeader t={{ ...t, description: t.description || "Descrição da ficha." }} />
        <div className="mt-3">
          <SheetBody
            t={{ ...t, blocks: t.blocks.length ? t.blocks.slice(0, 4) : [{ id: "s", kind: "section", title: "Seção de exemplo" }, { ...newField("short"), id: "f", label: "Pergunta de exemplo" }] }}
            mode="preview"
            answers={{}}
          />
        </div>
      </div>
    </div>
  );
}

export function BuilderBackLink({ slug }: { slug: string }) {
  return (
    <Link href={`/comunidades/${slug}/fichas`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
      <ArrowLeft className="h-4 w-4" /> Voltar para as fichas
    </Link>
  );
}
