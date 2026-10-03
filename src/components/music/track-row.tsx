"use client";

import { clsx } from "clsx";
import { MoreHorizontal, Music2, Pause, Play } from "lucide-react";
import { formatDuration, type MusicTrack } from "@/lib/music";

export function TrackCover({ track, size = 44, className }: { track: Pick<MusicTrack, "coverUrl" | "title">; size?: number; className?: string }) {
  return track.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={track.coverUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={clsx("shrink-0 rounded-lg bg-white/[0.06] object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={clsx("flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orbit-purple/40 to-orbit-cyan/30 text-white/80", className)}
      style={{ width: size, height: size }}
    >
      <Music2 style={{ width: size * 0.42, height: size * 0.42 }} />
    </span>
  );
}

/** Linha de música no estilo do VK: capa (vira play/pause), título, artista e duração. */
export function TrackRow({
  track,
  active,
  playing,
  onPlay,
  onMore,
  subtitle,
  trailing,
}: {
  track: MusicTrack;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
  onMore?: () => void;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-xl px-2 py-1.5 transition",
        active ? "bg-orbit-purple/[0.12]" : "hover:bg-white/[0.04]"
      )}
    >
      <button type="button" onClick={onPlay} aria-label={active && playing ? `Pausar ${track.title}` : `Tocar ${track.title}`} className="relative shrink-0">
        <TrackCover track={track} size={44} />
        <span
          className={clsx(
            "absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-white transition",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {active && playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </span>
      </button>
      <button type="button" onClick={onPlay} className="min-w-0 flex-1 text-left">
        <span className={clsx("block truncate text-sm font-medium", active ? "text-orbit-cyan" : "text-white")}>{track.title}</span>
        <span className="block truncate text-xs text-white/50">{subtitle ?? track.artist}</span>
      </button>
      {trailing}
      <span className="hidden shrink-0 text-xs tabular-nums text-white/40 sm:block">{formatDuration(track.duration)}</span>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          aria-label={`Mais opções de ${track.title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
