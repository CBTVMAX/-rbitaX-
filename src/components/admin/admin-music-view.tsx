"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Loader2,
  Music2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
  Youtube,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";
import { compressImage } from "@/lib/messenger/media";
import { formatDuration, genreLabel, GENRES, parseYouTubeId, youtubeThumb } from "@/lib/music";
import { splitVideoTitle } from "@/components/music/dialogs";

// ---------------------------------------------------------------- utilidades
const card = "rounded-2xl border border-white/10 bg-space-card/70";
const input =
  "w-full rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple";
const primary =
  "flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50";
const ghost = "flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white disabled:opacity-40";

/** Categorias do catálogo de hits (as do catálogo livre ficam de fora). */
const CATEGORIES = GENRES.slice(0, GENRES.findIndex((g) => g.id === "rock"));
const RIGHTS = [
  { id: "Própria ou autorizada pelo artista", label: "Própria ou autorizada pelo artista" },
  { id: "Licença comercial", label: "Licença comercial" },
  { id: "Creative Commons", label: "Creative Commons" },
  { id: "Domínio público", label: "Domínio público" },
];
const MAX_AUDIO = 50 * 1024 * 1024;
const AUDIO_EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/flac": "flac" };

function adminError(msg: string) {
  if (/admin_mfa_required/.test(msg)) return "Ações de administrador exigem verificação em duas etapas. Ative em Configurações › Segurança.";
  if (/ja_existe/.test(msg)) return "Esta música já está no catálogo.";
  if (/arquivo_invalido/.test(msg)) return "O arquivo não foi enviado corretamente. Tente de novo.";
  if (/titulo_artista/.test(msg)) return "Preencha título e artista.";
  if (/categoria/.test(msg)) return "Escolha uma categoria.";
  return "Não foi possível concluir a ação.";
}

function storagePath(url: string | null | undefined) {
  const marker = "/storage/v1/object/public/media/";
  const at = url ? url.indexOf(marker) : -1;
  return at >= 0 ? decodeURIComponent(url!.slice(at + marker.length)) : null;
}

/** "Queen - Bohemian Rhapsody.mp3" → artista e título. */
function fromFileName(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").replace(/^\d{1,3}[\s.-]+/, "").trim();
  const parts = base.split(/\s[-–—]\s/);
  return parts.length >= 2 ? { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() } : { artist: "", title: base };
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => (resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null), URL.revokeObjectURL(url));
    a.onerror = () => (resolve(null), URL.revokeObjectURL(url));
    a.src = url;
  });
}

