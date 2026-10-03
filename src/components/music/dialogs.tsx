"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, Clapperboard, Disc3, ExternalLink, ImagePlus, Link2, ListPlus, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Sheet } from "@/components/community/ui";
import { formatDuration, parseYouTubeId, youtubeThumb, type MusicAlbum, type MusicTrack } from "@/lib/music";
import { TrackCover } from "./track-row";

const input =
  "w-full rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple";
const primary =
  "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50";
const row = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/5";

/** Ações de uma música: adicionar a um álbum, editar/excluir (só as próprias), crédito da fonte. */
export function TrackActionsSheet({
  track,
  onClose,
  onAddToAlbum,
  onEdit,
  onDelete,
  onRemoveFromAlbum,
}: {
  track: MusicTrack | null;
  onClose: () => void;
  onAddToAlbum: (t: MusicTrack) => void;
  onEdit?: (t: MusicTrack) => void;
  onDelete?: (t: MusicTrack) => void;
  onRemoveFromAlbum?: (t: MusicTrack) => void;
}) {
  if (!track) return null;
  return (
    <Sheet open onClose={onClose}>
      <div className="flex items-center gap-3 pb-3 pt-4">
        <TrackCover track={track} size={52} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white">{track.title}</p>
          <p className="truncate text-xs text-white/50">
            {track.artist}
            {track.album ? ` · ${track.album}` : ""}
            {track.duration ? ` · ${formatDuration(track.duration)}` : ""}
          </p>
        </div>
      </div>
      <div className="space-y-0.5 border-t border-white/10 pt-2">
        <button type="button" className={row} onClick={() => onAddToAlbum(track)}>
          <ListPlus className="h-[18px] w-[18px] text-orbit-cyan" /> Adicionar a um álbum
        </button>
        {track.youtubeId && (
          <Link href={`/videos?v=${track.youtubeId}`} className={row}>
            <Clapperboard className="h-[18px] w-[18px] text-white/60" /> Ver clipe em Vídeos
          </Link>
        )}
        {onRemoveFromAlbum && (
          <button type="button" className={row} onClick={() => onRemoveFromAlbum(track)}>
            <Trash2 className="h-[18px] w-[18px] text-white/60" /> Tirar deste álbum
          </button>
        )}
        {onEdit && (
          <button type="button" className={row} onClick={() => onEdit(track)}>
            <Pencil className="h-[18px] w-[18px] text-white/60" /> {track.youtubeId ? "Editar nome e artista" : "Editar ou trocar o arquivo"}
          </button>
        )}
        {onDelete && (
          <button type="button" className={clsx(row, "text-red-400")} onClick={() => onDelete(track)}>
            <Trash2 className="h-[18px] w-[18px]" /> Excluir minha música
          </button>
        )}
      </div>
      {track.youtubeId && (
        <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-white/50">
          Toca completa pelo player oficial do YouTube
          {track.isOfficial && track.license ? <> · <span className="text-white/75">{track.license.replace(/^YouTube · /, "canal ")}</span></> : null}.{" "}
          <a href={`https://www.youtube.com/watch?v=${track.youtubeId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-orbit-cyan hover:underline">
            Abrir no YouTube <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
      {track.isOfficial && !track.youtubeId && track.license && (
        <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-white/50">
          Música do catálogo Órbita X, por <span className="text-white/75">{track.artist}</span>, sob licença{" "}
          {track.licenseUrl ? (
            <a href={track.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-orbit-cyan hover:underline">
              {track.license}
            </a>
          ) : (
            track.license
          )}
          .
          {track.sourceUrl && (
            <>
              {" "}
              <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-orbit-cyan hover:underline">
                Fonte <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      )}
    </Sheet>
  );
}

export function AddToAlbumSheet({
  track,
  albums,
  onClose,
  onToggle,
  onCreate,
}: {
  track: MusicTrack | null;
  albums: MusicAlbum[];
  onClose: () => void;
  onToggle: (album: MusicAlbum, track: MusicTrack) => Promise<void>;
  onCreate: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!track) return null;
  return (
    <Sheet open onClose={onClose} title="Adicionar a um álbum">
      <p className="mb-2 truncate text-xs text-white/45">{track.title} · {track.artist}</p>
      <button type="button" className={clsx(row, "font-semibold text-orbit-cyan")} onClick={onCreate}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-orbit-cyan/50">
          <Plus className="h-5 w-5" />
        </span>
        Novo álbum
      </button>
      {albums.map((a) => {
        const has = a.trackIds.includes(track.id);
        return (
          <button
            key={a.id}
            type="button"
            disabled={!!busy}
            className={row}
            onClick={async () => {
              setBusy(a.id);
              await onToggle(a, track);
              setBusy(null);
            }}
          >
            <AlbumThumb album={a} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-white">{a.title}</span>
              <span className="block text-xs text-white/45">{a.trackIds.length} {a.trackIds.length === 1 ? "música" : "músicas"}</span>
            </span>
            {busy === a.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            ) : has ? (
              <Check className="h-5 w-5 text-emerald-400" />
            ) : (
              <Plus className="h-5 w-5 text-white/40" />
            )}
          </button>
        );
      })}
      {albums.length === 0 && <p className="px-3 py-4 text-center text-xs text-white/40">Você ainda não tem álbuns. Crie o primeiro acima.</p>}
    </Sheet>
  );
}

/** Capa do álbum (ou da primeira música). `fill` ocupa o quadrado do pai, como nos cartões. */
export function AlbumThumb({
  album,
  size = 48,
  fallback,
  fill = false,
}: {
  album: Pick<MusicAlbum, "coverUrl" | "title">;
  size?: number;
  fallback?: string | null;
  fill?: boolean;
}) {
  const src = album.coverUrl ?? fallback ?? null;
  const box = fill ? { className: "h-full w-full", style: undefined } : { className: "", style: { width: size, height: size } };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={clsx("shrink-0 rounded-lg bg-white/[0.06] object-cover", box.className)} style={box.style} />
  ) : (
    <span
      className={clsx("flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orbit-purple/50 via-orbit-blue/30 to-orbit-cyan/30 text-white/85", box.className)}
      style={box.style}
    >
      <Disc3 className={fill ? "h-1/3 w-1/3" : undefined} style={fill ? undefined : { width: size * 0.45, height: size * 0.45 }} />
    </span>
  );
}

export type AlbumDraft = { title: string; description: string; isPublic: boolean; cover: File | null; removeCover: boolean };

export function AlbumEditorSheet({
  open,
  album,
  onClose,
  onSave,
}: {
  open: boolean;
  album: MusicAlbum | null;
  onClose: () => void;
  onSave: (draft: AlbumDraft) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const localUrl = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);
  const preview = localUrl ?? (removeCover ? null : album?.coverUrl ?? null);

  useEffect(() => {
    if (!open) return;
    setTitle(album?.title ?? "");
    setDescription(album?.description ?? "");
    setIsPublic(album?.isPublic ?? true);
    setCover(null);
    setRemoveCover(false);
    setError(null);
  }, [open, album]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Dê um nome ao álbum.");
    setBusy(true);
    const err = await onSave({ title: title.trim(), description: description.trim(), isPublic, cover, removeCover });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Sheet open={open} onClose={onClose} title={album ? "Editar álbum" : "Novo álbum"}>
      <form onSubmit={submit} className="space-y-3 pt-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative shrink-0 overflow-hidden rounded-xl"
            aria-label="Escolher capa"
          >
            <AlbumThumb album={{ coverUrl: preview, title }} size={96} />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
              <ImagePlus className="h-6 w-6" />
            </span>
          </button>
          <div className="space-y-1.5 text-xs">
            <button type="button" onClick={() => fileRef.current?.click()} className="block font-semibold text-orbit-cyan hover:underline">
              {preview ? "Trocar capa" : "Escolher capa"}
            </button>
            {preview && (
              <button type="button" onClick={() => (setCover(null), setRemoveCover(true))} className="block text-white/50 hover:text-white">
                Remover capa
              </button>
            )}
            <p className="text-white/40">Sem capa, usamos a da primeira música.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) (setCover(f), setRemoveCover(false));
              e.target.value = "";
            }}
          />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Nome do álbum" className={input} autoFocus={!album} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="Descrição (opcional)" className={clsx(input, "resize-none")} />
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5">
          <span>
            <span className="block text-sm text-white">Álbum público</span>
            <span className="block text-xs text-white/45">{isPublic ? "Quem visitar seu perfil pode ouvir." : "Só você vê este álbum."}</span>
          </span>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-5 w-5 accent-[#8b5cf6]" />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {album ? "Salvar álbum" : "Criar álbum"}
        </button>
      </form>
    </Sheet>
  );
}

export type TrackDraft = { title: string; artist: string; file: File | null };

export function TrackEditorSheet({
  open,
  track,
  onClose,
  onSave,
}: {
  open: boolean;
  track: MusicTrack | null;
  onClose: () => void;
  onSave: (draft: TrackDraft) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(track?.title ?? "");
    setArtist(track?.artist ?? "");
    setFile(null);
    setRights(!!track);
    setError(null);
  }, [open, track]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return setError("Preencha o nome da música e do artista.");
    if (!track && !file) return setError("Escolha o arquivo de áudio.");
    if (!rights) return setError("Confirme que você tem o direito de compartilhar esta música.");
    setBusy(true);
    const err = await onSave({ title: title.trim(), artist: artist.trim(), file });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Sheet open={open} onClose={onClose} title={track ? "Editar minha música" : "Enviar música"}>
      <form onSubmit={submit} className="space-y-3 pt-1">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Nome da música" className={input} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Artista" className={input} />
        {!track?.youtubeId && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-3 text-left transition hover:border-orbit-purple/50"
        >
          <Upload className="h-5 w-5 shrink-0 text-orbit-cyan" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white/85">{file ? file.name : track ? "Trocar o arquivo (opcional)" : "Escolher arquivo de áudio"}</span>
            <span className="block text-xs text-white/40">MP3, OGG, WAV ou FLAC · até 25 MB</span>
          </span>
        </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/flac,.mp3,.ogg,.wav,.flac"
          hidden
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {!track && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-white/60">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
            Confirmo que a música é minha ou que tenho permissão para compartilhá-la. Músicas enviadas sem direito podem ser removidas.
          </label>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {track ? "Salvar" : "Enviar música"}
        </button>
      </form>
    </Sheet>
  );
}

/** "Nirvana - Smells Like Teen Spirit (Official Music Video)" → artista e título limpos. */
export function splitVideoTitle(raw: string, channel: string) {
  const clean = raw
    .replace(/\s*[([](?:[^)\]]*(?:official|oficial|video|vídeo|clipe|lyric|letra|audio|áudio|hd|4k|remaster)[^)\]]*)[)\]]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = clean.split(/\s[-–—|]\s/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  return { artist: channel.replace(/(VEVO| - Topic|Official)$/i, "").trim(), title: clean };
}

export type YouTubeDraft = { id: string; title: string; artist: string };

export function YouTubeAddSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: YouTubeDraft) => Promise<string | null>;
}) {
  const [link, setLink] = useState("");
  const [found, setFound] = useState<{ id: string; channel: string } | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLink("");
    setFound(null);
    setTitle("");
    setArtist("");
    setError(null);
  }, [open]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!parseYouTubeId(link)) return setError("Cole um link do YouTube (youtube.com ou youtu.be).");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/music/youtube?url=${encodeURIComponent(link.trim())}`).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { id?: string; title?: string; channel?: string; error?: string } | null;
    setBusy(false);
    if (!res?.ok || !body?.id) {
      return setError(
        body?.error === "embed_blocked"
          ? "O dono deste vídeo não permite tocar fora do YouTube. Tente o vídeo oficial do artista."
          : body?.error === "not_found"
            ? "Vídeo não encontrado. Confira o link."
            : "Não foi possível verificar o link agora."
      );
    }
    const split = splitVideoTitle(body.title ?? "", body.channel ?? "");
    setFound({ id: body.id, channel: body.channel ?? "" });
    setTitle(split.title);
    setArtist(split.artist);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!found) return;
    if (!title.trim() || !artist.trim()) return setError("Preencha o nome da música e do artista.");
    setBusy(true);
    const err = await onSave({ id: found.id, title: title.trim(), artist: artist.trim() });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Adicionar do YouTube">
      {!found ? (
        <form onSubmit={lookup} className="space-y-3 pt-1">
          <p className="text-xs leading-relaxed text-white/55">
            Cole o link de qualquer música no YouTube. Ela toca completa aqui no Órbita X, pelo player oficial do YouTube. Prefira o vídeo
            oficial do artista.
          </p>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/watch?v=…" className={clsx(input, "pl-9")} autoFocus inputMode="url" />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy || !link.trim()} className={primary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Buscar vídeo
          </button>
        </form>
      ) : (
        <form onSubmit={save} className="space-y-3 pt-1">
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Nome da música" className={input} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Artista" className={input} />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className={primary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar às minhas músicas
          </button>
        </form>
      )}
    </Sheet>
  );
}
