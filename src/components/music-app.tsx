"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { Pause, Play, Upload } from "lucide-react";

export type TrackRow = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string | null;
  userId: string;
  owner: { name: string; username: string; avatarUrl: string | null };
};

export function MusicApp({ userId, initialTracks }: { userId: string; initialTracks: TrackRow[] }) {
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks] = useState(initialTracks);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function togglePlay(track: TrackRow) {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = track.audioUrl;
    audio.play();
    setPlayingId(track.id);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !artist.trim()) return;
    setUploading(true);

    try {
      const id = crypto.randomUUID();
      const ext = file.name.split(".").pop();
      const path = `${userId}/tracks/${id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { data: trackData, error: insertError } = await supabase
        .from("Track")
        .insert({ id, userId, title: title.trim(), artist: artist.trim(), audioUrl: pub.publicUrl })
        .select("id, title, artist, audioUrl, coverUrl, userId, owner:User(name, username, avatarUrl)")
        .single();
      if (insertError) throw insertError;

      setTracks((prev) => [(trackData as unknown) as TrackRow, ...prev]);
      setTitle("");
      setArtist("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  const nowPlaying = tracks.find((t) => t.id === playingId) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28">
      <h1 className="mb-1 font-display text-2xl font-bold text-white">Música</h1>
      <p className="mb-6 text-sm text-white/50">Mais que sons, conexões que te levam mais longe.</p>

      <form onSubmit={upload} className="mb-6 rounded-2xl border border-white/10 bg-space-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Upload className="h-4 w-4" /> Enviar faixa
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artista"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>
        <input
          ref={fileRef}
          required
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-3 w-full text-xs text-white/60"
        />
        <button
          type="submit"
          disabled={uploading}
          className="mt-3 rounded-full bg-orbit-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "Publicar faixa"}
        </button>
      </form>

      <div className="space-y-2">
        {tracks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
            Nenhuma faixa por aqui ainda.
          </div>
        )}
        {tracks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-card p-3">
            <button
              onClick={() => togglePlay(t)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient text-white"
            >
              {playingId === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{t.title}</p>
              <p className="truncate text-xs text-white/40">{t.artist}</p>
            </div>
            <Avatar name={t.owner.name} url={t.owner.avatarUrl} size={28} />
          </div>
        ))}
      </div>

      {nowPlaying && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-white/10 bg-space-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              onClick={() => togglePlay(nowPlaying)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient text-white"
            >
              <Pause className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{nowPlaying.title}</p>
              <p className="truncate text-[11px] text-white/40">{nowPlaying.artist}</p>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
    </div>
  );
}
