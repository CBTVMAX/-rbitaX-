"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, BarChart3, Eye, EyeOff, ImagePlus, Loader2, Plus, Save, Star, Trash2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinIcon, formatCoins } from "@/components/coins";
import { useStoreToast } from "@/components/store/store-view";
import { invalidateCatalog, RATING_LABEL, stickerPreviewUrl, STICKER_COLUMNS, type Pack, type Rating, type Sticker } from "@/lib/stickers/catalog";

export type AdminPack = Pack & { active: boolean; availableFrom: string | null };
export type PackStats = { packId: string; sales: number; revenue: number; installs: number; favorites: number; stickerFavorites: number; sends: number; senders: number };

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/webp", "image/gif"];
const SLUG = /^[a-z0-9-]{1,32}$/;

function slugify(s: string, max = 40) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "adesivo"
  );
}

/** Animated? GIF with more than one frame, WebP with an ANIM chunk, or APNG (acTL). */
async function isAnimated(file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const has = (tag: string, limit = buf.length) => {
    const t = [...tag].map((c) => c.charCodeAt(0));
    for (let i = 0; i < Math.min(buf.length, limit) - t.length; i++) if (t.every((v, j) => buf[i + j] === v)) return true;
    return false;
  };
  if (file.type === "image/webp") return has("ANIM", 4096);
  if (file.type === "image/png") return has("acTL", 8192);
  if (file.type === "image/gif") {
    let frames = 0;
    for (let i = 0; i < buf.length - 3; i++) if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) frames++;
    return frames > 1;
  }
  return false;
}

