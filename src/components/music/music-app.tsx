"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Disc3,
  Globe2,
  Library,
  ListMusic,
  Lock,
  Music2,
  Pencil,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";
import { compressImage } from "@/lib/messenger/media";
import { Confirm } from "@/components/community/ui";
import {
  albumTracks,
  genreLabel,
  GENRES,
  normalize,
  TRACK_COLUMNS,
  type MusicAlbum,
  type MusicTrack,
} from "@/lib/music";
import { PlayerBar, usePlayer } from "./player";
import { TrackCover, TrackRow } from "./track-row";
import {
  AddToAlbumSheet,
  AlbumEditorSheet,
  AlbumThumb,
  TrackActionsSheet,
  TrackEditorSheet,
  type AlbumDraft,
  type TrackDraft,
} from "./dialogs";

type Tab = "catalogo" | "minhas" | "albuns";
type ActionContext = { track: MusicTrack; albumId?: string };

const MAX_AUDIO = 25 * 1024 * 1024;
const AUDIO_EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/flac": "flac" };

function storagePath(url: string | null | undefined) {
  const marker = "/storage/v1/object/public/media/";
  const at = url ? url.indexOf(marker) : -1;
  return at >= 0 ? decodeURIComponent(url!.slice(at + marker.length)) : null;
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
      URL.revokeObjectURL(url);
    };
    a.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    a.src = url;
  });
}

