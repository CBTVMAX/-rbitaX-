"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Smile } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MessengerContext, type MessengerContextValue } from "@/components/messenger/context";
import { StickerPanel } from "@/components/messenger/sticker-panel";
import type { ChatUser, StickerInfo } from "@/lib/messenger/types";

/**
 * Botão 😊 da caixa de comentário: abre o mesmo painel do Messenger (emojis, adesivos e
 * favoritos, sem GIF). Emoji entra no texto; adesivo é enviado na hora como comentário.
 */
export function CommentStickerButton({
  viewer,
  onEmoji,
  onSticker,
  className,
}: {
  viewer: ChatUser;
  onEmoji: (emoji: string) => void;
  onSticker: (info: StickerInfo) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // O painel foi feito para o Messenger: aqui ele recebe só o que usa (conta, banco e avisos).
  const ctx = useMemo<MessengerContextValue>(
    () =>
      ({
        me: viewer,
        supabase: createClient(),
        conversations: [],
        toast: (text: string, tone: "info" | "error" = "info") => setNote({ text, tone }),
        reloadConversations: async () => {},
        patchConversation: () => {},
        openConversation: () => {},
      }) as unknown as MessengerContextValue,
    [viewer]
  );

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 2200);
    return () => window.clearTimeout(t);
  }, [note]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={wrap} className="static">
      {open && (
        <div className="animate-sheet-up absolute bottom-full left-0 right-0 z-30 md:left-auto md:right-2 md:mb-2 md:w-[400px]">
          <MessengerContext.Provider value={ctx}>
            <StickerPanel
              tabs={["emoji", "stickers", "favoritos"]}
              initialTab="stickers"
              onClose={() => setOpen(false)}
              onEmoji={onEmoji}
              onSticker={(_id, info) => {
                setOpen(false);
                onSticker(info);
              }}
              onGifFile={() => {}}
              onGifReuse={() => {}}
            />
          </MessengerContext.Provider>
          {note && (
            <p className={clsx("absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium shadow-lg", note.tone === "error" ? "bg-red-500 text-snow" : "bg-white text-[#111]")}>
              {note.text}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Fechar adesivos e emojis" : "Adesivos e emojis"}
        title="Adesivos e emojis"
        className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/5", open ? "text-orbit-blue" : "text-white/55 hover:text-white", className)}
      >
        <Smile className="h-6 w-6" />
      </button>
    </div>
  );
}
