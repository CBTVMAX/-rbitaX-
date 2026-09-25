"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Check,
  Download,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  Loader2,
  MapPin,
  Music2,
  Pause,
  Play,
  UserRound,
} from "lucide-react";
import { downloadUrl, useSignedUrl } from "@/lib/messenger/media";
import { formatBytes, formatDuration } from "@/lib/messenger/format";
import { stickerSrc } from "@/lib/messenger/stickers";
import type { Attachment, ChatMessage, PollVote } from "@/lib/messenger/types";
import { ChatAvatar } from "./ui";

/** Only one audio plays at a time across the whole Messenger. */
const PLAY_EVENT = "orbitax:audio-play";

function useExclusiveAudio(audio: React.RefObject<HTMLAudioElement>, id: string) {
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [audio, id]);
  return () => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
}

function Uploading() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
      <Loader2 className="h-7 w-7 animate-spin text-snow" />
    </span>
  );
}

function MediaTile({
  a,
  local,
  className,
  onOpen,
  overlay,
  sending,
}: {
  a: Attachment;
  local?: string;
  className?: string;
  onOpen: () => void;
  overlay?: React.ReactNode;
  sending?: boolean;
}) {
  const signed = useSignedUrl(local ? null : a.kind === "video" ? a.thumbPath ?? null : a.path);
  const src = local ?? signed;
  const video = a.kind === "video";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx("group/tile relative block overflow-hidden bg-white/[0.06]", className)}
      aria-label={video ? "Abrir vídeo" : "Abrir foto"}
    >
      {src ? (
        video && local ? (
          <video src={local} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover/tile:scale-[1.02]" />
        )
      ) : src === "" ? (
        <span className="flex h-full w-full items-center justify-center text-xs text-white/40">Indisponível</span>
      ) : (
        <span className="block h-full w-full animate-pulse bg-white/[0.08]" />
      )}
      {video && !sending && (
        <>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-snow backdrop-blur transition group-hover/tile:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </span>
          {!!a.duration && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-snow">
              {formatDuration(a.duration)}
            </span>
          )}
        </>
      )}
      {sending && <Uploading />}
      {overlay}
    </button>
  );
}

/** Smart grid: 1 · 2 side by side · 1 big + 2 · 2×2 · 2×2 with "+X". */
export function MediaGrid({
  message,
  onOpen,
}: {
  message: ChatMessage;
  onOpen: (index: number) => void;
}) {
  const items = message.attachments;
  const locals = message.localUrls ?? [];
  const sending = message.status === "sending";
  const n = items.length;

  if (n === 1) {
    const a = items[0];
    const ratio = a.width && a.height ? a.width / a.height : 4 / 3;
    const w = ratio >= 1 ? 320 : Math.max(180, Math.round(300 * ratio));
    return (
      <div style={{ width: `min(${w}px, 68vw)`, aspectRatio: `${Math.min(Math.max(ratio, 0.6), 1.9)}` }}>
        <MediaTile a={a} local={locals[0]} className="h-full w-full" onOpen={() => onOpen(0)} sending={sending} />
      </div>
    );
  }

  const tile = (i: number, className: string, overlay?: React.ReactNode) => (
    <MediaTile key={i} a={items[i]} local={locals[i]} className={className} onOpen={() => onOpen(i)} overlay={overlay} sending={sending} />
  );

  return (
    <div className="w-[min(320px,68vw)]">
      {n === 2 && <div className="grid aspect-[2/1] grid-cols-2 gap-0.5">{[0, 1].map((i) => tile(i, "h-full w-full"))}</div>}
      {n === 3 && (
        <div className="grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-0.5">
          {tile(0, "row-span-2 h-full w-full")}
          {tile(1, "h-full w-full")}
          {tile(2, "h-full w-full")}
        </div>
      )}
      {n >= 4 && (
        <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5">
          {[0, 1, 2].map((i) => tile(i, "h-full w-full"))}
          {tile(
            3,
            "h-full w-full",
            n > 4 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-display text-2xl font-bold text-snow backdrop-blur-[1px]">
                +{n - 4}
              </span>
            ) : undefined
          )}
        </div>
      )}
    </div>
  );
}

