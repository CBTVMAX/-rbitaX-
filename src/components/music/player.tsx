"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { formatDuration, type MusicTrack } from "@/lib/music";
import { TrackCover } from "./track-row";

export type Player = ReturnType<typeof usePlayer>;

/** Fila de reprodução da página de Música (com controles na tela de bloqueio do celular). */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const current = index >= 0 ? queue[index] ?? null : null;

  const playList = useCallback((list: MusicTrack[], start: number) => {
    setQueue(list);
    setIndex(start);
  }, []);

  const next = useCallback(() => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)), [queue.length]);
  const prev = useCallback(() => {
    const el = audioRef.current;
    if (el && el.currentTime > 4) {
      el.currentTime = 0;
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [current]);

  const seek = useCallback((sec: number) => {
    const el = audioRef.current;
    if (el && Number.isFinite(sec)) el.currentTime = sec;
  }, []);

  // Troca de faixa: carrega e toca.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    setError(false);
    setTime(0);
    setDuration(current.duration ?? 0);
    setLoading(true);
    el.src = current.audioUrl;
    el.play().catch(() => setPlaying(false));
  }, [current]);

  // Tela de bloqueio / fones Bluetooth.
  useEffect(() => {
    if (!current || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? "Órbita X",
      artwork: current.coverUrl ? [{ src: current.coverUrl, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, toggle, next, prev]);

  const audio = (
    <audio
      ref={audioRef}
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onPlaying={() => setLoading(false)}
      onWaiting={() => setLoading(true)}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      onEnded={() => (index + 1 < queue.length ? next() : setPlaying(false))}
      onError={() => {
        setLoading(false);
        setPlaying(false);
        setError(true);
      }}
    />
  );

  return { audio, current, queue, index, playing, loading, time, duration, error, playList, toggle, next, prev, seek };
}

export function PlayerBar({ player }: { player: Player }) {
  const { current, playing, loading, time, duration, error } = player;
  if (!current) return null;
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-space-surface/95 backdrop-blur-xl md:bottom-0 md:left-[14rem]">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={time}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label="Posição da música"
        className="orbit-range absolute inset-x-0 -top-[7px] h-3.5 w-full cursor-pointer appearance-none bg-transparent"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2.5 md:px-5">
        <TrackCover track={current} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{current.title}</p>
          <p className="truncate text-xs text-white/50">
            {error ? <span className="text-red-300">Não foi possível tocar esta música agora.</span> : current.artist}
          </p>
        </div>
        <span className="hidden shrink-0 text-xs tabular-nums text-white/45 sm:block">
          {formatDuration(time) || "0:00"} / {formatDuration(duration) || "–"}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={player.prev} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition hover:bg-white/5 hover:text-white">
            <SkipBack className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={playing ? "Pausar" : "Tocar"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:opacity-90"
          >
            {loading && playing ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={player.next}
            disabled={player.index + 1 >= player.queue.length}
            aria-label="Próxima"
            className={clsx("flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-30")}
          >
            <SkipForward className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      {player.audio}
    </div>
  );
}
