"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Camera, Check, Globe, ImagePlus, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import { ACCENTS, ACCEPT, accentOf, communityError, uploadCommunityFile, type CommunityLink } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm } from "../ui";
import { Card, Field, inputCls, ReadOnlyNote, SaveButton } from "./fields";

type Form = {
  name: string;
  username: string;
  category: string;
  description: string;
  rules: string;
  accentColor: string;
  avatarUrl: string;
  coverUrl: string;
  isPrivate: boolean;
  links: CommunityLink[];
};

export function GeneralSection({ onSaved }: { onSaved: (patch: Partial<Form>) => void }) {
  const { community, role, supabase, viewer, toast } = useCommunity();
  const router = useRouter();
  const owner = role === "owner";
  const initial: Form = {
    name: community.name,
    username: community.username,
    category: community.category ?? "",
    description: community.description ?? "",
    rules: community.rules ?? "",
    accentColor: community.accentColor ?? "orbita",
    avatarUrl: community.avatarUrl ?? "",
    coverUrl: community.coverUrl ?? "",
    isPrivate: community.isPrivate,
    links: community.links ?? [],
  };
  const [saved, setSaved] = useState(initial);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"avatarUrl" | "coverUrl" | null>(null);
  const [privacyConfirm, setPrivacyConfirm] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const changed = (Object.keys(f) as (keyof Form)[]).filter((k) => JSON.stringify(f[k]) !== JSON.stringify(saved[k]));
  const accent = accentOf(f.accentColor);

  async function upload(file: File | undefined, key: "avatarUrl" | "coverUrl") {
    if (!file || !viewer) return;
    setUploading(key);
    try {
      const r = await uploadCommunityFile(supabase, viewer.id, community.id, file, "image");
      set(key, r.url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha no envio da imagem.", true);
    }
    setUploading(null);
  }

  async function save(force = false) {
    if (!changed.length) return;
    if (changed.includes("isPrivate") && !f.isPrivate && !force) return setPrivacyConfirm(true);
    const links = f.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.label || l.url);
    if (links.some((l) => !/^https?:\/\/\S+\.\S+/.test(l.url) || !l.label)) return toast("Cada link precisa de um nome e de um endereço começando com https://", true);
    const patch: Record<string, unknown> = {};
    for (const k of changed) patch[k] = k === "links" ? links : typeof f[k] === "string" ? (f[k] as string).trim() : f[k];
    setBusy(true);
    const { error } = await supabase.rpc("community_update", { p_community: community.id, p: patch as never });
    setBusy(false);
    setPrivacyConfirm(false);
    if (error) {
      if (/invalid_links/.test(error.message)) return toast("Confira os links: no máximo 8, com nome de até 40 letras.", true);
      if (/invalid_image/.test(error.message)) return toast("Envie a imagem de novo.", true);
      return toast(communityError(error.message), true);
    }
    const next = { ...f, links };
    setSaved(next);
    setF(next);
    onSaved(next);
    toast("Comunidade atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card title="Aparência" desc="Foto, capa e cor de destaque aparecem no topo da comunidade e nos cards da lista.">
        <div className="overflow-hidden rounded-3xl border border-white/[0.08]">
          <div className="relative h-32 md:h-40" style={{ background: `linear-gradient(135deg, ${accent.from}, rgb(${accent.rgb}) 55%, ${accent.to})` }}>
            {f.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => coverInput.current?.click()} className="flex h-10 items-center gap-1.5 rounded-full bg-black/55 px-3.5 text-xs font-semibold text-white backdrop-blur">
                {uploading === "coverUrl" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {f.coverUrl ? "Trocar capa" : "Adicionar capa"}
              </button>
              {f.coverUrl && (
                <button type="button" onClick={() => set("coverUrl", "")} aria-label="Remover capa" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end gap-3 px-4 pb-4">
            <div className="relative -mt-8">
              <span className="block rounded-[22px] p-[3px]" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[19px] bg-space-card text-2xl font-bold text-white">
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    f.name.slice(0, 1).toUpperCase()
                  )}
                </span>
              </span>
              <button type="button" onClick={() => avatarInput.current?.click()} aria-label="Trocar foto" className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-space-card bg-orbit-gradient text-snow">
                {uploading === "avatarUrl" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
            {f.avatarUrl && (
              <button type="button" onClick={() => set("avatarUrl", "")} className="mb-1 text-xs font-semibold text-white/50 hover:text-white">
                Remover foto
              </button>
            )}
          </div>
        </div>
        <input ref={avatarInput} type="file" accept={ACCEPT.image} hidden onChange={(e) => (upload(e.target.files?.[0], "avatarUrl"), (e.target.value = ""))} />
        <input ref={coverInput} type="file" accept={ACCEPT.image} hidden onChange={(e) => (upload(e.target.files?.[0], "coverUrl"), (e.target.value = ""))} />
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">Tema da comunidade</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => set("accentColor", a.id)}
              aria-pressed={f.accentColor === a.id}
              className={clsx("flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition", f.accentColor === a.id ? "border-white/60 text-white" : "border-white/10 text-white/60 hover:text-white")}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}>
                {f.accentColor === a.id && <Check className="h-3.5 w-3.5 text-white" />}
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Informações">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} className={inputCls} />
          </Field>
          <Field label="@ da comunidade" hint={owner ? "3 a 30 letras minúsculas, números, ponto ou _." : "Somente o proprietário pode mudar o @."}>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">@</span>
              <input
                value={f.username}
                onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30))}
                disabled={!owner}
                className={clsx(inputCls, "pl-8")}
              />
            </div>
          </Field>
          <Field label="Categoria">
            <select value={f.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              <option value="">Sem categoria</option>
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição" hint={`${f.description.length}/1000`}>
              <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} rows={4} className={clsx(inputCls, "resize-y")} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Regras" hint="Aparecem na lateral da comunidade e ajudam a moderação.">
              <textarea value={f.rules} onChange={(e) => set("rules", e.target.value)} maxLength={2000} rows={4} placeholder={"1. Respeite todos os membros\n2. Sem spam ou golpes"} className={clsx(inputCls, "resize-y")} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Links" desc="Site, canal, suporte… até 8 links.">
        <div className="space-y-2">
          {f.links.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl bg-white/[0.02] p-2 sm:flex-row">
              <input value={l.label} onChange={(e) => set("links", f.links.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} maxLength={40} placeholder="Nome (ex.: Site oficial)" className={clsx(inputCls, "sm:w-48")} />
              <div className="flex flex-1 gap-2">
                <input value={l.url} onChange={(e) => set("links", f.links.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" inputMode="url" className={inputCls} />
                <button type="button" onClick={() => set("links", f.links.filter((_, k) => k !== i))} aria-label="Remover link" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-white/60 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {f.links.length < 8 && (
            <button type="button" onClick={() => set("links", [...f.links, { label: "", url: "" }])} className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed border-white/20 px-4 text-xs font-semibold text-white/70 hover:text-white">
              <Plus className="h-4 w-4" /> Adicionar link
            </button>
          )}
        </div>
      </Card>

      <Card title="Privacidade">
        {!owner && <ReadOnlyNote>Somente o proprietário pode mudar a privacidade.</ReadOnlyNote>}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            { v: false, icon: Globe, title: "Pública", text: "Qualquer pessoa vê o conteúdo e entra na hora." },
            { v: true, icon: Lock, title: "Privada", text: "Só membros veem o conteúdo. Pedidos de entrada passam pela administração." },
          ].map((o) => {
            const Icon = o.icon;
            const active = f.isPrivate === o.v;
            return (
              <button
                key={o.title}
                type="button"
                disabled={!owner}
                onClick={() => set("isPrivate", o.v)}
                aria-pressed={active}
                className={clsx(
                  "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed",
                  active ? "border-orbit-purple/60 bg-orbit-purple/[0.08]" : "border-white/10 hover:border-white/25",
                  !owner && !active && "opacity-50"
                )}
              >
                <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-orbit-gradient text-snow" : "bg-white/[0.05] text-white/60")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{o.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {changed.length > 0 && (
      <div className="animate-sheet-up sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-end gap-3 rounded-full border border-white/10 bg-space-surface/95 p-2 pl-5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:bottom-4">
        <span className="flex-1 text-xs text-white/65">{`${changed.length} ${changed.length === 1 ? "alteração" : "alterações"} não salvas`}</span>
        {(
          <button type="button" onClick={() => setF(saved)} className="min-h-[44px] rounded-full px-4 text-xs font-semibold text-white/70 hover:text-white">
            Descartar
          </button>
        )}
        <SaveButton busy={busy} disabled={!!uploading} onClick={() => save()} />
      </div>
      )}

      <Confirm
        open={privacyConfirm}
        danger={false}
        busy={busy}
        title="Tornar a comunidade pública?"
        message="Todo o conteúdo fica visível para qualquer pessoa e os pedidos de entrada pendentes são aprovados automaticamente."
        confirmLabel="Tornar pública"
        onClose={() => setPrivacyConfirm(false)}
        onConfirm={() => save(true)}
      />
    </div>
  );
}
