"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Loader2, Music2, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ProfileMusicData = { title: string; artist?: string | null; url: string; coverUrl?: string | null };

const BARS = [8, 14, 20, 12, 24, 16, 28, 18, 10, 22, 14, 26, 12, 20, 9, 16, 24, 12, 18, 10];

export function ProfileMusic({ music, isMe, userId }: { music: ProfileMusicData | null; isMe: boolean; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [music?.url]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  if (!music) {
    if (!isMe) return <p className="text-sm text-white/60">Nenhuma música no perfil.</p>;
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 bg-space-bg/40 p-3 text-left transition hover:border-orbit-purple/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10">
            <Music2 className="h-5 w-5 text-white/60" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white/80">Adicionar música ao perfil</span>
            <span className="block text-xs text-white/45">Uma faixa que toca no seu perfil</span>
          </span>
          <Plus className="h-4 w-4 text-orbit-cyan" />
        </button>
        {editing && <MusicEditor userId={userId} current={null} onClose={() => setEditing(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orbit-gradient">
          {music.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={music.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music2 className="h-5 w-5 text-snow" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{music.title}</p>
          {music.artist && <p className="truncate text-xs text-white/50">{music.artist}</p>}
          <div className="mt-1.5 flex h-5 items-end gap-[2px] overflow-hidden">
            {BARS.map((h, i) => {
              const active = (i / BARS.length) * 100 <= progress;
              return <span key={i} className={clsx("w-[3px] rounded-full transition-colors", active ? "bg-orbit-cyan" : "bg-white/15")} style={{ height: h }} />;
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Tocar"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:opacity-90"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        {isMe && (
          <button type="button" onClick={() => setEditing(true)} aria-label="Editar música" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          src={music.url}
          preload="none"
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
          }}
          onEnded={() => (setPlaying(false), setProgress(0))}
        />
      </div>
      {editing && <MusicEditor userId={userId} current={music} onClose={() => setEditing(false)} />}
    </>
  );
}

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

function MusicEditor({ userId, current, onClose }: { userId: string; current: ProfileMusicData | null; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [title, setTitle] = useState(current?.title ?? "");
  const [artist, setArtist] = useState(current?.artist ?? "");
  const [url, setUrl] = useState(current?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setError("Escolha um arquivo de áudio.");
    if (file.size > 15 * 1024 * 1024) return setError("O áudio precisa ter no máximo 15 MB.");
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${userId}/music/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return setError("Não foi possível enviar o áudio.");
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setUrl(data.publicUrl);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
    setUploading(false);
  }

  async function save() {
    if (!title.trim()) return setError("Dê um título à música.");
    if (!url.trim()) return setError("Envie um áudio ou cole o link.");
    setBusy(true);
    setError(null);
    const music = { title: title.trim().slice(0, 100), artist: artist.trim().slice(0, 100) || null, url: url.trim() };
    const { error: e } = await supabase.from("User").update({ profileMusic: music } as never).eq("id", userId);
    setBusy(false);
    if (e) return setError("Não foi possível salvar.");
    onClose();
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const { error: e } = await supabase.from("User").update({ profileMusic: null } as never).eq("id", userId);
    setBusy(false);
    if (e) return setError("Não foi possível remover.");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="animate-sheet-up relative w-full max-w-md rounded-t-3xl border border-white/10 bg-space-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold text-white">Música do perfil</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/55 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-sm font-medium text-white/80 transition hover:border-orbit-purple/50 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
            {url ? "Trocar áudio" : "Enviar áudio (MP3, M4A, OGG)"}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          {url && <p className="truncate rounded-lg bg-white/5 px-3 py-2 text-[11px] text-orbit-cyan">✓ áudio pronto</p>}
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Título da música" className={field} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={100} placeholder="Artista (opcional)" className={field} />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex items-center gap-2">
            {current && (
              <button type="button" onClick={remove} disabled={busy} className="flex h-10 items-center gap-2 rounded-full border border-red-400/40 px-4 text-sm font-semibold text-red-300 disabled:opacity-60">
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            )}
            <button type="button" onClick={save} disabled={busy} className="ml-auto flex h-10 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