function Flash({ flash }: { flash: { text: string; error?: boolean } | null }) {
  if (!flash) return null;
  return (
    <p className={clsx("rounded-xl border px-3 py-2 text-sm", flash.error ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200")}>
      {flash.text}
    </p>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      <option value="">Categoria…</option>
      {CATEGORIES.map((g) => (
        <option key={g.id} value={g.id}>
          {g.label}
        </option>
      ))}
    </select>
  );
}

type Tab = "arquivos" | "youtube" | "catalogo";

export function AdminMusicView() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("arquivos");
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const say = useCallback((text: string, error = false) => {
    setFlash({ text, error });
    window.setTimeout(() => setFlash(null), 5000);
  }, []);

  const tabs: { id: Tab; label: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "arquivos", label: "Enviar arquivos", short: "Arquivos", icon: Upload },
    { id: "youtube", label: "Do YouTube", short: "YouTube", icon: Youtube },
    { id: "catalogo", label: "Catálogo", short: "Catálogo", icon: Music2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-space-card/70 p-1">
        {tabs.map(({ id, label, short, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium transition",
              tab === id ? "bg-white/[0.09] text-white" : "text-white/55 hover:text-white"
            )}
          >
            <Icon className="hidden h-4 w-4 sm:block" />
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      <Flash flash={flash} />
      {tab === "arquivos" && <UploadFiles supabase={supabase} say={say} />}
      {tab === "youtube" && <AddYouTube supabase={supabase} say={say} />}
      {tab === "catalogo" && <Catalog supabase={supabase} say={say} />}
    </div>
  );
}

type Supa = ReturnType<typeof createClient>;
type Say = (text: string, error?: boolean) => void;

// ---------------------------------------------------------------- enviar arquivos
type QueueItem = { key: string; file: File; title: string; artist: string; state: "pending" | "sending" | "done" | "error"; error?: string };

function UploadFiles({ supabase, say }: { supabase: Supa; say: Say }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [rights, setRights] = useState(RIGHTS[0].id);
  const [note, setNote] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const items = Array.from(files).map((file) => ({ key: crypto.randomUUID(), file, ...fromFileName(file.name), state: "pending" as const }));
    setQueue((prev) => [...prev, ...items].slice(0, 100));
  }
  const patch = (key: string, p: Partial<QueueItem>) => setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, ...p } : q)));

  async function send() {
    const pending = queue.filter((q) => q.state !== "done");
    if (!pending.length) return say("Escolha os arquivos de áudio.", true);
    if (!genre) return say("Escolha a categoria das músicas.", true);
    if (pending.some((q) => !q.title.trim() || !q.artist.trim())) return say("Preencha título e artista de todas as músicas.", true);
    if (!confirm) return say("Confirme que o Órbita X tem direito de disponibilizar estas músicas.", true);
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBusy(false);
      return say("Sessão expirada. Entre de novo.", true);
    }

    // Capa (opcional): uma para todas as músicas desta leva.
    let coverUrl: string | null = null;
    if (cover) {
      try {
        const { blob, mime } = await compressImage(cover);
        const path = `${uid}/catalogo/capas/${crypto.randomUUID()}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
        const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: mime });
        if (error) throw error;
        coverUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      } catch {
        setBusy(false);
        return say("Não foi possível enviar a capa. Tente outra imagem.", true);
      }
    }

    const license = [rights, note.trim()].filter(Boolean).join(" · ");
    let ok = 0;
    for (const q of pending) {
      patch(q.key, { state: "sending", error: undefined });
      try {
        if (q.file.size > MAX_AUDIO) throw new Error("O arquivo passa de 50 MB.");
        let contentType: string;
        try {
          contentType = await verifyUpload(q.file, ["audio"]);
        } catch {
          throw new Error("Formato não suportado (use MP3, OGG, WAV ou FLAC).");
        }
        const path = `${uid}/catalogo/${crypto.randomUUID()}.${AUDIO_EXT[contentType] ?? "mp3"}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, q.file, { contentType });
        if (upErr) throw new Error("Falha no envio do arquivo.");
        const audioUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
        const duration = await readDuration(q.file);
        const { error } = await supabase.rpc("admin_save_track", {
          p_id: null,
          p_title: q.title.trim(),
          p_artist: q.artist.trim(),
          p_album: album.trim() || null,
          p_genre: genre,
          p_audio_url: audioUrl,
          p_cover_url: coverUrl,
          p_youtube_id: null,
          p_duration: duration,
          p_license: license,
        });
        if (error) {
          await supabase.storage.from("media").remove([path]);
          throw new Error(adminError(error.message));
        }
        patch(q.key, { state: "done" });
        ok++;
      } catch (e) {
        patch(q.key, { state: "error", error: (e as Error).message });
      }
    }
    setBusy(false);
    say(ok ? `${ok} ${ok === 1 ? "música enviada" : "músicas enviadas"} para o catálogo.` : "Nenhuma música foi enviada.", !ok);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className={clsx(card, "p-4")}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center transition hover:border-orbit-purple/50"
        >
          <Upload className="h-7 w-7 text-orbit-cyan" />
          <span className="text-sm font-medium text-white">Escolha ou arraste os arquivos de áudio</span>
          <span className="text-xs text-white/45">MP3, OGG, WAV ou FLAC · até 50 MB cada · até 100 por vez. Nome “Artista - Título” já preenche os campos.</span>
        </button>
        <input ref={fileRef} type="file" multiple hidden accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/flac,.mp3,.ogg,.wav,.flac" onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />

        {queue.length > 0 && (
          <div className="mt-4 space-y-2">
            {queue.map((q) => (
              <div key={q.key} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-space-bg/40 p-2.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2 sm:w-44">
                  {q.state === "done" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : q.state === "error" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                  ) : q.state === "sending" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orbit-cyan" />
                  ) : (
                    <Music2 className="h-4 w-4 shrink-0 text-white/40" />
                  )}
                  <span className="truncate text-xs text-white/55" title={q.file.name}>
                    {q.file.name}
                  </span>
                </div>
                <input value={q.title} onChange={(e) => patch(q.key, { title: e.target.value })} placeholder="Título" disabled={q.state === "done" || busy} className={clsx(input, "py-2")} />
                <input value={q.artist} onChange={(e) => patch(q.key, { artist: e.target.value })} placeholder="Artista" disabled={q.state === "done" || busy} className={clsx(input, "py-2")} />
                <button type="button" onClick={() => setQueue((prev) => prev.filter((x) => x.key !== q.key))} disabled={busy} aria-label="Tirar da lista" className={ghost}>
                  <X className="h-4 w-4" />
                </button>
                {q.error && <p className="text-xs text-red-300 sm:basis-full">{q.error}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={clsx(card, "space-y-3 p-4")}>
        <p className="text-sm font-semibold text-white">Dados da leva</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => coverRef.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-dashed border-white/15 hover:border-orbit-purple/50" aria-label="Escolher capa">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-white/45">
                <ImagePlus className="h-6 w-6" />
              </span>
            )}
          </button>
          <div className="text-xs text-white/45">
            Capa (opcional), usada em todas as músicas desta leva.
            {cover && (
              <button type="button" onClick={() => setCover(null)} className="mt-1 block font-semibold text-white/70 hover:text-white">
                Remover capa
              </button>
            )}
          </div>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => (setCover(e.target.files?.[0] ?? null), (e.target.value = ""))} />
        </div>
        <input value={album} onChange={(e) => setAlbum(e.target.value)} maxLength={120} placeholder="Álbum (opcional)" className={input} />
        <CategorySelect value={genre} onChange={setGenre} />
        <select value={rights} onChange={(e) => setRights(e.target.value)} className={input}>
          {RIGHTS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="Observação dos direitos (opcional)" className={input} />
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-white/60">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
          Confirmo que o Órbita X tem o direito de disponibilizar estas músicas (são próprias, autorizadas, licenciadas ou de uso livre).
        </label>
        <button type="button" onClick={send} disabled={busy || !queue.some((q) => q.state !== "done")} className={clsx(primary, "w-full")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Enviando…" : `Enviar ${queue.filter((q) => q.state !== "done").length || ""} ${queue.filter((q) => q.state !== "done").length === 1 ? "música" : "músicas"}`}
        </button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- do YouTube
function AddYouTube({ supabase, say }: { supabase: Supa; say: Say }) {
  const [link, setLink] = useState("");
  const [found, setFound] = useState<{ id: string; channel: string } | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!parseYouTubeId(link)) return say("Cole um link do YouTube.", true);
    setBusy(true);
    const res = await fetch(`/api/music/youtube?url=${encodeURIComponent(link.trim())}`).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { id?: string; title?: string; channel?: string; error?: string } | null;
    setBusy(false);
    if (!res?.ok || !body?.id) {
      return say(body?.error === "embed_blocked" ? "Este vídeo não permite tocar fora do YouTube." : "Vídeo não encontrado.", true);
    }
    const split = splitVideoTitle(body.title ?? "", body.channel ?? "");
    setFound({ id: body.id, channel: body.channel ?? "" });
    setTitle(split.title);
    setArtist(split.artist);
  }

  async function save() {
    if (!found) return;
    if (!genre) return say("Escolha a categoria.", true);
    setBusy(true);
    const { error } = await supabase.rpc("admin_save_track", {
      p_id: null,
      p_title: title,
      p_artist: artist,
      p_album: null,
      p_genre: genre,
      p_audio_url: null,
      p_cover_url: null,
      p_youtube_id: found.id,
      p_duration: null,
      p_license: `YouTube · ${found.channel}`,
    });
    setBusy(false);
    if (error) return say(adminError(error.message), true);
    say(`“${title}” entrou no catálogo.`);
    setFound(null);
    setLink("");
  }

  return (
    <section className={clsx(card, "max-w-xl space-y-3 p-4")}>
      <p className="text-xs leading-relaxed text-white/55">
        Cole o link do clipe ou do áudio oficial no YouTube. A música toca completa no Órbita X pelo player do YouTube e aparece também em Vídeos.
      </p>
      {!found ? (
        <form onSubmit={lookup} className="flex gap-2">
          <label className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/watch?v=…" className={clsx(input, "pl-9")} inputMode="url" />
          </label>
          <button type="submit" disabled={busy || !link.trim()} className={primary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Buscar
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={youtubeThumb(found.id)} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
            <p className="min-w-0 text-xs text-white/55">
              Canal <span className="text-white/80">{found.channel || "YouTube"}</span>
              <button type="button" onClick={() => setFound(null)} className="mt-0.5 block font-semibold text-orbit-cyan hover:underline">
                Trocar link
              </button>
            </p>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Título" className={input} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Artista" className={input} />
          <CategorySelect value={genre} onChange={setGenre} />
          <button type="button" onClick={save} disabled={busy} className={clsx(primary, "w-full")}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar ao catálogo
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- catálogo
type Row = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  coverUrl: string | null;
  audioUrl: string;
  youtubeId: string | null;
  duration: number | null;
  isHidden: boolean;
  sourceId: string | null;
  license: string | null;
};
const PAGE = 50;

function Catalog({ supabase, say }: { supabase: Supa; say: Say }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<"todas" | "enviadas" | "youtube" | "ocultas">("todas");
  const [genre, setGenre] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (p: number) => {
      let q = supabase
        .from("Track")
        .select("id, title, artist, album, genre, coverUrl, audioUrl, youtubeId, duration, isHidden, sourceId, license", { count: "exact" })
        .eq("isOfficial", true);
      if (filter === "enviadas") q = q.like("sourceId", "upload:%");
      if (filter === "youtube") q = q.not("youtubeId", "is", null);
      if (filter === "ocultas") q = q.eq("isHidden", true);
      else q = q.eq("isHidden", false);
      if (genre) q = q.eq("genre", genre);
      if (debounced) {
        const s = debounced.replace(/[%,()]/g, " ");
        q = q.or(`title.ilike.%${s}%,artist.ilike.%${s}%`);
      }
      const { data, count } = await q.order("updatedAt", { ascending: false }).range(p * PAGE, p * PAGE + PAGE - 1);
      setTotal(count ?? 0);
      setRows((prev) => (p === 0 ? ((data as Row[] | null) ?? []) : [...(prev ?? []), ...((data as Row[] | null) ?? [])]));
      setPage(p);
    },
    [supabase, filter, genre, debounced]
  );
  useEffect(() => {
    load(0);
  }, [load]);

  async function toggleHidden(r: Row) {
    setBusy(r.id);
    const { error } = await supabase.rpc("admin_set_track_hidden", { p_track: r.id, p_hidden: !r.isHidden });
    setBusy(null);
    if (error) return say(adminError(error.message), true);
    setRows((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    say(r.isHidden ? `“${r.title}” voltou para o catálogo.` : `“${r.title}” foi ocultada.`);
  }

  async function remove(r: Row) {
    if (!window.confirm(`Excluir “${r.title}” do catálogo? Ela também sai dos álbuns de quem a adicionou.`)) return;
    setBusy(r.id);
    const { error, count } = await supabase.from("Track").delete({ count: "exact" }).eq("id", r.id);
    if (error || !count) {
      setBusy(null);
      return say(error ? adminError(error.message) : "Ações de administrador exigem verificação em duas etapas.", true);
    }
    const path = storagePath(r.audioUrl);
    if (path) await supabase.storage.from("media").remove([path]);
    setBusy(null);
    setRows((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    setTotal((n) => n - 1);
    say(`“${r.title}” foi excluída.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-space-card/70 px-4 py-2.5 focus-within:border-orbit-purple/50">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por música ou artista" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
        </label>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-full border border-white/10 bg-space-card/70 px-3 py-2.5 text-sm text-white outline-none">
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => load(0)} aria-label="Atualizar" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "todas", label: "Todas" },
            { id: "enviadas", label: "Enviadas pela equipe" },
            { id: "youtube", label: "YouTube" },
            { id: "ocultas", label: "Ocultas" },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setFilter(o.id)}
            className={clsx("rounded-full px-3 py-2 text-xs font-semibold transition", filter === o.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:bg-white/5")}
          >
            {o.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <p className="px-1 text-xs text-white/45">
            {total.toLocaleString("pt-BR")} {total === 1 ? "música" : "músicas"}
          </p>
          <div className={clsx(card, "divide-y divide-white/5 overflow-hidden")}>
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/40">
                    <Music2 className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{r.title}</p>
                  <p className="truncate text-xs text-white/50">
                    {r.artist} · {genreLabel(r.genre)}
                    {r.duration ? ` · ${formatDuration(r.duration)}` : ""}
                  </p>
                </div>
                <span className={clsx("hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline", r.youtubeId ? "bg-red-500/15 text-red-300" : "bg-orbit-purple/15 text-orbit-purple")}>
                  {r.youtubeId ? "YouTube" : "Arquivo"}
                </span>
                <button type="button" onClick={() => setEditing(r)} aria-label="Editar" className={ghost}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => toggleHidden(r)} disabled={busy === r.id} aria-label={r.isHidden ? "Mostrar no catálogo" : "Ocultar do catálogo"} className={ghost}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : r.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => remove(r)} disabled={busy === r.id} aria-label="Excluir" className={clsx(ghost, "hover:text-red-300")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!rows.length && <p className="px-4 py-10 text-center text-sm text-white/40">Nenhuma música encontrada.</p>}
          </div>
          {rows.length < total && (
            <button type="button" onClick={() => load(page + 1)} className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-orbit-cyan hover:bg-white/[0.04]">
              Carregar mais ({(total - rows.length).toLocaleString("pt-BR")} restantes)
            </button>
          )}
        </>
      )}

      {editing && (
        <EditTrack
          row={editing}
          supabase={supabase}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setRows((prev) => (prev ?? []).map((x) => (x.id === r.id ? r : x)));
            setEditing(null);
            say("Música atualizada.");
          }}
          say={say}
        />
      )}
    </div>
  );
}

function EditTrack({ row, supabase, onClose, onSaved, say }: { row: Row; supabase: Supa; onClose: () => void; onSaved: (r: Row) => void; say: Say }) {
  const [title, setTitle] = useState(row.title);
  const [artist, setArtist] = useState(row.artist);
  const [album, setAlbum] = useState(row.album ?? "");
  const [genre, setGenre] = useState(row.genre ?? "");
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function save() {
    setBusy(true);
    let coverUrl: string | null = null;
    if (cover) {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const { blob, mime } = await compressImage(cover);
        const path = `${auth.user?.id}/catalogo/capas/${crypto.randomUUID()}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
        const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: mime });
        if (error) throw error;
        coverUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      } catch {
        setBusy(false);
        return say("Não foi possível enviar a capa.", true);
      }
    }
    const { error } = await supabase.rpc("admin_save_track", {
      p_id: row.id,
      p_title: title,
      p_artist: artist,
      p_album: album || null,
      p_genre: genre,
      p_audio_url: null,
      p_cover_url: coverUrl,
      p_youtube_id: null,
      p_duration: null,
      p_license: null,
    });
    setBusy(false);
    if (error) return say(adminError(error.message), true);
    onSaved({ ...row, title, artist, album: album || null, genre, coverUrl: coverUrl ?? row.coverUrl });
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6" onClick={onClose} role="presentation">
      <div role="dialog" aria-label="Editar música" onClick={(e) => e.stopPropagation()} className="w-full space-y-3 rounded-t-3xl border border-white/10 bg-space-surface p-5 md:max-w-md md:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-white">Editar música</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className={ghost}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => coverRef.current?.click()} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10" aria-label="Trocar capa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : row.coverUrl ? <img src={row.coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-white/40"><ImagePlus className="h-5 w-5" /></span>}
          </button>
          <p className="text-xs text-white/45">Toque na capa para trocar.</p>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => (setCover(e.target.files?.[0] ?? null), (e.target.value = ""))} />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Título" className={input} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Artista" className={input} />
        <input value={album} onChange={(e) => setAlbum(e.target.value)} maxLength={120} placeholder="Álbum (opcional)" className={input} />
        <CategorySelect value={genre} onChange={setGenre} />
        <button type="button" onClick={save} disabled={busy} className={clsx(primary, "w-full")}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
}