function fileIcon(name = "", mime = "") {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "rar", "7z"].includes(ext) || mime.includes("zip")) return FileArchive;
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt", "rtf", "odt", "epub"].includes(ext)) return FileText;
  if (mime.startsWith("audio/")) return FileAudio;
  return FileIcon;
}

export function FileCard({ a, mine, sending }: { a: Attachment; mine: boolean; sending?: boolean }) {
  const [busy, setBusy] = useState(false);
  const Icon = fileIcon(a.name, a.mime);
  const ext = (a.name?.split(".").pop() ?? "").toUpperCase().slice(0, 5);

  async function download() {
    setBusy(true);
    const url = await downloadUrl(a.path, a.name);
    setBusy(false);
    if (url) window.location.href = url;
  }

  return (
    <div className="flex w-[min(270px,66vw)] items-center gap-2.5 p-0.5">
      <span
        className={clsx(
          "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl",
          mine ? "bg-white/20 text-snow" : "bg-chat/15 text-chat"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
        {ext && <span className="text-[8px] font-bold leading-tight tracking-wide">{ext}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{a.name ?? "Arquivo"}</span>
        <span className={clsx("text-xs", mine ? "text-snow/70" : "text-white/50")}>{formatBytes(a.size)}</span>
      </span>
      <button
        type="button"
        onClick={download}
        disabled={busy || sending}
        aria-label="Baixar arquivo"
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          mine ? "bg-white/20 hover:bg-white/30" : "bg-white/[0.08] hover:bg-white/[0.14]"
        )}
      >
        {busy || sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

const SPEEDS = [1, 1.5, 2];

/** Downsamples the recorded peaks to the number of bars that fit the player. */
function resample(peaks: number[] | undefined, n: number) {
  if (!peaks?.length) return Array.from({ length: n }, (_, i) => 0.3 + 0.45 * Math.abs(Math.sin(i * 1.7)));
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * peaks.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * peaks.length) / n));
    return Math.max(...peaks.slice(a, b));
  });
}

/**
 * Voice message: compact, the size of a normal bubble. Play · waveform (tap to seek) · speed,
 * and below the time played/duration with the message time and ticks (`meta`).
 */
export function VoicePlayer({ message, mine, meta }: { message: ChatMessage; mine: boolean; meta?: React.ReactNode }) {
  const a = message.attachments[0];
  const local = message.localUrls?.[0];
  const signed = useSignedUrl(local ? null : a?.path);
  const src = local ?? signed;
  const audio = useRef<HTMLAudioElement>(null);
  const announce = useExclusiveAudio(audio, message.id);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const duration = a?.duration || 0;
  // Longer audio → a little wider, never more than a normal bubble.
  const width = Math.round(176 + Math.min(duration, 60) * 1.1);
  const count = Math.round((width - 96) / 4.2);
  const bars = useMemo(() => resample(a?.waveform, count), [a, count]);
  const sending = message.status === "sending";

  function toggle() {
    const el = audio.current;
    if (!el || !src) return;
    if (el.paused) {
      announce();
      el.playbackRate = speed;
      el.play().catch(() => {});
    } else el.pause();
  }

  function seekTo(fraction: number) {
    const el = audio.current;
    const d = el?.duration && Number.isFinite(el.duration) ? el.duration : duration;
    if (!el || !d) return;
    el.currentTime = Math.min(Math.max(fraction, 0), 0.999) * d;
    setProgress(el.currentTime / d);
    setCurrent(el.currentTime);
  }

  return (
    <div className="flex items-center gap-2.5 py-0.5 pl-0.5 pr-1" style={{ width: `min(${width}px, 64vw)` }}>
      <button
        type="button"
        onClick={toggle}
        disabled={!src || sending}
        aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-60",
          mine ? "bg-snow text-orbit-purple" : "bg-chat text-snow shadow-[0_0_12px_rgb(var(--chat-accent,139_92_246)/0.35)]"
        )}
      >
        {sending || src === undefined ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo((e.clientX - r.left) / r.width);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") seekTo(progress + 0.05);
              if (e.key === "ArrowLeft") seekTo(progress - 0.05);
            }}
            role="slider"
            tabIndex={0}
            aria-label="Posição do áudio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            {bars.map((b, i) => (
              <span
                key={i}
                className={clsx(
                  "w-[2.5px] shrink-0 rounded-full transition-colors",
                  i / bars.length < progress ? (mine ? "bg-snow" : "bg-chat") : mine ? "bg-snow/45" : "bg-white/30"
                )}
                style={{ height: `${Math.max(16, b * 100)}%` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
              setSpeed(next);
              if (audio.current) audio.current.playbackRate = next;
            }}
            className={clsx("shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums", mine ? "bg-white/20 text-snow" : "bg-white/10 text-white/80")}
            aria-label={`Velocidade ${speed}×`}
          >
            {speed}×
          </button>
        </div>
        <div className={clsx("mt-0.5 flex items-center justify-between gap-2 text-[11px] tabular-nums", mine ? "text-snow/75" : "text-white/50")}>
          <span>{formatDuration(playing || current ? current : duration)}</span>
          {meta}
        </div>
      </div>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
            setCurrent(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            const d = el.duration && Number.isFinite(el.duration) ? el.duration : duration;
            setCurrent(el.currentTime);
            setProgress(d ? el.currentTime / d : 0);
          }}
        />
      )}
    </div>
  );
}

