"use client";

import { useRef } from "react";
import { clsx } from "clsx";
import { BarChart3, Camera, FileUp, ImagePlay, Images, MapPin, Mic, Music2, UserRound } from "lucide-react";
import { Popover } from "./ui";

export type AttachmentChoice =
  | { kind: "media"; files: File[] }
  | { kind: "camera"; files: File[] }
  | { kind: "file"; files: File[] }
  | { kind: "music"; files: File[] }
  | { kind: "gif" }
  | { kind: "location" }
  | { kind: "contact" }
  | { kind: "poll" }
  | { kind: "voice" };

const ITEMS = [
  { id: "media", label: "Foto/Vídeo", icon: Images, tint: "from-sky-500 to-blue-600" },
  { id: "camera", label: "Câmera", icon: Camera, tint: "from-fuchsia-500 to-pink-600" },
  { id: "gif", label: "GIF", icon: ImagePlay, tint: "from-violet-500 to-purple-600" },
  { id: "file", label: "Arquivo", icon: FileUp, tint: "from-indigo-500 to-blue-700" },
  { id: "music", label: "Música", icon: Music2, tint: "from-orange-400 to-rose-500" },
  { id: "location", label: "Localização", icon: MapPin, tint: "from-emerald-500 to-teal-600" },
  { id: "contact", label: "Contato", icon: UserRound, tint: "from-cyan-500 to-sky-600" },
  { id: "poll", label: "Enquete", icon: BarChart3, tint: "from-amber-400 to-orange-500" },
  { id: "voice", label: "Áudio", icon: Mic, tint: "from-rose-500 to-red-600" },
] as const;

/** The "+" of the composer: every kind of content the chat can send. */
export function AttachmentMenu({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (c: AttachmentChoice) => void;
}) {
  const media = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const music = useRef<HTMLInputElement>(null);

  const pick = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "media") media.current?.click();
    else if (id === "camera") camera.current?.click();
    else if (id === "file") file.current?.click();
    else if (id === "music") music.current?.click();
    else {
      onClose();
      onChoose({ kind: id } as AttachmentChoice);
    }
  };

  const onFiles = (kind: "media" | "camera" | "file" | "music") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    onClose();
    if (files.length) onChoose({ kind, files });
  };

  return (
    <>
      <input ref={media} type="file" accept="image/*,video/*" multiple hidden onChange={onFiles("media")} />
      <input ref={camera} type="file" accept="image/*,video/*" capture="environment" hidden onChange={onFiles("camera")} />
      <input ref={file} type="file" multiple hidden onChange={onFiles("file")} />
      <input ref={music} type="file" accept="audio/*" hidden onChange={onFiles("music")} />
      <Popover open={open} onClose={onClose} className="bottom-full left-0 mb-2 w-[min(340px,calc(100vw-1.5rem))] p-3">
        <div className="grid grid-cols-3 gap-1">
          {ITEMS.map(({ id, label, icon: Icon, tint }) => (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              className="group flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
            >
              <span
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-snow shadow-lg transition group-hover:scale-105 group-active:scale-95",
                  tint
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
