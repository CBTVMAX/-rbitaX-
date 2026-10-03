"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink, Loader2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { formatDuration, type MusicTrack } from "@/lib/music";
import { TrackCover } from "./track-row";

// ---------------------------------------------------------------- YouTube IFrame API (tipos mínimos)
type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApi: Promise<YTNamespace> | null = null;
/** Carrega o script oficial do player do YouTube uma única vez. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApi) {
    ytApi = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        ytApi = null;
        reject(new Error("yt_api"));
      };
      document.head.appendChild(s);
    });
  }
  return ytApi;
}

export type Player = ReturnType<typeof usePlayer>;

/**
 * Fila de reprodução da página de Música. Faixas com arquivo tocam no <audio>; faixas do YouTube
 * tocam completas no player oficial incorporado (que precisa ficar visível, pelas regras do YouTube).
 */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const current = index >= 0 ? queue[index] ?? null : null;
  const isYouTube = !!current?.youtubeId;
  const queueLenRef = useRef(0);
  queueLenRef.current = queue.length;

  const playList = useCallback((list: MusicTrack[], start: number) => {
    setQueue(list);
    setIndex(start);
  }, []);

  const next = useCallback(() => setIndex((i) => (i + 1 < queueLenRef.current ? i + 1 : i)), []);
  const prev = useCallback(() => {
    const t = ytRef.current && isYouTube ? ytRef.current.getCurrentTime() : audioRef.current?.currentTime ?? 0;
    if (t > 4) {
      if (isYouTube) ytRef.current?.seekTo(0, true);
      else if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, [isYouTube]);

  const toggle = useCallback(() => {
    if (!current) return;
    if (current.youtubeId) {
      if (playing) ytRef.current?.pauseVideo();
      else ytRef.current?.playVideo();
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [current, playing]);

  const seek = useCallback(
    (sec: number) => {
      if (!Number.isFinite(sec)) return;
      if (isYouTube) ytRef.current?.seekTo(sec, true);
      else if (audioRef.current) audioRef.current.currentTime = sec;
      setTime(sec);
    },
    [isYouTube]
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    ytRef.current?.stopVideo();
    setPlaying(false);
    setIndex(-1);
    setQueue([]);
  }, []);

  // Troca de faixa.
  useEffect(() => {
    if (!current) return;
    setError(false);
    setTime(0);
    setDuration(current.duration ?? 0);
    setLoading(true);

    if (current.youtubeId) {
      audioRef.current?.pause();
      const id = current.youtubeId;
      let cancelled = false;
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled || !ytMountRef.current) return;
          if (ytRef.current) {
            ytRef.current.loadVideoById(id);
            return;
          }
          const mount = document.createElement("div");
          ytMountRef.current.replaceChildren(mount);
          ytRef.current = new YT.Player(mount, {
            videoId: id,
            host: "https://www.youtube-nocookie.com",
            width: "100%",
            height: "100%",
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onStateChange: (e) => {
                // 1 tocando · 2 pausado · 0 terminou · 3 carregando
                if (e.data === 1) {
                  setPlaying(true);
                  setLoading(false);
                  const d = e.target.getDuration();
                  if (d) setDuration(d);
                } else if (e.data === 2) setPlaying(false);
                else if (e.data === 3) setLoading(true);
                else if (e.data === 0) {
                  setPlaying(false);
                  setIndex((i) => (i + 1 < queueLenRef.current ? i + 1 : i));
                }
              },
              onError: () => {
                setLoading(false);
                setPlaying(false);
                setError(true);
              },
            },
          });
        })
        .catch(() => {
          setLoading(false);
          setError(true);
        });
      return () => {
        cancelled = true;
      };
    }

    ytRef.current?.pauseVideo();
    const el = audioRef.current;
    if (!el) return;
    el.src = current.audioUrl;
    el.play().catch(() => setPlaying(false));
  }, [current]);

  // Tempo do player do YouTube (a API não emite eventos de progresso).
  useEffect(() => {
    if (!isYouTube || !playing) return;
    const t = window.setInterval(() => {
      const yt = ytRef.current;
      if (!yt) return;
      setTime(yt.getCurrentTime());
      const d = yt.getDuration();
      if (d) setDuration(d);
    }, 500);
    return () => window.clearInterval(t);
  }, [isYouTube, playing]);

  useEffect(() => () => ytRef.current?.destroy(), []);

  // Tela de bloqueio / fones Bluetooth (faixas de arquivo).
  useEffect(() => {
    if (!current || current.youtubeId || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
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
      onPause={() => !current?.youtubeId && setPlaying(false)}
      onPlaying={() => setLoading(false)}
      onWaiting={() => setLoading(true)}
      onTimeUpdate={(e) => !current?.youtubeId && setTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      onEnded={() => (index + 1 < queue.length ? next() : setPlaying(false))}
      onError={() => {
        if (current?.youtubeId || !current) return;
        setLoading(false);
        setPlaying(false);
        setError(true);
      }}
    />
  );

  return { audio, ytMountRef, current, isYouTube, queue, index, playing, loading, time, duration, error, playList, toggle, next, prev, seek, stop };
}

export function PlayerBar({ player }: { player: Player }) {
  const { current, playing, loading, time, duration, error, isYouTube } = player;
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <>
      {/* Player oficial do YouTube: o YouTube exige que fique visível enquanto toca, com no mínimo
          200×200. Fica no tamanho mínimo, como um quadradinho discreto no canto, acima da barra. */}
      <div
        className={clsx(
          "fixed right-3 z-30 h-[200px] w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
          "bottom-[calc(4.25rem+env(safe-area-inset-bottom)+68px)] md:bottom-[80px] md:right-5",
          current && isYouTube ? "block" : "hidden"
        )}
      >
        <div ref={player.ytMountRef} className="h-full w-full" />
      </div>

      {current && (
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
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2 md:px-5 md:py-2.5">
            <TrackCover track={current} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{current.title}</p>
              <p className="truncate text-xs text-white/50">
                {error ? (
                  isYouTube && current.youtubeId ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${current.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-red-300 hover:underline"
                    >
                      Este vídeo não toca fora do YouTube. Abrir no YouTube <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-red-300">Não foi possível tocar esta música agora.</span>
                  )
                ) : (
                  current.artist
                )}
              </p>
            </div>
            <span className="hidden shrink-0 text-xs tabular-nums text-white/45 sm:block">
              {formatDuration(time) || "0:00"} / {formatDuration(duration) || "–"}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <SkipForward className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={player.stop} aria-label="Fechar player" className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white sm:ml-0.5 sm:h-9 sm:w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {player.audio}
    </>
  );
}