/** Audio files (MP3, M4A, WAV, OGG…): compact card — play, name, size · duration, download. */
export function MusicCard({ message, mine, meta }: { message: ChatMessage; mine: boolean; meta?: React.ReactNode }) {
  const a = message.attachments[0];
  const local = message.localUrls?.[0];
  const signed = useSignedUrl(local ? null : a?.path);
  const src = local ?? signed;
  const audio = useRef<HTMLAudioElement>(null);
  const announce = useExclusiveAudio(audio, message.id);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const name = a?.name || `${message.meta.title || "Áudio"}`;
  const sending = message.status === "sending";

  async function download() {
    if (!a) return;
    setBusy(true);
    const url = await downloadUrl(a.path, a.name);
    setBusy(false);
    if (url) window.location.href = url;
  }

  return (
    <div className="w-[min(270px,66vw)] px-0.5 pt-0.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={!src || sending}
          onClick={() => {
            const el = audio.current;
            if (!el) return;
            if (el.paused) {
              announce();
              el.play().catch(() => {});
            } else el.pause();
          }}
          aria-label={playing ? `Pausar ${name}` : `Tocar ${name}`}
          className={clsx(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-60",
            mine ? "bg-white/20 text-snow" : "bg-chat/15 text-chat"
          )}
        >
          {sending || !src ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <>
              <Music2 className="h-[18px] w-[18px]" />
              <span className={clsx("absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full", mine ? "bg-snow text-orbit-purple" : "bg-chat text-snow")}>
                <Play className="ml-px h-2 w-2 fill-current" />
              </span>
            </>
          )}
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className={clsx("block truncate text-[11px] tabular-nums", mine ? "text-snow/70" : "text-white/50")}>
            {formatBytes(a?.size)}
            {a?.duration ? ` · ${formatDuration(a.duration)}` : ""}
          </span>
        </span>
        <button
          type="button"
          onClick={download}
          disabled={busy || sending}
          aria-label={`Baixar ${name}`}
          className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition", mine ? "bg-white/20 hover:bg-white/30" : "bg-white/[0.08] hover:bg-white/[0.14]")}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
      </div>
      {(playing || progress > 0) && (
        <div
          className={clsx("mt-2 h-1 cursor-pointer overflow-hidden rounded-full", mine ? "bg-white/25" : "bg-white/10")}
          onClick={(e) => {
            const el = audio.current;
            if (!el?.duration) return;
            const r = e.currentTarget.getBoundingClientRect();
            el.currentTime = ((e.clientX - r.left) / r.width) * el.duration;
          }}
        >
          <div className={clsx("h-full rounded-full", mine ? "bg-snow" : "bg-chat")} style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {meta && <div className="mt-1 flex justify-end">{meta}</div>}
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setProgress(el.duration ? el.currentTime / el.duration : 0);
          }}
        />
      )}
    </div>
  );
}

