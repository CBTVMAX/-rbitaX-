"use client";

import { useEffect, useRef, useState } from "react";
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
  name,
  open,
  initialFile,
  onClose,
}: {
  userId: string;
  avatarUrl: string | null;
  username: string;
  name?: string;
  open: boolean;
  /** Foto já escolhida (ex.: "Alterar foto" no menu Mais): começa direto no recorte. */
  initialFile?: File | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(open ? (initialFile ? "edit" : "menu") : null);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [cropped, setCropped] = useState<Blob | null>(null);
  const [ratio, setRatio] = useState(1);
  const [asProfile, setAsProfile] = useState(true);
  // Nova foto de perfil: post e história já vêm marcados (a pessoa desmarca o que não quiser).
  const [asStory, setAsStory] = useState(true);
  const [asPost, setAsPost] = useState(true);
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
    // The upload guard allows formats the browser may not be able to decode (a phone's HEIC, for
    // one). Probing here turns that into a clear message, instead of an editor that opens on an
    // empty stage and leaves you adjusting a photo you cannot see.
    try {
      const bitmap = await createImageBitmap(f);
      bitmap.close();
    } catch (err) {
      return setError("Este navegador não consegue abrir esse formato de imagem. Converta a foto para JPG ou PNG e tente de novo.");
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
    if (!file) return setError("Algo deu errado. Tente selecionar a foto novamente.");
    if (!cropped) return setError("Edite a foto antes de publicar.");
    if (!asProfile && !asStory) return setError("Ative a história para publicar.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      // Upload the cropped file (the crop/rotate info is stored in ratio metadata)
      const mediaUrl = await uploadAvatarFile(supabase, userId, cropped, ratio);
      if (asProfile) {
        await saveAvatarUrl(supabase, userId, mediaUrl);
      }
      if (asStory) {
        const { error: storyError } = await supabase.rpc("story_create", {
          p: { type: "image", mediaUrl, hours: 24, meta: { source: "avatar", ratio } },
        });
        if (storyError) throw new Error("STORY_FAILED");
      }
      if (asPost && asProfile) {
        // Mesma estrutura do composer: um Post de imagem com a foto como Media.
        const postId = crypto.randomUUID();
        const { error: postError } = await supabase.from("Post").insert({
          id: postId,
          authorId: userId,
          content: "",
          kind: "image",
          updatedAt: new Date().toISOString(),
        });
        if (postError) throw new Error("POST_FAILED");
        const { error: mediaError } = await supabase.from("Media").insert({
          id: crypto.randomUUID(),
          postId,
          type: "image",
          url: mediaUrl,
          mimeType: cropped.type || "image/jpeg",
          position: 0,
        });
        if (mediaError) throw new Error("POST_FAILED");
      }
      router.refresh();
      close();
    } catch (e) {
      console.error("[publish] Error:", e);
      setError(
        e instanceof Error && e.message === "STORY_FAILED"
          ? "A foto foi salva, mas não foi possível publicar a história. Tente novamente."
          : e instanceof Error && e.message === "POST_FAILED"
            ? "A foto foi salva, mas não foi possível criar a publicação. Tente novamente."
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

  // Recorte e escolha de publicação são telas cheias próprias (como no VK), sem a janelinha do menu.
  if (step === "edit" && file) return <AvatarEditor file={file} name={name} onCancel={close} onConfirm={onEditDone} />;
  if (step === "publish")
    return createPortal(
      <PublishChoice
        blob={cropped}
        storyOnly={!asProfile}
        asPost={asPost}
        asStory={asStory}
        setAsPost={setAsPost}
        setAsStory={setAsStory}
        busy={busy}
        error={error}
        onBack={() => setStep("edit")}
        onCancel={close}
        onContinue={publish}
      />,
      document.body
    );

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


      </div>
    </div>,
    document.body
  );
}

/** Tela depois do recorte (estilo app): foto em círculo e as chaves de post/história. */
function PublishChoice({
  blob,
  storyOnly,
  asPost,
  asStory,
  setAsPost,
  setAsStory,
  busy,
  error,
  onBack,
  onCancel,
  onContinue,
}: {
  blob: Blob | null;
  storyOnly: boolean;
  asPost: boolean;
  asStory: boolean;
  setAsPost: (v: boolean) => void;
  setAsStory: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const toggle = (label: string, hint: string | null, on: boolean, set: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center gap-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] text-snow">{label}</span>
        {hint && <span className="block text-sm text-snow/50">{hint}</span>}
      </span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="peer sr-only" />
      <span className="relative h-8 w-14 shrink-0 rounded-full bg-snow/20 transition after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-snow after:transition peer-checked:bg-orbit-blue peer-checked:after:translate-x-6 peer-focus-visible:ring-2 peer-focus-visible:ring-orbit-blue/60" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-snow md:items-center md:justify-center md:bg-black/90">
      <div className="flex w-full max-w-md flex-1 flex-col md:flex-none md:rounded-3xl md:bg-[#0b0e1c] md:p-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} aria-label="Voltar ao recorte" className="rounded-full p-1.5 text-snow/70 hover:bg-snow/10">
            <ChevronRight className="h-6 w-6 rotate-180" />
          </button>
          <h2 className="flex-1 text-[17px] font-semibold">Está quase</h2>
          <button type="button" onClick={onCancel} aria-label="Cancelar" className="rounded-full p-1.5 text-snow/70 hover:bg-snow/10">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <span className="block aspect-square w-[min(68vw,300px)] overflow-hidden rounded-full bg-snow/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url && <img src={url} alt="Nova foto" className="h-full w-full object-cover" />}
          </span>
          <p className="mt-6 max-w-xs text-center text-[15px] leading-relaxed text-snow/60">
            {storyOnly ? "Sua foto vai aparecer nas histórias por 24h." : "Publique o post e a história para os amigos opinarem sobre a nova fotografia"}
          </p>
        </div>
        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="mb-4">
          {!storyOnly && toggle("Publicar post", null, asPost, setAsPost)}
          {toggle("Publicar história", "Fica 24h nas histórias; curtidas e visualizações aparecem lá", asStory, setAsStory)}
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={busy || (storyOnly && !asStory)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-snow text-[17px] font-semibold text-[#05060f] transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} {busy ? "Publicando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}
