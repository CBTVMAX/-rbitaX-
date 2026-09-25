"use client";

import { useRef } from "react";
import { clsx } from "clsx";
import { BarChart3, Bookmark, Camera, FileText, Gift, ImagePlay, Images, Link2, MapPin, Mic, Smile, UserRound, Video } from "lucide-react";
import { Popover } from "./ui";

export type AttachmentChoice =
  | { kind: "media"; files: File[] }
  | { kind: "camera"; files: File[] }
  | { kind: "video"; files: File[] }
  | { kind: "file"; files: File[] }
  | { kind: "gif" }
  | { kind: "sticker" }
  | { kind: "link" }
  | { kind: "location" }
  | { kind: "contact" }
  | { kind: "poll" }
  | { kind: "gift" }
  | { kind: "save" }
  | { kind: "voice" };

type ItemId = AttachmentChoice["kind"];

const ITEMS: { id: ItemId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "media", label: "Galeria", icon: Images },
  { id: "camera", label: "Câmera", icon: Camera },
  { id: "video", label: "Vídeo", icon: Video },
  { id: "voice", label: "Áudio", icon: Mic },
  { id: "file", label: "Documento", icon: FileText },
  { id: "link", label: "Link", icon: Link2 },
  { id: "location", label: "Localização", icon: MapPin },
  { id: "contact", label: "Contato", icon: UserRound },
  { id: "poll", label: "Enquete", icon: BarChart3 },
  { id: "sticker", label: "Sticker", icon: Smile },
  { id: "gif", label: "GIF", icon: ImagePlay },
  { id: "gift", label: "Presente", icon: Gift },
  { id: "save", label: "Salvar nos meus salvos", icon: Bookmark },
];

/** The "+" of the composer: every kind of content the chat can send, in a compact grid. */
export function AttachmentMenu({
  open,
  onClose,
  onChoose,
  inSaved = false,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (c: AttachmentChoice) => void;
  /** Inside "Salvos": no poll, gift or "save" (it is already the saved space). */
  inSaved?: boolean;
}) {
  const media = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const items = ITEMS.filter((i) => !inSaved || !["poll", "gift", "save"].includes(i.id));

  const pick = (id: ItemId) => {
    if (id === "media") media.current?.click();
    else if (id === "camera") camera.current?.click();
    else if (id === "video") video.current?.click();
    else if (id === "file") file.current?.click();
    else {
      onClose();
      onChoose({ kind: id } as AttachmentChoice);
    }
  };

  const onFiles = (kind: "media" | "camera" | "video" | "file") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    onClose();
    if (files.length) onChoose({ kind, files });
  };

  return (
    <>
      <input ref={media} type="file" accept="image/*,video/*" multiple hidden onChange={onFiles("media")} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onFiles("camera")} />
      <input ref={video} type="file" accept="video/*" hidden onChange={onFiles("video")} />
      <input ref={file} type="file" multiple hidden onChange={onFiles("file")} />
      <Popover open={open} onClose={onClose} className="bottom-full left-0 mb-2 w-[min(360px,calc(100vw-1.25rem))] p-2.5">
        <div className="grid grid-cols-4 gap-1">
          {items.map(({ id, label, icon: Icon }) => {
            const accent = id === "save";
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className="group flex flex-col items-center gap-1.5 rounded-2xl px-0.5 pb-2 pt-2.5 text-center text-[11px] font-medium leading-tight text-white/75 transition hover:bg-white/[0.05] hover:text-white focus-visible:bg-white/[0.06]"
              >
                <span
                  className={clsx(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border transition group-hover:scale-105 group-active:scale-95",
                    accent
                      ? "border-white/20 bg-orbit-gradient text-snow shadow-[0_0_18px_rgb(var(--app-accent,139_92_246)/0.4)]"
                      : "border-white/10 bg-white/[0.05] text-white/85 group-hover:border-chat/40 group-hover:text-chat group-hover:shadow-[0_0_14px_rgb(var(--chat-accent,139_92_246)/0.25)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={clsx("line-clamp-2", accent && "text-chat")}>{label}</span>
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
