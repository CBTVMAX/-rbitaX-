"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Check, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatAvatar, Modal } from "@/components/messenger/ui";

type Row = { id: string; isGroup: boolean; isSaved: boolean; name: string | null; avatarUrl: string | null; wallpaper: string | null; otherUser: { name: string; avatarUrl: string | null; avatarFrame?: string | null } | null };

/** Store / Meus itens → "Usar": pick the conversation that gets this wallpaper (only for you). */
export function WallpaperApplyDialog({
  wallpaper,
  name,
  open,
  onClose,
  onDone,
}: {
  wallpaper: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onDone: (text: string, error?: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.rpc("my_conversations").then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, [open, supabase]);

  async function apply(r: Row) {
    setBusy(r.id);
    const { error } = await supabase.rpc("update_conversation_setting", { conversation_id: r.id, patch: { wallpaper } as never });
    setBusy(null);
    if (error) return onDone("Não foi possível aplicar o papel de parede.", true);
    setRows((prev) => prev?.map((x) => (x.id === r.id ? { ...x, wallpaper } : x)) ?? null);
    onDone(`Papel de parede “${name}” aplicado.`);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Usar “${name}” em…`} size="sm">
      <p className="-mt-1 mb-3 text-xs text-white/50">Muda só para você. Dá para trocar depois nas informações da conversa.</p>
      {rows === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="orbit-scrollbar -mx-2 max-h-[50vh] overflow-y-auto">
          {rows.map((r) => {
            const title = r.isSaved ? "Salvos" : r.isGroup ? r.name ?? "Grupo" : r.otherUser?.name ?? "Conversa";
            const on = r.wallpaper === wallpaper;
            return (
              <button
                key={r.id}
                type="button"
                disabled={!!busy}
                onClick={() => apply(r)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05] disabled:opacity-60"
              >
                {r.isSaved ? (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient text-snow">
                    <Bookmark className="h-4 w-4" />
                  </span>
                ) : r.isGroup ? (
                  <ChatAvatar name={title} url={r.avatarUrl} size={40} group />
                ) : (
                  <ChatAvatar name={title} url={r.otherUser?.avatarUrl} size={40} frame={r.otherUser?.avatarFrame} />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{title}</span>
                {r.isGroup && <Users className="h-3.5 w-3.5 text-white/35" />}
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : on && <Check className="h-4 w-4 text-emerald-400" aria-label="Em uso" />}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