/** Virtual gift: compact, animated artwork + who it is for. */
export function GiftCard({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const { giftName = "Presente", giftImage, recipientName } = message.meta;
  return (
    <div className="flex w-[min(250px,64vw)] items-center gap-3 p-1">
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <span aria-hidden className={clsx("absolute inset-1 rounded-full blur-md", mine ? "bg-white/25" : "bg-chat/30")} />
        {giftImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={giftImage} alt="" className="animate-pop-in relative h-16 w-16 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block text-[10px] font-bold uppercase tracking-wider", mine ? "text-snow/75" : "text-chat")}>🎁 Presente</span>
        <span className="block truncate text-[15px] font-semibold">{giftName}</span>
        <span className={clsx("block truncate text-xs", mine ? "text-snow/75" : "text-white/55")}>
          {mine ? `para ${recipientName?.split(" ")[0] ?? "seu amigo"}` : "para você"}
        </span>
        {message.content && <span className={clsx("mt-1 block break-words text-[13px] italic", mine ? "text-snow/90" : "text-white/75")}>“{message.content}”</span>}
      </span>
    </div>
  );
}

/** Static map built from OpenStreetMap tiles around the shared point. */
export function LocationCard({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const { lat = 0, lng = 0, label } = message.meta;
  const zoom = 15;
  const n = 2 ** zoom;
  const xf = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x0 = Math.floor(xf);
  const y0 = Math.floor(yf);
  // 3×3 tiles, shifted so the point sits in the middle of a 280×160 window.
  const offsetX = (xf - x0 + 1) * 256 - 140;
  const offsetY = (yf - y0 + 1) * 256 - 80;
  const href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block w-[min(280px,66vw)]">
      <span className="relative block h-40 overflow-hidden bg-white/[0.06]">
        <span className="absolute left-0 top-0 block" style={{ transform: `translate(${-offsetX}px, ${-offsetY}px)`, width: 768, height: 768 }}>
          {[-1, 0, 1].map((dy) =>
            [-1, 0, 1].map((dx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${dx}:${dy}`}
                src={`https://tile.openstreetmap.org/${zoom}/${(x0 + dx + n) % n}/${y0 + dy}.png`}
                alt=""
                loading="lazy"
                className="absolute h-64 w-64 max-w-none"
                style={{ left: (dx + 1) * 256, top: (dy + 1) * 256 }}
              />
            ))
          )}
        </span>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-9 w-9 fill-orbit-pink text-snow drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
        </span>
        <span className="absolute bottom-0.5 right-1 rounded bg-white/80 px-1 text-[8px] text-slate-700">© OpenStreetMap</span>
      </span>
      <span className="flex items-center gap-2 px-3 py-2.5">
        <MapPin className={clsx("h-4 w-4 shrink-0", mine ? "text-snow" : "text-chat")} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{label || "Localização compartilhada"}</span>
          <span className={clsx("block text-[11px]", mine ? "text-snow/70" : "text-white/45")}>Abrir no mapa</span>
        </span>
      </span>
    </a>
  );
}

