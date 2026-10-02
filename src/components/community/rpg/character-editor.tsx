"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Camera, Code2, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { communityError, uploadCommunityFile } from "@/lib/communities";
import { sanitizeRpgHtml, type RpgCharacter, type RpgConfig, type RpgField } from "@/lib/rpg";
import { useCommunity } from "../context";
import { Sheet } from "../ui";

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

export function CharacterEditor({
  config,
  existing,
  onClose,
  onSaved,
}: {
  config: RpgConfig;
  existing: RpgCharacter | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { supabase, community, viewer } = useCommunity();
  const [fields, setFields] = useState<RpgField[] | null>(null);
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [quote, setQuote] = useState(existing?.quote ?? "");
  const [avatar, setAvatar] = useState<string | null>(existing?.avatarUrl ?? null);
  const [cover, setCover] = useState<string | null>(existing?.coverUrl ?? null);
  const [values, setValues] = useState<Record<string, string>>(existing?.values ?? {});
  const [gallery, setGallery] = useState<string[]>(existing?.gallery ?? []);
  const [html, setHtml] = useState(existing?.customHtml ?? "");
  const [showHtml, setShowHtml] = useState(!!existing?.customHtml);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const fieldImgInput = useRef<HTMLInputElement>(null);
  const fieldImgFor = useRef<string | null>(null);

  useEffect(() => {
    supabase.rpc("rpg_fields", { p_community: community.id }).then(({ data }) => setFields((data ?? []) as RpgField[]));
  }, [supabase, community.id]);

  async function upload(f: File, tag: string): Promise<string | null> {
    if (!viewer) return null;
    setUploading(tag);
    try {
      const r = await uploadCommunityFile(supabase, viewer.id, community.id, f, "image");
      return r.url;
    } catch {
      setError("Não foi possível enviar a imagem.");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (name.trim().length < 1) return setError("Dê um nome ao personagem.");
    const missing = (fields ?? []).find((f) => f.required && !((values[f.id] ?? "").trim()));
    if (missing) return setError(`Preencha o campo obrigatório: ${missing.label}.`);
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      id: existing?.id,
      name: name.trim(),
      role: role.trim(),
      quote: quote.trim(),
      avatarUrl: avatar,
      coverUrl: cover,
      values,
      gallery,
    };
    if (config.allowHtml && showHtml) payload.customHtml = sanitizeRpgHtml(html);
    const { data, error: e } = await supabase.rpc("rpg_character_save", { p_community: community.id, p: payload as never });
    setBusy(false);
    if (e) return setError(communityError(e.message));
    onSaved(data as string);
  }

  const grouped = groupFields(fields ?? []);

  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      wide
      title={existing ? "Editar ficha" : "Criar personagem"}
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <span className="min-w-0 flex-1 truncate text-xs text-white/45">em {community.name}</span>}
          <button type="button" onClick={save} disabled={busy} className="flex h-10 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar ficha
          </button>
        </div>
      }
    >
      {fields === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Capa + avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className="relative block aspect-[16/6] w-full overflow-hidden rounded-2xl border border-white/10 bg-space-bg/60"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center gap-2 text-xs text-white/45"><Camera className="h-4 w-4" /> Capa da ficha</span>
              )}
              {uploading === "cover" && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>}
            </button>
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute -bottom-3 left-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-space-surface bg-space-card"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-5 w-5 text-white/50" />
              )}
              {uploading === "avatar" && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-white" /></span>}
            </button>
          </div>
          <input ref={coverInput} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const u = await upload(f, "cover"); if (u) setCover(u); } }} />
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const u = await upload(f, "avatar"); if (u) setAvatar(u); } }} />

          <div className="pt-3 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nome do personagem" className={clsx(field, "font-semibold")} />
            <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} placeholder="Cargo / função no RPG (ex.: Vice-presidente)" className={field} />
            <input value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={140} placeholder="Frase do personagem (opcional)" className={field} />
          </div>

          {/* Campos personalizados definidos pela comunidade */}
          {grouped.map(([section, list]) => (
            <div key={section} className="space-y-3">
              {section && <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{section}</p>}
              {list.map((f) => (
                <div key={f.id}>
                  <label className="mb-1 block text-xs text-white/60">
                    {f.label}
                    {f.required && <span className="text-orbit-pink"> *</span>}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} rows={4} maxLength={5000} className={clsx(field, "resize-y")} />
                  ) : f.type === "select" ? (
                    <select value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} className={field}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "image" ? (
                    <div className="flex items-center gap-2">
                      {values[f.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={values[f.id]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      )}
                      <button type="button" onClick={() => { fieldImgFor.current = f.id; fieldImgInput.current?.click(); }} className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm text-white/80 hover:bg-white/5">
                        <Camera className="h-4 w-4" /> {values[f.id] ? "Trocar imagem" : "Enviar imagem"}
                      </button>
                    </div>
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"} value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} maxLength={300} className={field} />
                  )}
                </div>
              ))}
            </div>
          ))}
          <input ref={fieldImgInput} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; const key = fieldImgFor.current; if (f && key) { const u = await upload(f, "field"); if (u) setValues((v) => ({ ...v, [key]: u })); } }} />

          {/* Galeria */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/60">Galeria</p>
            <div className="flex flex-wrap gap-2">
              {gallery.map((g) => (
                <span key={g} className="relative h-20 w-20 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setGallery((l) => l.filter((x) => x !== g))} aria-label="Remover" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
              <button type="button" onClick={() => galleryInput.current?.click()} className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/20 text-white/50 hover:border-orbit-purple/50">
                {uploading === "gallery" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              </button>
            </div>
            <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; for (const f of files.slice(0, 12)) { const u = await upload(f, "gallery"); if (u) setGallery((l) => [...l, u].slice(0, 24)); } }} />
          </div>

          {/* HTML opcional (se a comunidade permitir) */}
          {config.allowHtml && (
            <div className="rounded-2xl border border-white/10 bg-space-bg/40 p-3">
              <button type="button" onClick={() => setShowHtml((v) => !v)} className="flex w-full items-center gap-2 text-sm font-semibold text-white">
                <Code2 className="h-4 w-4 text-orbit-cyan" /> Personalização por HTML
                <span className={clsx("ml-auto relative h-6 w-11 rounded-full transition", showHtml ? "bg-orbit-gradient" : "bg-white/15")}>
                  <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", showHtml ? "left-[22px]" : "left-0.5")} />
                </span>
              </button>
              {showHtml && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] text-white/45">Apenas HTML de formatação é aceito. Scripts, iframes e códigos perigosos são removidos automaticamente ao salvar.</p>
                  <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={6} placeholder="<b>Meu personagem</b>…" className={clsx(field, "resize-y font-mono text-xs")} />
                  <button type="button" onClick={() => setPreview((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/5">
                    <Eye className="h-3.5 w-3.5" /> {preview ? "Ocultar prévia" : "Ver prévia segura"}
                  </button>
                  {preview && (
                    <div className="rounded-xl border border-white/10 bg-space-bg/60 p-3">
                      <div className="rpg-html prose-invert max-w-none text-sm text-white/85" dangerouslySetInnerHTML={{ __html: sanitizeRpgHtml(html) }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function groupFields(fields: RpgField[]): [string, RpgField[]][] {
  const map = new Map<string, RpgField[]>();
  for (const f of fields) {
    const k = f.section ?? "";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(f);
  }
  return Array.from(map.entries());
}
