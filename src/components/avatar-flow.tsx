"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";
import { saveAvatarUrl, uploadAvatarFile } from "@/lib/avatar-upload";
import { aspectMarker } from "@/lib/avatar-aspect";
import { AvatarEditor } from "@/components/avatar-editor";
import { clsx } from "clsx";

type Step = "menu" | "source" | "edit" | "publish" | null;

/**
 * Avatar flow, modelled on the VK photo menu: tap the photo, pick an action, edit, then decide
 * where the result is published. Nothing is written until the user confirms — cancelling at any
 * step leaves the current photo exactly as it was.
 */
export function AvatarFlow({
  userId,
  avatarUrl,
  username,
  open,
  onClose,
}: {
  userId: string;
  avatarUrl: string | null;
  username: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(open ? "menu" : null);
  const [file, setFile] = useState<File | null>(null);
  const [cropped, setCropped] = useState<Blob | null>(null);
  const [ratio, setRatio] = useState(1);
  const [asProfile, setAsProfile] = useState(true);
  const [asStory, setAsStory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function close() {
    // Cancelling anywhere must not touch the saved photo, so every pending file is dropped.
    setStep(null);
    setFile(null);
    setCropped(null);
    setError(null);
    onClose();
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (f.size > 10 * 1024 * 1024) return setError("A imagem precisa ter no máximo 10 MB.");
    setError(null);
    try {
      await verifyUpload(f, ["image"], f.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imagem inválida.");
      return;
    }
    setFile(f);
    setStep("edit");
  }

  async function onEditDone(blob: Blob, r: number) {
    // Keep the editor's own output — it already contains the zoom, pan and rotation the user chose.
    setCropped(blob);
    setRatio(r);
    setStep("publish");
  }

  async function publish() {
    if (!file || !cropped) return;
    if (!asProfile && !asStory) return setError("Escolha onde publicar a foto.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      // Upload once, then point the avatar and/or the story at the same file.
      const mediaUrl = await uploadAvatarFile(supabase, userId, cropped, ratio);
      if (asProfile) {
        await saveAvatarUrl(supabase, userId, mediaUrl);
      }
      if (asStory) {
        const { error: storyError } = await supabase.rpc("story_create", {
          p: { type: "image", mediaUrl, hours: 24, meta: { source: "avatar" } },
        });
        if (storyError) throw new Error("STORY_FAILED");
      }
      router.refresh();
      close();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "STORY_FAILED"
          ? "A foto foi salva, mas não foi possível publicar a história. Tente novamente."
          : "Não foi possível salvar a foto. Tente novamente."
      );
    }
    setBusy(false);
  }

  async function removePhoto() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: e1 } = await supabase.from("User").update({ avatarUrl: null }).eq("id", userId);
    setBusy(false);
    if (e1) return setError("Não foi possível remover a foto.");
    router.refresh();
    close();
  }

  if (!step) return null;

  const title =
    step === "menu" ? "Foto do perfil" : step === "source" ? "Alterar foto" : step === "edit" ? "Ajustar foto" : "Onde publicar?";
  const item = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/5";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Foto do perfil">
      <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-space-surface p-4 shadow-2xl md:rounded-3xl md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <button type="button" onClick={close} aria-label="Voltar" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            {step === "menu" ? <X className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 rotate-180" />}
          </button>
        </div>

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {step === "menu" && (
          <div className="-mx-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setAsProfile(false);
                setAsStory(true);
                setStep("source");
              }}
              className={item}
            >
              <Sparkles className="h-4 w-4" /> Nova história
            </button>
            <a href={`/perfil/${username}`} onClick={close} target="_blank" rel="noreferrer" className={item}>
              <ImageIcon className="h-4 w-4" /> Abrir foto
            </a>
            <button type="button" onClick={() => setStep("source")} className={item}>
              <Camera className="h-4 w-4" /> Alterar foto
            </button>
            {avatarUrl && (
              <button type="button" onClick={removePhoto} disabled={busy} className={clsx(item, "text-red-300 hover:bg-red-500/10")}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir foto
              </button>
            )}
          </div>
        )}

        {step === "source" && (
          <div className="-mx-1 space-y-0.5">
            <button type="button" onClick={() => galleryRef.current?.click()} className={item}>
              <Upload className="h-4 w-4" /> Carregar do dispositivo
            </button>
            <button type="button" onClick={() => cameraRef.current?.click()} className={item}>
              <Camera className="h-4 w-4" /> Capturar imagem
            </button>
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={pick} />
            {/* capture forces the native camera on phones; desktops just open the file picker. */}
            <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={pick} />
          </div>
        )}

        {step === "edit" && file && <AvatarEditor file={file} onCancel={close} onConfirm={onEditDone} />}

        {step === "publish" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-space-bg/40 p-3">
              <p className="mb-2 text-xs font-medium text-white/70">Onde publicar?</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={asProfile}
                  onChange={(e) => setAsProfile(e.target.checked)}
                  className="h-4 w-4 accent-orbit-purple"
                />
                <span className="text-sm font-medium text-white/90">Foto do perfil</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={asStory}
                  onChange={(e) => setAsStory(e.target.checked)}
                  className="h-4 w-4 accent-orbit-purple"
                />
                <span className="text-sm font-medium text-white/90">História</span>
                <span className="ml-auto text-[11px] text-white/45">24h</span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={close} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5">
                Cancelar
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-snow shadow-glow disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