export function ContactCard({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const { name = "Contato", username, avatarUrl, avatarFrame } = message.meta;
  return (
    <div className="w-[min(260px,64vw)] p-1">
      <div className="flex items-center gap-3">
        <ChatAvatar name={name} url={avatarUrl} size={46} frame={avatarFrame} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {username && <span className={clsx("block truncate text-xs", mine ? "text-snow/70" : "text-white/50")}>@{username}</span>}
        </span>
        <UserRound className={clsx("h-4 w-4 shrink-0", mine ? "text-snow/70" : "text-white/35")} />
      </div>
      {username && (
        <Link
          href={`/perfil/${username}`}
          className={clsx(
            "mt-2.5 block rounded-xl py-2 text-center text-[13px] font-semibold transition",
            mine ? "bg-white/20 hover:bg-white/30" : "bg-chat/15 text-chat hover:bg-chat/25"
          )}
        >
          Ver perfil
        </Link>
      )}
    </div>
  );
}

export function PollCard({
  message,
  mine,
  votes,
  meId,
  onVote,
}: {
  message: ChatMessage;
  mine: boolean;
  votes: PollVote[];
  meId: string;
  onVote: (indexes: number[]) => void;
}) {
  const options = message.meta.options ?? [];
  const multiple = !!message.meta.multiple;
  const my = votes.filter((v) => v.userId === meId).map((v) => v.optionIndex);
  const voters = new Set(votes.map((v) => v.userId)).size;
  const counts = options.map((_, i) => votes.filter((v) => v.optionIndex === i).length);
  const voted = my.length > 0;

  function choose(i: number) {
    if (message.status) return;
    if (multiple) onVote(my.includes(i) ? my.filter((x) => x !== i) : [...my, i]);
    else onVote(my.includes(i) ? [] : [i]);
  }

  return (
    <div className="w-[min(290px,68vw)] p-1">
      <p className="text-[15px] font-semibold leading-snug">{message.meta.question}</p>
      <p className={clsx("mt-0.5 text-[11px]", mine ? "text-snow/70" : "text-white/45")}>
        {multiple ? "Escolha uma ou mais opções" : "Escolha uma opção"}
      </p>
      <div className="mt-3 space-y-2">
        {options.map((opt, i) => {
          const pct = voters ? Math.round((counts[i] / voters) * 100) : 0;
          const selected = my.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              className={clsx(
                "relative block w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition",
                mine ? "border-white/25 hover:bg-white/10" : "border-white/10 hover:border-chat/50"
              )}
            >
              {voted && (
                <span
                  className={clsx("absolute inset-y-0 left-0 transition-all duration-500", mine ? "bg-white/20" : "bg-chat/20")}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center gap-2.5">
                <span
                  className={clsx(
                    "flex h-4 w-4 shrink-0 items-center justify-center border",
                    multiple ? "rounded" : "rounded-full",
                    selected ? (mine ? "border-snow bg-snow text-orbit-purple" : "border-chat bg-chat text-snow") : mine ? "border-snow/60" : "border-white/35"
                  )}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 break-words">{opt}</span>
                {voted && <span className="shrink-0 text-xs font-semibold">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className={clsx("mt-2.5 text-[11px]", mine ? "text-snow/70" : "text-white/45")}>
        {voters === 0 ? "Nenhum voto ainda" : voters === 1 ? "1 voto" : `${voters} votos`}
      </p>
    </div>
  );
}

export function StickerView({ id }: { id: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={stickerSrc(id)} alt="Figurinha" loading="lazy" className="h-36 w-36 select-none object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] md:h-40 md:w-40" draggable={false} />
  );
}

export function GifView({ message, onOpen }: { message: ChatMessage; onOpen: () => void }) {
  const a = message.attachments[0];
  const local = message.localUrls?.[0];
  const signed = useSignedUrl(local ? null : a?.path);
  const src = local ?? signed;
  const ratio = a?.width && a?.height ? a.width / a.height : 1;
  return (
    <button type="button" onClick={onOpen} className="relative block overflow-hidden rounded-2xl bg-white/[0.06]" style={{ width: `min(${ratio >= 1 ? 260 : 200}px, 62vw)`, aspectRatio: `${Math.min(Math.max(ratio, 0.6), 1.9)}` }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="GIF" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full animate-pulse bg-white/[0.08]" />
      )}
      <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-snow">GIF</span>
      {message.status === "sending" && <Uploading />}
    </button>
  );
}