const totalTime = (list: MusicTrack[]) => {
  const s = list.reduce((acc, t) => acc + (t.duration ?? 0), 0);
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

export function MusicApp({
  me,
  initial,
}: {
  me: string;
  initial: { catalog: MusicTrack[]; mine: MusicTrack[]; albums: MusicAlbum[] };
}) {
  const supabase = useMemo(() => createClient(), []);
  const player = usePlayer();
  const [catalog] = useState(initial.catalog);
  const [mine, setMine] = useState(initial.mine);
  const [albums, setAlbums] = useState(initial.albums);
  const [tab, setTab] = useState<Tab>("catalogo");
  const [genre, setGenre] = useState<string>("all");
  const [catalogAlbum, setCatalogAlbum] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [actions, setActions] = useState<ActionContext | null>(null);
  const [addFor, setAddFor] = useState<MusicTrack | null>(null);
  const [albumEditor, setAlbumEditor] = useState<{ album: MusicAlbum | null; thenAdd?: MusicTrack } | null>(null);
  const [trackEditor, setTrackEditor] = useState<{ track: MusicTrack | null } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "track"; track: MusicTrack } | { kind: "album"; album: MusicAlbum } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const say = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const byId = useMemo(() => new Map([...catalog, ...mine].map((t) => [t.id, t])), [catalog, mine]);
  const openAlbum = albums.find((a) => a.id === openAlbumId) ?? null;

  // Catálogo: álbuns oficiais (para os cartões) e faixas filtradas.
  const catalogAlbums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; cover: string | null; genre: string | null; tracks: MusicTrack[] }>();
    for (const t of catalog) {
      if (!t.album) continue;
      const key = `${t.genre}|${t.album}`;
      const entry = map.get(key) ?? { name: t.album, artist: t.artist, cover: t.coverUrl, genre: t.genre, tracks: [] };
      if (entry.artist !== t.artist) entry.artist = "Vários artistas";
      entry.tracks.push(t);
      map.set(key, entry);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [catalog]);
  const genresWithMusic = useMemo(() => GENRES.filter((g) => catalog.some((t) => t.genre === g.id)), [catalog]);
  const visibleAlbums = genre === "all" ? catalogAlbums : catalogAlbums.filter((a) => a.genre === genre);
  const selectedCatalogAlbum = catalogAlbum ? catalogAlbums.find((a) => a.key === catalogAlbum) ?? null : null;
  const catalogTracks = selectedCatalogAlbum
    ? selectedCatalogAlbum.tracks
    : genre === "all"
      ? catalog
      : catalog.filter((t) => t.genre === genre);

  const searchResults = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return null;
    return [...mine, ...catalog].filter((t) => normalize(`${t.title} ${t.artist} ${t.album ?? ""} ${genreLabel(t.genre)}`).includes(q)).slice(0, 80);
  }, [query, catalog, mine]);

  const play = (list: MusicTrack[], i: number) => {
    if (player.current?.id === list[i]?.id) player.toggle();
    else player.playList(list, i);
  };
  const isActive = (t: MusicTrack) => player.current?.id === t.id;

  // ------------------------------------------------------------ álbuns
  async function toggleInAlbum(album: MusicAlbum, track: MusicTrack) {
    const has = album.trackIds.includes(track.id);
    if (has) {
      const { error } = await supabase.from("PlaylistTrack").delete().eq("playlistId", album.id).eq("trackId", track.id);
      if (error) return say("Não foi possível tirar a música do álbum.", true);
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, trackIds: a.trackIds.filter((id) => id !== track.id) } : a)));
      say(`Removida de “${album.title}”.`);
    } else {
      const { error } = await supabase.from("PlaylistTrack").insert({ playlistId: album.id, trackId: track.id });
      if (error) return say(error.message.includes("limite_faixas") ? "Este álbum já tem 500 músicas." : "Não foi possível adicionar ao álbum.", true);
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, trackIds: [...a.trackIds, track.id] } : a)));
      say(`Adicionada a “${album.title}”.`);
    }
  }

  async function uploadCover(albumId: string, file: File) {
    const { blob, mime } = await compressImage(file);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${me}/playlists/${albumId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: mime });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function saveAlbum(draft: AlbumDraft): Promise<string | null> {
    const editing = albumEditor?.album ?? null;
    try {
      if (!editing) {
        const { data, error } = await supabase
          .from("Playlist")
          .insert({ userId: me, title: draft.title, description: draft.description || null, isPublic: draft.isPublic })
          .select("id, title, description, coverUrl, isPublic, updatedAt")
          .single();
        if (error || !data) return error?.message.includes("limite_albuns") ? "Você chegou ao limite de 200 álbuns." : "Não foi possível criar o álbum.";
        let created: MusicAlbum = { ...data, trackIds: [] };
        if (draft.cover) {
          const coverUrl = await uploadCover(created.id, draft.cover);
          await supabase.from("Playlist").update({ coverUrl }).eq("id", created.id);
          created = { ...created, coverUrl };
        }
        const pending = albumEditor?.thenAdd;
        if (pending) {
          const { error: addError } = await supabase.from("PlaylistTrack").insert({ playlistId: created.id, trackId: pending.id });
          if (!addError) created = { ...created, trackIds: [pending.id] };
        }
        setAlbums((prev) => [created, ...prev]);
        setAlbumEditor(null);
        setAddFor(null);
        say(pending ? `Álbum criado com “${pending.title}”.` : "Álbum criado.");
        return null;
      }
      let coverUrl = editing.coverUrl;
      const oldPath = storagePath(editing.coverUrl);
      if (draft.cover) coverUrl = await uploadCover(editing.id, draft.cover);
      else if (draft.removeCover) coverUrl = null;
      const { error } = await supabase
        .from("Playlist")
        .update({ title: draft.title, description: draft.description || null, isPublic: draft.isPublic, coverUrl, updatedAt: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) return "Não foi possível salvar o álbum.";
      if (oldPath && coverUrl !== editing.coverUrl) await supabase.storage.from("media").remove([oldPath]);
      setAlbums((prev) => prev.map((a) => (a.id === editing.id ? { ...a, title: draft.title, description: draft.description || null, isPublic: draft.isPublic, coverUrl } : a)));
      setAlbumEditor(null);
      say("Álbum salvo.");
      return null;
    } catch {
      return "Não foi possível enviar a capa. Tente outra imagem.";
    }
  }

  async function deleteAlbum(album: MusicAlbum) {
    setBusy(true);
    const { error } = await supabase.from("Playlist").delete().eq("id", album.id);
    setBusy(false);
    setConfirm(null);
    if (error) return say("Não foi possível excluir o álbum.", true);
    const path = storagePath(album.coverUrl);
    if (path) await supabase.storage.from("media").remove([path]);
    setAlbums((prev) => prev.filter((a) => a.id !== album.id));
    setOpenAlbumId(null);
    say("Álbum excluído.");
  }

  async function move(album: MusicAlbum, index: number, delta: number) {
    const ids = [...album.trackIds];
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    setAlbums((prev) => prev.map((a) => (a.id === album.id ? { ...a, trackIds: ids } : a)));
    const { error } = await supabase.rpc("reorder_playlist", { p_playlist: album.id, p_tracks: ids });
    if (error) say("Não foi possível salvar a nova ordem.", true);
  }

  // ------------------------------------------------------------ minhas músicas
  async function saveTrack(draft: TrackDraft): Promise<string | null> {
    const editing = trackEditor?.track ?? null;
    let audioUrl = editing?.audioUrl ?? "";
    let duration = editing?.duration ?? null;
    if (draft.file) {
      if (draft.file.size > MAX_AUDIO) return "O arquivo passa de 25 MB.";
      let contentType: string;
      try {
        contentType = await verifyUpload(draft.file, ["audio"]);
      } catch {
        return "Formato não suportado. Envie MP3, OGG, WAV ou FLAC.";
      }
      const path = `${me}/tracks/${crypto.randomUUID()}.${AUDIO_EXT[contentType] ?? "mp3"}`;
      const { error } = await supabase.storage.from("media").upload(path, draft.file, { contentType });
      if (error) return "Não foi possível enviar o arquivo agora.";
      audioUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      duration = await readDuration(draft.file);
    }
    if (!editing) {
      const { data, error } = await supabase
        .from("Track")
        .insert({ id: crypto.randomUUID(), userId: me, title: draft.title, artist: draft.artist, audioUrl, duration })
        .select(TRACK_COLUMNS)
        .single();
      if (error || !data) {
        const path = storagePath(audioUrl);
        if (path) await supabase.storage.from("media").remove([path]);
        return error?.message.includes("rate") ? "Muitos envios em pouco tempo. Tente de novo mais tarde." : "Não foi possível salvar a música.";
      }
      setMine((prev) => [data as MusicTrack, ...prev]);
      setTrackEditor(null);
      say("Música enviada.");
      return null;
    }
    const { error } = await supabase
      .from("Track")
      .update({ title: draft.title, artist: draft.artist, audioUrl, duration, updatedAt: new Date().toISOString() } as never)
      .eq("id", editing.id);
    if (error) return "Não foi possível salvar as alterações.";
    if (draft.file) {
      const old = storagePath(editing.audioUrl);
      if (old) await supabase.storage.from("media").remove([old]);
    }
    setMine((prev) => prev.map((t) => (t.id === editing.id ? { ...t, title: draft.title, artist: draft.artist, audioUrl, duration } : t)));
    setTrackEditor(null);
    say("Música atualizada.");
    return null;
  }

  async function deleteTrack(track: MusicTrack) {
    setBusy(true);
    const { error } = await supabase.from("Track").delete().eq("id", track.id);
    setBusy(false);
    setConfirm(null);
    if (error) return say("Não foi possível excluir a música.", true);
    const path = storagePath(track.audioUrl);
    if (path) await supabase.storage.from("media").remove([path]);
    setMine((prev) => prev.filter((t) => t.id !== track.id));
    setAlbums((prev) => prev.map((a) => ({ ...a, trackIds: a.trackIds.filter((id) => id !== track.id) })));
    say("Música excluída.");
  }

  // ------------------------------------------------------------ telas
  const list = (tracks: MusicTrack[], opts?: { albumId?: string; subtitle?: (t: MusicTrack) => React.ReactNode }) =>
    tracks.length ? (
      <div className="space-y-0.5">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            active={isActive(t)}
            playing={player.playing}
            onPlay={() => play(tracks, i)}
            onMore={() => setActions({ track: t, albumId: opts?.albumId })}
            subtitle={opts?.subtitle?.(t)}
          />
        ))}
      </div>
    ) : null;

  const tabs: { id: Tab; label: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "catalogo", label: "Catálogo", short: "Catálogo", icon: Library },
    { id: "minhas", label: "Minhas músicas", short: "Minhas", icon: Music2 },
    { id: "albuns", label: "Meus álbuns", short: "Álbuns", icon: ListMusic },
  ];

  return (
    <div className={clsx("mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6", player.current ? "pb-40 md:pb-28" : "pb-10")}>
      <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Música</h1>
          <p className="mt-0.5 text-sm text-white/55">Ouça o catálogo do Órbita X, envie as suas e monte seus álbuns.</p>
        </div>
        <label className="relative block md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar música, artista ou álbum"
            className="w-full rounded-full border border-white/10 bg-space-surface/80 py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/40 focus:border-orbit-purple"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {searchResults ? (
        <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-2 md:p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-white/45">
            {searchResults.length ? `${searchResults.length} ${searchResults.length === 1 ? "resultado" : "resultados"}` : "Nada encontrado"}
          </p>
          {list(searchResults, { subtitle: (t) => `${t.artist}${t.isOfficial ? ` · ${genreLabel(t.genre)}` : " · Minha música"}` })}
          {!searchResults.length && <p className="px-2 pb-4 text-sm text-white/45">Tente outro nome de música, artista ou gênero.</p>}
        </section>
      ) : (
        <>
          <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-space-surface/80 p-1">
            {tabs.map(({ id, label, short, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => (setTab(id), setOpenAlbumId(null), setOrganizing(false))}
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

          {tab === "catalogo" && (
            <>
              <div className="orbit-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0">
                {[{ id: "all", label: "Todos" }, ...genresWithMusic].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => (setGenre(g.id), setCatalogAlbum(null), setShowAll(false))}
                    className={clsx(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
                      genre === g.id ? "border-transparent bg-orbit-gradient text-snow" : "border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {selectedCatalogAlbum ? (
                <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-3 md:p-4">
                  <button type="button" onClick={() => setCatalogAlbum(null)} className="mb-3 flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
                    <ArrowLeft className="h-4 w-4" /> {genre === "all" ? "Catálogo" : genreLabel(genre)}
                  </button>
                  <div className="mb-4 flex items-center gap-4">
                    <TrackCover track={{ coverUrl: selectedCatalogAlbum.cover, title: selectedCatalogAlbum.name }} size={112} className="rounded-xl" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Álbum · {genreLabel(selectedCatalogAlbum.genre)}</p>
                      <h2 className="mt-0.5 line-clamp-2 font-display text-xl font-bold text-white">{selectedCatalogAlbum.name}</h2>
                      <p className="truncate text-sm text-white/60">{selectedCatalogAlbum.artist}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {selectedCatalogAlbum.tracks.length} músicas · {totalTime(selectedCatalogAlbum.tracks)}
                        {selectedCatalogAlbum.tracks[0]?.license ? ` · ${selectedCatalogAlbum.tracks[0].license}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => player.playList(selectedCatalogAlbum.tracks, 0)}
                        className="mt-2.5 flex items-center gap-2 rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-snow shadow-glow"
                      >
                        <Play className="h-4 w-4" /> Ouvir
                      </button>
                    </div>
                  </div>
                  {list(selectedCatalogAlbum.tracks)}
                </section>
              ) : (
                <>
                  <section className="mb-4">
                    <h2 className="mb-2 px-1 text-sm font-semibold text-white">Álbuns{genre !== "all" ? ` de ${genreLabel(genre)}` : ""}</h2>
                    <div className="orbit-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-2 md:mx-0 md:px-0">
                      {visibleAlbums.map((a) => (
                        <button key={a.key} type="button" onClick={() => setCatalogAlbum(a.key)} className="group w-[132px] shrink-0 text-left">
                          <span className="relative block">
                            <TrackCover track={{ coverUrl: a.cover, title: a.name }} size={132} className="rounded-xl" />
                            <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient text-snow opacity-0 shadow-glow transition group-hover:opacity-100">
                              <Play className="ml-0.5 h-4 w-4" />
                            </span>
                          </span>
                          <span className="mt-1.5 block truncate text-[13px] font-medium text-white">{a.name}</span>
                          <span className="block truncate text-xs text-white/45">{a.artist}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-2 md:p-3">
                    <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                      <h2 className="text-sm font-semibold text-white">{genre === "all" ? "Todas as músicas" : `Músicas de ${genreLabel(genre)}`}</h2>
                      <button
                        type="button"
                        onClick={() => {
                          const shuffled = [...catalogTracks].sort(() => Math.random() - 0.5);
                          player.playList(shuffled, 0);
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/75 hover:bg-white/5 hover:text-white"
                      >
                        <Shuffle className="h-3.5 w-3.5" /> Aleatório
                      </button>
                    </div>
                    {list(showAll ? catalogTracks : catalogTracks.slice(0, 40), {
                      subtitle: (t) => `${t.artist}${genre === "all" ? ` · ${genreLabel(t.genre)}` : t.album ? ` · ${t.album}` : ""}`,
                    })}
                    {!showAll && catalogTracks.length > 40 && (
                      <button type="button" onClick={() => setShowAll(true)} className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-orbit-cyan hover:bg-white/[0.04]">
                        Mostrar todas as {catalogTracks.length} músicas
                      </button>
                    )}
                  </section>
                </>
              )}
            </>
          )}

          {tab === "minhas" && (
            <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-2 md:p-3">
              <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                <h2 className="text-sm font-semibold text-white">
                  {mine.length ? `${mine.length} ${mine.length === 1 ? "música enviada" : "músicas enviadas"}` : "Minhas músicas"}
                </h2>
                <button
                  type="button"
                  onClick={() => setTrackEditor({ track: null })}
                  className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-3.5 py-2 text-xs font-semibold text-snow shadow-glow"
                >
                  <Upload className="h-3.5 w-3.5" /> Enviar música
                </button>
              </div>
              {list(mine)}
              {!mine.length && (
                <div className="px-4 py-10 text-center">
                  <Music2 className="mx-auto mb-2 h-8 w-8 text-white/25" />
                  <p className="text-sm text-white/70">Você ainda não enviou nenhuma música.</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">Envie músicas suas ou que você tem permissão para compartilhar. Você pode editar, trocar o arquivo ou excluir quando quiser.</p>
                </div>
              )}
            </section>
          )}

          {tab === "albuns" && !openAlbum && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setAlbumEditor({ album: null })}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-white/70 transition hover:border-orbit-purple/50 hover:text-white"
              >
                <Plus className="h-7 w-7 text-orbit-cyan" />
                <span className="text-sm font-medium">Novo álbum</span>
              </button>
              {albums.map((a) => {
                const tracks = albumTracks(a, byId);
                return (
                  <button key={a.id} type="button" onClick={() => setOpenAlbumId(a.id)} className="group text-left">
                    <span className="relative block aspect-square overflow-hidden rounded-2xl">
                      <AlbumThumb album={a} fallback={tracks[0]?.coverUrl} fill />
                      {!a.isPublic && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white/85">
                          <Lock className="h-3 w-3" /> Privado
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block truncate text-sm font-medium text-white">{a.title}</span>
                    <span className="block text-xs text-white/45">{tracks.length} {tracks.length === 1 ? "música" : "músicas"}</span>
                  </button>
                );
              })}
            </section>
          )}

          {tab === "albuns" && openAlbum && (
            <AlbumDetail
              album={openAlbum}
              tracks={albumTracks(openAlbum, byId)}
              organizing={organizing}
              activeId={player.current?.id ?? null}
              playing={player.playing}
              onBack={() => (setOpenAlbumId(null), setOrganizing(false))}
              onPlay={(tracks, i) => play(tracks, i)}
              onOrganize={() => setOrganizing((v) => !v)}
              onEdit={() => setAlbumEditor({ album: openAlbum })}
              onDelete={() => setConfirm({ kind: "album", album: openAlbum })}
              onMore={(t) => setActions({ track: t, albumId: openAlbum.id })}
              onMove={(i, d) => move(openAlbum, i, d)}
              onRemove={(t) => toggleInAlbum(openAlbum, t)}
              onBrowse={() => (setTab("catalogo"), setOpenAlbumId(null))}
            />
          )}
        </>
      )}

      <p className="mt-6 text-center text-[11px] text-white/35">
        As músicas do catálogo são de artistas independentes, com licenças Creative Commons ou em domínio público.{" "}
        <Link href="/musica/creditos" className="text-white/55 underline-offset-2 hover:text-white hover:underline">
          Créditos e licenças
        </Link>
      </p>

      <TrackActionsSheet
        track={actions?.track ?? null}
        onClose={() => setActions(null)}
        onAddToAlbum={(t) => (setActions(null), setAddFor(t))}
        onRemoveFromAlbum={
          actions?.albumId
            ? (t) => {
                const album = albums.find((a) => a.id === actions.albumId);
                setActions(null);
                if (album) toggleInAlbum(album, t);
              }
            : undefined
        }
        onEdit={actions && !actions.track.isOfficial && actions.track.userId === me ? (t) => (setActions(null), setTrackEditor({ track: t })) : undefined}
        onDelete={actions && !actions.track.isOfficial && actions.track.userId === me ? (t) => (setActions(null), setConfirm({ kind: "track", track: t })) : undefined}
      />
      <AddToAlbumSheet
        track={addFor}
        albums={albums}
        onClose={() => setAddFor(null)}
        onToggle={toggleInAlbum}
        onCreate={() => setAlbumEditor({ album: null, thenAdd: addFor ?? undefined })}
      />
      <AlbumEditorSheet open={!!albumEditor} album={albumEditor?.album ?? null} onClose={() => setAlbumEditor(null)} onSave={saveAlbum} />
      <TrackEditorSheet open={!!trackEditor} track={trackEditor?.track ?? null} onClose={() => setTrackEditor(null)} onSave={saveTrack} />
      <Confirm
        open={!!confirm}
        title={confirm?.kind === "album" ? "Excluir álbum?" : "Excluir música?"}
        message={
          confirm?.kind === "album"
            ? `O álbum “${confirm.album.title}” será apagado. As músicas continuam no catálogo e em Minhas músicas.`
            : confirm?.kind === "track"
              ? `“${confirm.track.title}” será apagada de Minhas músicas e de todos os álbuns.`
              : ""
        }
        confirmLabel="Excluir"
        busy={busy}
        onConfirm={() => (confirm?.kind === "album" ? deleteAlbum(confirm.album) : confirm?.kind === "track" ? deleteTrack(confirm.track) : undefined)}
        onClose={() => setConfirm(null)}
      />

      {toast && (
        <div
          role="status"
          className={clsx(
            "fixed left-1/2 z-[100] -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-2xl",
            player.current ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-24" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-8",
            toast.error ? "bg-red-500/95 text-white" : "bg-white text-space-bg"
          )}
        >
          {toast.text}
        </div>
      )}

      <PlayerBar player={player} />
    </div>
  );
}

function AlbumDetail({
  album,
  tracks,
  organizing,
  activeId,
  playing,
  onBack,
  onPlay,
  onOrganize,
  onEdit,
  onDelete,
  onMore,
  onMove,
  onRemove,
  onBrowse,
}: {
  album: MusicAlbum;
  tracks: MusicTrack[];
  organizing: boolean;
  activeId: string | null;
  playing: boolean;
  onBack: () => void;
  onPlay: (tracks: MusicTrack[], i: number) => void;
  onOrganize: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMore: (t: MusicTrack) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (t: MusicTrack) => void;
  onBrowse: () => void;
}) {
  const chip = "flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/5 hover:text-white";
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-3 md:p-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Meus álbuns
      </button>
      <div className="mb-4 flex items-center gap-4">
        <AlbumThumb album={album} fallback={tracks[0]?.coverUrl} size={120} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {album.isPublic ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />} {album.isPublic ? "Álbum público" : "Álbum privado"}
          </p>
          <h2 className="mt-0.5 line-clamp-2 font-display text-xl font-bold text-white">{album.title}</h2>
          {album.description && <p className="mt-0.5 line-clamp-2 text-sm text-white/60">{album.description}</p>}
          <p className="mt-0.5 text-xs text-white/40">
            {tracks.length} {tracks.length === 1 ? "música" : "músicas"}
            {tracks.length ? ` · ${totalTime(tracks)}` : ""}
          </p>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!tracks.length}
          onClick={() => onPlay(tracks, 0)}
          className="flex items-center gap-2 rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-snow shadow-glow disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" /> Ouvir
        </button>
        {tracks.length > 1 && (
          <button type="button" onClick={onOrganize} className={clsx(chip, organizing && "border-orbit-cyan/50 text-orbit-cyan")}>
            <ArrowUp className="h-3.5 w-3.5" /> {organizing ? "Concluir" : "Organizar"}
          </button>
        )}
        <button type="button" onClick={onEdit} className={chip}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
        <button type="button" onClick={onDelete} className={clsx(chip, "text-red-400 hover:text-red-300")}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
      {tracks.length ? (
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              active={activeId === t.id}
              playing={playing}
              onPlay={() => onPlay(tracks, i)}
              onMore={organizing ? undefined : () => onMore(t)}
              subtitle={`${t.artist}${t.album ? ` · ${t.album}` : ""}`}
              trailing={
                organizing ? (
                  <span className="flex shrink-0 items-center">
                    <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Subir" className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-25">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={i === tracks.length - 1} onClick={() => onMove(i, 1)} aria-label="Descer" className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-25">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onRemove(t)} aria-label="Tirar do álbum" className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 hover:bg-white/5 hover:text-red-300">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center">
          <Disc3 className="mx-auto mb-2 h-8 w-8 text-white/25" />
          <p className="text-sm text-white/70">Este álbum ainda está vazio.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">No catálogo ou em Minhas músicas, toque em ⋯ numa música e escolha “Adicionar a um álbum”.</p>
          <button type="button" onClick={onBrowse} className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/5">
            Ir para o catálogo
          </button>
        </div>
      )}
    </section>
  );
}
