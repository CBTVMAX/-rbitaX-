"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { Camera, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/messenger/media";
import { CHAT_THEMES, chatTheme } from "@/lib/messenger/themes";
import { WALLPAPERS, customWallpaperId, isCustomWallpaper, wallpaperSrc } from "@/lib/messenger/wallpapers";
import { sniffFile } from "@/lib/upload-guard";

/** Tema da conversa: background glow, accents, sent bubbles and buttons of this chat only. */
export function ThemeSelector({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const current = chatTheme(value).id;
  return (
    <div className="grid grid-cols-5 gap-x-1.5 gap-y-3" lang="pt-BR">
      {CHAT_THEMES.map((t) => {
        const on = t.id === current;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={on} title={t.label} className="group flex flex-col items-center gap-1.5">
            <span
              className={clsx(
                "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-space-surface transition group-hover:scale-105",
                on ? "ring-[rgb(var(--swatch))]" : "ring-transparent",
              )}
              style={
                {
                  "--swatch": t.accent,
                  background: t.light
                    ? "linear-gradient(160deg, #f6f7fc 0%, #e6e9f6 100%)"
                    : `radial-gradient(circle at 25% 20%, rgb(${t.glow[0]} / 0.55), transparent 60%), radial-gradient(circle at 80% 90%, rgb(${t.glow[1]} / 0.5), transparent 60%), #0b0e1c`,
                } as React.CSSProperties
              }
            >
              <span className="absolute bottom-2 right-1.5 h-3 w-6 rounded-full rounded-br-sm" style={{ background: t.bubble }} />
              <span className={clsx("absolute left-1.5 top-2 h-3 w-5 rounded-full rounded-bl-sm", t.light ? "bg-slate-300" : "bg-white/25")} />
              {on && (
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-snow">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={clsx("w-full hyphens-auto break-words text-center text-[10px] leading-tight", on ? "font-semibold text-white" : "text-white/55")}>
              {t.label.replace("Monocromático", "Mono\u00ADcromático")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Envia a foto escolhida (até 2048 px, WebP/JPEG) para a pasta da pessoa e devolve o id do papel de parede. */
async function uploadWallpaper(file: File) {
  const found = await sniffFile(file);
  if (!found || found.kind !== "image" || found.mime === "image/gif") throw new Error("Escolha uma foto (JPG, PNG ou WebP).");
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Entre de novo para trocar o fundo.");
  const img = await compressImage(file);
  const ext = img.mime === "image/webp" ? "webp" : "jpg";
  const path = `${data.user.id}/wallpapers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, img.blob, { contentType: img.mime, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Não foi possível enviar a foto agora.");
  return customWallpaperId(path);
}

/** Papel de parede: a picture behind this chat (or the default space backdrop), ou uma foto da própria pessoa. */
export function WallpaperSelector({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const items: { id: string | null; label: string }[] = [{ id: null, label: "Padrão" }, ...WALLPAPERS];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = isCustomWallpaper(value) ? value : null;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadWallpaper(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível usar essa foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          pick(f);
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-pressed={!!custom}
          title="Usar uma foto sua"
          className="group flex flex-col items-center gap-1.5"
        >
          <span
            className={clsx(
              "relative flex aspect-[9/14] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed bg-cover bg-center ring-2 ring-offset-2 ring-offset-space-surface transition group-hover:scale-[1.03]",
              custom ? "border-transparent ring-chat" : "border-white/25 ring-transparent bg-white/[0.04]",
            )}
            style={custom ? { backgroundImage: `url("${wallpaperSrc(custom)}")` } : undefined}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-white/80" />
            ) : custom ? (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-snow">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold text-snow">Trocar</span>
              </>
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-[0_6px_16px_rgb(var(--app-accent,139_92_246)/0.4)]">
                  <Camera className="h-4 w-4" />
                </span>
                <span className="px-1 text-center text-[10px] font-semibold leading-tight text-white/75">Usar foto sua</span>
              </>
            )}
          </span>
          <span className={clsx("text-center text-[10px] leading-tight", custom ? "font-semibold text-white" : "text-white/55")}>Sua foto</span>
        </button>
        {items.map((w) => {
          const on = (value ?? null) === w.id;
          return (
            <button key={w.id ?? "padrao"} type="button" onClick={() => onChange(w.id)} aria-pressed={on} title={w.label} className="group flex flex-col items-center gap-1.5">
              <span
                className={clsx(
                  "relative flex aspect-[9/14] w-full items-center justify-center overflow-hidden rounded-xl bg-cover bg-center ring-2 ring-offset-2 ring-offset-space-surface transition group-hover:scale-[1.03]",
                  on ? "ring-chat" : "ring-transparent",
                )}
                style={
                  w.id
                    ? { backgroundImage: `url(${wallpaperSrc(w.id, true)})` }
                    : {
                        background:
                          "radial-gradient(circle at 25% 20%, rgb(79 139 255 / 0.45), transparent 60%), radial-gradient(circle at 80% 90%, rgb(168 85 247 / 0.45), transparent 60%), #0b0e1c",
                      }
                }
              >
                {on && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-snow">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={clsx("text-center text-[10px] leading-tight", on ? "font-semibold text-white" : "text-white/55")}>{w.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}
      <p className="mt-2 text-[11px] text-white/40">O fundo muda só para você. A sua foto não aparece para a outra pessoa.</p>
    </div>
  );
}