async function inspect(file: File) {
  if (!TYPES.includes(file.type)) throw new Error("Use PNG, WebP ou GIF.");
  if (file.size > MAX_BYTES) throw new Error("Arquivo acima de 2 MB.");
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;
  if (width < 64 || height < 64 || width > 1024 || height > 1024) {
    bmp.close();
    throw new Error("Dimensões entre 64 e 1024 px.");
  }
  // Light still preview for pickers and the store (first frame, max 112px).
  const scale = Math.min(1, 112 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const preview = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Prévia falhou."))), "image/webp", 0.82));
  return { width, height, animated: await isAnimated(file), preview };
}

const EMPTY: Partial<AdminPack> = {
  id: "",
  name: "",
  creator: "Órbita X",
  description: "",
  categories: [],
  rating: "livre",
  tier: "free",
  priceCoins: null,
  published: false,
  featured: false,
  exclusive: false,
  isDefault: false,
  availableUntil: null,
  sortOrder: 500,
  active: true,
};

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm text-white">{label}</span>
        {hint && <span className="block text-[11px] text-white/45">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-orbit-gradient" : "bg-white/15")}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function AdminStickersView({ packs: initialPacks, stats, categories }: { packs: AdminPack[]; stats: PackStats[]; categories: { id: string; name: string; emoji: string }[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [packs, setPacks] = useState(initialPacks);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<AdminPack>>(EMPTY);
  const [stickers, setStickers] = useState<Sticker[] | null>(null);
  const [uploads, setUploads] = useState<{ name: string; state: "wait" | "ok" | "error"; message?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"packs" | "stats">("packs");
  const fileInput = useRef<HTMLInputElement>(null);
  const statsBy = useMemo(() => new Map(stats.map((s) => [s.packId, s])), [stats]);

  useEffect(() => {
    if (!selected || selected === "new") {
      setStickers(selected === "new" ? [] : null);
      return;
    }
    const p = packs.find((x) => x.id === selected);
    if (p) setDraft(p);
    setStickers(null);
    supabase
      .from("Sticker")
      .select(`${STICKER_COLUMNS}, active`)
      .eq("packId", selected)
      .order("sortOrder")
      .then(({ data }) => setStickers((data ?? []) as unknown as Sticker[]));
  }, [selected, packs, supabase]);

  const set = <K extends keyof AdminPack>(k: K, v: AdminPack[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function savePack(extra?: Partial<AdminPack>) {
    const d = { ...draft, ...extra };
    const id = selected === "new" ? slugify(d.id || d.name || "", 32) : (selected as string);
    if (!SLUG.test(id)) return toast("Identificador inválido (letras minúsculas, números e hífen).", true);
    if (!d.name?.trim()) return toast("Dê um nome ao pack.", true);
    if (d.tier === "premium" && !(d.priceCoins && d.priceCoins > 0)) return toast("Packs premium precisam de preço em Órbita Coins.", true);
    if (d.published && selected !== "new" && !(stickers ?? []).some((s) => (s as Sticker & { active?: boolean }).active !== false))
      return toast("Adicione adesivos antes de publicar.", true);
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_pack", {
      p: {
        id,
        name: d.name.trim(),
        creator: d.creator,
        description: d.description,
        categories: d.categories,
        rating: d.rating,
        tier: d.tier,
        priceCoins: d.tier === "premium" ? d.priceCoins : null,
        published: selected === "new" ? false : d.published,
        featured: d.featured,
        exclusive: d.exclusive,
        isDefault: d.isDefault,
        availableUntil: d.availableUntil ?? "",
        sortOrder: d.sortOrder,
        active: d.active ?? true,
        ...(d.cover ? { cover: d.cover } : {}),
      },
    });
    setSaving(false);
    if (error) return toast(/forbidden/.test(error.message) ? "Sem permissão de administrador." : "Não foi possível salvar o pack.", true);
    invalidateCatalog();
    toast(selected === "new" ? "Pack criado. Agora envie os adesivos." : "Pack salvo.");
    const { data } = await supabase.from("StickerPack").select("*").eq("id", id).single();
    if (data) {
      const next = { ...(data as unknown as AdminPack), coverUrl: draft.coverUrl ?? "" };
      setPacks((list) => (list.some((p) => p.id === id) ? list.map((p) => (p.id === id ? { ...p, ...next } : p)) : [...list, next]));
      setDraft(next);
    }
    setSelected(id);
    router.refresh();
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !selected || selected === "new") return;
    const pack = packs.find((p) => p.id === selected);
    if (!pack) return;
    const list = [...files].slice(0, 60);
    setUploads(list.map((f) => ({ name: f.name, state: "wait" })));
    const taken = new Set((stickers ?? []).map((s) => s.slug));
    let order = Math.max(0, ...(stickers ?? []).map((s) => s.sortOrder));
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const mark = (state: "ok" | "error", message?: string) => setUploads((u) => u.map((x, j) => (j === i ? { ...x, state, message } : x)));
      try {
        const info = await inspect(f);
        const label = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
        let slug = slugify(label);
        for (let n = 2; taken.has(slug); n++) slug = `${slugify(label, 36)}-${n}`;
        taken.add(slug);
        const ext = f.type === "image/gif" ? "gif" : f.type === "image/png" ? "png" : "webp";
        const premium = pack.tier === "premium";
        const file = `${pack.id}/${slug}.${ext}`;
        const preview = `${pack.id}/${slug}-s.webp`;
        const up = await supabase.storage.from(premium ? "sticker-premium" : "sticker-assets").upload(file, f, { contentType: f.type, cacheControl: "31536000", upsert: false });
        if (up.error) throw new Error("Upload recusado.");
        const pv = await supabase.storage.from("sticker-assets").upload(preview, info.preview, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (pv.error) throw new Error("Prévia recusada.");
        const { error } = await supabase.rpc("admin_save_sticker", {
          p: {
            packId: pack.id,
            slug,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            storage: premium ? "premium" : "public",
            file,
            preview,
            format: info.animated ? "animated" : "static",
            mime: f.type,
            width: info.width,
            height: info.height,
            bytes: f.size,
            size: Math.max(info.width, info.height) <= 160 ? "mini" : "normal",
            rating: pack.rating,
            sortOrder: ++order,
          },
        });
        if (error) throw new Error("Cadastro recusado.");
        mark("ok");
      } catch (e) {
        mark("error", e instanceof Error ? e.message : "Falhou.");
      }
    }
    invalidateCatalog();
    const { data } = await supabase.from("Sticker").select(`${STICKER_COLUMNS}, active`).eq("packId", pack.id).order("sortOrder");
    setStickers((data ?? []) as unknown as Sticker[]);
    router.refresh();
  }

  async function updateSticker(s: Sticker, patch: Partial<Sticker> & { active?: boolean }) {
    const { error } = await supabase.rpc("admin_save_sticker", {
      p: { packId: s.packId, slug: s.slug, label: s.label, keywords: s.keywords, size: s.size, hasText: s.hasText, rating: s.rating, active: true, ...patch },
    });
    if (error) return toast("Não foi possível salvar o adesivo.", true);
    setStickers((list) => (list ?? []).map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    invalidateCatalog();
  }

  async function removeSticker(s: Sticker) {
    if (!window.confirm(`Remover “${s.label}”? Se já foi enviado em conversas, ele é arquivado (continua visível nas mensagens antigas).`)) return;
    const { data, error } = await supabase.rpc("admin_delete_sticker", { p_sticker: s.id });
    if (error) return toast("Não foi possível remover.", true);
    setStickers((list) => (list ?? []).filter((x) => x.id !== s.id));
    invalidateCatalog();
    toast(data === "archived" ? "Adesivo arquivado." : "Adesivo removido.");
  }

  async function removePack() {
    if (!selected || selected === "new") return;
    if (!window.confirm("Excluir este pack? Packs já comprados ou usados são apenas despublicados, para não tirar nada de quem pagou.")) return;
    const { data, error } = await supabase.rpc("admin_delete_pack", { p_pack: selected });
    if (error) return toast("Não foi possível excluir.", true);
    invalidateCatalog();
    if (data === "deleted") {
      setPacks((l) => l.filter((p) => p.id !== selected));
      setSelected(null);
    } else {
      setPacks((l) => l.map((p) => (p.id === selected ? { ...p, published: false } : p)));
      set("published", false);
    }
    toast(data === "deleted" ? "Pack excluído." : "Pack despublicado (já tinha compras ou envios).");
    router.refresh();
  }

  const totals = stats.reduce((a, s) => ({ sales: a.sales + s.sales, revenue: a.revenue + s.revenue, sends: a.sends + s.sends, installs: a.installs + s.installs }), { sales: 0, revenue: 0, sends: 0, installs: 0 });
  const editing = selected !== null;
  const input = "w-full rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-orbit-purple/60";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-3 md:px-6 md:pt-6">
      <div className="flex items-center gap-2.5">
        <Link href="/loja/adesivos" aria-label="Voltar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Administrar adesivos</h1>
          <p className="text-xs text-white/50">{packs.length} packs · todas as ações são verificadas no servidor</p>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              ["packs", "Packs"],
              ["stats", "Estatísticas"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={clsx("rounded-full px-3 py-1 text-xs font-semibold", tab === id ? "bg-white/[0.12] text-white" : "text-white/55")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "stats" ? (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {[
              ["Vendas", totals.sales],
              ["Órbita Coins", totals.revenue],
              ["Instalações", totals.installs],
              ["Envios", totals.sends],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-2xl border border-white/10 bg-space-surface/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-white">{formatCoins(v as number)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-white/45">
                <tr>
                  {["Pack", "Vendas", "Coins", "Instalados", "Favoritos", "Adesivos favoritados", "Envios", "Pessoas"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => {
                  const s = statsBy.get(p.id);
                  return (
                    <tr key={p.id} className="border-t border-white/[0.06] text-white/80">
                      <td className="px-3 py-2 font-medium text-white">{p.name}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.sales ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.revenue ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.installs ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.favorites ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.stickerFavorites ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.sends ?? 0}</td>
                      <td className="px-3 py-2 tabular-nums">{s?.senders ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-5 md:grid md:grid-cols-[300px_1fr] md:gap-5">
          <aside className={clsx("space-y-1.5", editing && "hidden md:block")}>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY);
                setSelected("new");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient py-2.5 text-sm font-semibold text-snow shadow-glow"
            >
              <Plus className="h-4 w-4" /> Novo pack
            </button>
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left transition",
                  selected === p.id ? "border-orbit-purple/50 bg-orbit-purple/10" : "border-white/[0.06] bg-space-surface/60 hover:border-white/15"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white/5 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                  <span className="block truncate text-[11px] text-white/45">
                    {p.stickers.length} · {p.tier === "premium" ? `${p.priceCoins} coins` : "grátis"} · {RATING_LABEL[p.rating]}
                  </span>
                </span>
                {!p.published ? <EyeOff className="h-4 w-4 shrink-0 text-white/35" aria-label="Não publicado" /> : p.featured ? <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Destaque" /> : null}
              </button>
            ))}
          </aside>

          {editing ? (
            <section className="rounded-3xl border border-white/10 bg-space-surface/70 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-2">
                <button type="button" onClick={() => setSelected(null)} className="rounded-full p-1.5 text-white/60 hover:text-white md:hidden" aria-label="Voltar para a lista">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="flex-1 truncate font-semibold text-white">{selected === "new" ? "Novo pack" : draft.name}</h2>
                {selected !== "new" && (
                  <>
                    <Link href={`/loja/adesivos/${selected}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                      Ver na loja
                    </Link>
                    <button type="button" onClick={removePack} className="rounded-full border border-red-400/30 p-1.5 text-red-300 hover:bg-red-400/10" aria-label="Excluir pack">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {selected === "new" && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/55">Identificador (URL)</span>
                    <input className={input} value={draft.id ?? ""} onChange={(e) => set("id", slugify(e.target.value, 32))} placeholder="ex.: gatinhos-neon" />
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">Nome</span>
                  <input className={input} value={draft.name ?? ""} maxLength={60} onChange={(e) => set("name", e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">Criador</span>
                  <input className={input} value={draft.creator ?? ""} maxLength={60} onChange={(e) => set("creator", e.target.value)} />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-white/55">Descrição</span>
                  <textarea className={clsx(input, "min-h-[70px] resize-y")} value={draft.description ?? ""} maxLength={400} onChange={(e) => set("description", e.target.value)} />
                </label>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs text-white/55">Categorias</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => {
                      const on = draft.categories?.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => set("categories", on ? (draft.categories ?? []).filter((x) => x !== c.id) : [...(draft.categories ?? []), c.id])}
                          className={clsx("rounded-full px-2.5 py-1 text-xs transition", on ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}
                        >
                          {c.emoji} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">Classificação</span>
                  <select className={input} value={draft.rating} onChange={(e) => set("rating", e.target.value as Rating)}>
                    <option value="livre">Livre</option>
                    <option value="sensivel">Sensível</option>
                    <option value="adulto">Adulto (+18, nunca explícito)</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/55">Tipo</span>
                    <select className={input} value={draft.tier} onChange={(e) => set("tier", e.target.value as "free" | "premium")}>
                      <option value="free">Grátis</option>
                      <option value="premium">Premium</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-white/55">
                      <CoinIcon className="h-3 w-3" /> Preço
                    </span>
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={100000}
                      disabled={draft.tier !== "premium"}
                      value={draft.priceCoins ?? ""}
                      onChange={(e) => set("priceCoins", e.target.value ? Math.max(1, Number(e.target.value)) : null)}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">Disponível até (evento / sazonal)</span>
                  <input
                    className={input}
                    type="datetime-local"
                    value={draft.availableUntil ? draft.availableUntil.slice(0, 16) : ""}
                    onChange={(e) => set("availableUntil", e.target.value ? new Date(e.target.value).toISOString() : null)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/55">Ordem na loja</span>
                  <input className={input} type="number" value={draft.sortOrder ?? 500} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
                </label>
                <Toggle on={!!draft.published} onChange={(v) => set("published", v)} label="Publicado" hint="Visível na loja e no seletor" />
                <Toggle on={!!draft.featured} onChange={(v) => set("featured", v)} label="Destaque" hint="Aparece em Destaques" />
                <Toggle on={!!draft.exclusive} onChange={(v) => set("exclusive", v)} label="Exclusivo / evento" />
                <Toggle on={!!draft.isDefault} onChange={(v) => set("isDefault", v)} label="Já vem instalado" hint="Só para packs grátis" />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => savePack()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow shadow-glow disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {selected === "new" ? "Criar pack" : "Salvar"}
                </button>
              </div>

              {selected !== "new" && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">Adesivos ({stickers?.length ?? "…"})</h3>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/webp,image/gif"
                      multiple
                      hidden
                      onChange={(e) => {
                        upload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-full border border-orbit-purple/40 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orbit-purple/10">
                      <Upload className="h-3.5 w-3.5" /> Enviar arquivos
                    </button>
                  </div>
                  <p className="mb-3 text-[11px] text-white/45">PNG, WebP ou GIF (animados também) · até 2 MB · 64–1024 px. A prévia leve é gerada automaticamente.</p>
                  {uploads.length > 0 && (
                    <div className="mb-3 space-y-1 rounded-2xl border border-white/10 p-2">
                      {uploads.map((u, i) => (
                        <p key={i} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-white/70">{u.name}</span>
                          <span className={clsx("shrink-0", u.state === "ok" ? "text-emerald-400" : u.state === "error" ? "text-red-300" : "text-white/40")}>
                            {u.state === "wait" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.state === "ok" ? "Enviado" : u.message}
                          </span>
                        </p>
                      ))}
                      <button type="button" onClick={() => setUploads([])} className="text-[11px] text-white/45 hover:text-white">
                        Limpar
                      </button>
                    </div>
                  )}
                  {stickers === null ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                    </div>
                  ) : stickers.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 py-10 text-sm text-white/55 hover:border-orbit-purple/40"
                    >
                      <ImagePlus className="h-6 w-6" /> Envie os primeiros adesivos
                    </button>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {stickers.map((s) => (
                        <div key={s.id} className={clsx("flex items-center gap-2 rounded-2xl border p-2", draft.cover === s.slug ? "border-orbit-purple/50" : "border-white/[0.06]")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={stickerPreviewUrl(s)} alt="" loading="lazy" className="h-12 w-12 shrink-0 object-contain" />
                          <div className="min-w-0 flex-1">
                            <input
                              defaultValue={s.label}
                              maxLength={80}
                              onBlur={(e) => e.target.value !== s.label && updateSticker(s, { label: e.target.value })}
                              className="w-full rounded-lg bg-transparent px-1 py-0.5 text-xs text-white outline-none focus:bg-white/5"
                              aria-label="Nome do adesivo"
                            />
                            <div className="mt-1 flex items-center gap-1">
                              <select
                                value={s.rating}
                                onChange={(e) => updateSticker(s, { rating: e.target.value as Rating })}
                                className="rounded-md bg-white/5 px-1 py-0.5 text-[10px] text-white/70 outline-none"
                                aria-label="Classificação"
                              >
                                <option value="livre">Livre</option>
                                <option value="sensivel">Sensível</option>
                                <option value="adulto">+18</option>
                              </select>
                              <select
                                value={s.size}
                                onChange={(e) => updateSticker(s, { size: e.target.value as Sticker["size"] })}
                                className="rounded-md bg-white/5 px-1 py-0.5 text-[10px] text-white/70 outline-none"
                                aria-label="Tamanho"
                              >
                                <option value="mini">Mini</option>
                                <option value="normal">Normal</option>
                                <option value="large">Grande</option>
                              </select>
                              {s.format === "animated" && <span className="rounded-md bg-orbit-purple/20 px-1 text-[9px] font-bold uppercase text-white/80">anim</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                set("cover", s.slug);
                                savePack({ cover: s.slug });
                              }}
                              title="Usar como capa"
                              aria-label="Usar como capa"
                              className={clsx("rounded-md p-1", draft.cover === s.slug ? "text-amber-400" : "text-white/40 hover:text-white")}
                            >
                              <Star className={clsx("h-3.5 w-3.5", draft.cover === s.slug && "fill-current")} />
                            </button>
                            <button type="button" onClick={() => removeSticker(s)} aria-label="Remover adesivo" className="rounded-md p-1 text-white/40 hover:text-red-300">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selected !== "new" && statsBy.get(selected as string) && (
                <p className="mt-5 flex items-center gap-1.5 text-[11px] text-white/45">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {statsBy.get(selected as string)!.sales} vendas · {statsBy.get(selected as string)!.installs} instalações · {statsBy.get(selected as string)!.sends} envios ·{" "}
                  {statsBy.get(selected as string)!.favorites} favoritos
                  <Eye className="ml-1 h-3.5 w-3.5" /> {draft.published ? "publicado" : "rascunho"}
                </p>
              )}
            </section>
          ) : (
            <div className="hidden rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/45 md:block">Escolha um pack para editar ou crie um novo.</div>
          )}
        </div>
      )}
      {node}
    </div>
  );
}
