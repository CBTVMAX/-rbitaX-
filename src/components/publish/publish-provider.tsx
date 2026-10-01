"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  CircleDot,
  Clapperboard,
  Columns2,
  FileText,
  Globe2,
  ImagePlus,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Music2,
  PenSquare,
  PlaySquare,
  Radio,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { publishPost, type PostVisibility } from "@/lib/publish-post";
import { deleteDraft, listDrafts, saveDraft, type PostDraft } from "@/lib/post-drafts";
import { createMomentFromFile } from "@/components/personal-stories";

type Me = { id: string; name: string; avatarUrl: string | null };
type Item = { file: File; url: string; kind: "image" | "video" | "audio" };
type EditorStart = { pick?: "media" | "image" | "video" };

const Ctx = createContext<{ openPublish: () => void; openPost: (start?: EditorStart) => void }>({
  openPublish: () => {},
  openPost: () => {},
});

export function usePublish() {
  return useContext(Ctx);
}

/** Botão que abre o menu "Publicar" (usado no perfil). */
export function PublishButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { openPublish } = usePublish();
  return (
    <button type="button" onClick={openPublish} className={className}>
      {children}
    </button>
  );
}

const VISIBILITY: { id: PostVisibility; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "public", label: "Público", hint: "Qualquer pessoa", icon: Globe2 },
  { id: "followers", label: "Seguidores", hint: "Só quem segue você", icon: Users },
  { id: "private", label: "Somente eu", hint: "Só você vê", icon: Lock },
];

/**
 * "Publicar" no estilo app: um menu com História, Post, Foto, Vídeos e Clipe, e o editor de
 * post em duas telas (Novo post → Publicação). Montado no layout do app.
 */
export function PublishProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  const [sheet, setSheet] = useState(false);
  const [editor, setEditor] = useState<EditorStart | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const storyInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2800);
  }, []);

  const ctx = useMemo(
    () => ({
      openPublish: () => setSheet(true),
      openPost: (start: EditorStart = {}) => {
        setSheet(false);
        setEditor(start);
      },
    }),
    []
  );

  async function story(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStoryBusy(true);
    try {
      await createMomentFromFile(me.id, file);
      flash("História publicada! Fica no ar por 24h.");
      router.refresh();
    } catch (err) {
      flash(err instanceof Error && err.message ? err.message : "Não foi possível publicar a história.");
    }
    setStoryBusy(false);
  }

  const options: { label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string; soon?: boolean }[] = [
    { label: "História", icon: CircleDot, onClick: () => { setSheet(false); storyInput.current?.click(); } },
    { label: "Post", icon: PenSquare, onClick: () => ctx.openPost() },
    { label: "Foto", icon: ImageIcon, onClick: () => ctx.openPost({ pick: "image" }) },
    { label: "Vídeos", icon: PlaySquare, onClick: () => ctx.openPost({ pick: "video" }) },
    { label: "Clipe", icon: Clapperboard, href: "/videos" },
    { label: "Transmissão", icon: Radio, soon: true },
  ];

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <input ref={storyInput} type="file" accept="image/*,video/*" hidden onChange={story} />

      {sheet &&
        createPortal(
          <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Publicar">
            <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setSheet(false)} />
            <div className="animate-sheet-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-space-surface pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[380px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border">
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/15 md:hidden" />
              <p className="px-5 pb-3 pt-4 font-display text-xl font-bold text-white">Publicar</p>
              <div className="mx-5 border-t border-white/10" />
              <ul className="py-2">
                {options.map((o) => {
                  const inner = (
                    <>
                      <o.icon className="h-6 w-6 text-orbit-blue" />
                      <span className="flex-1 text-[16px] text-white">{o.label}</span>
                      {o.soon && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">em breve</span>}
                      {o.label === "História" && storyBusy && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
                    </>
                  );
                  const cls = clsx("flex w-full items-center gap-4 px-5 py-3.5 text-left transition", o.soon ? "cursor-default opacity-50" : "hover:bg-white/[0.04] active:bg-white/[0.06]");
                  return (
                    <li key={o.label}>
                      {o.href ? (
                        <Link href={o.href} onClick={() => setSheet(false)} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button type="button" disabled={o.soon} onClick={o.onClick} className={cls}>
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body
        )}

      {editor && (
        <PostEditor
          me={me}
          start={editor}
          onClose={() => setEditor(null)}
          onPublished={(msg) => {
            setEditor(null);
            flash(msg);
            router.refresh();
          }}
          onDraftSaved={() => {
            setEditor(null);
            flash("Rascunho salvo neste aparelho.");
          }}
        />
      )}

      {notice &&
        createPortal(
          <button
            type="button"
            role="status"
            onClick={() => setNotice(null)}
            className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-white/10 bg-space-surface/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur md:bottom-6"
          >
            {notice}
          </button>,
          document.body
        )}
    </Ctx.Provider>
  );
}

const MAX_FILES = 10;
// "Quando publicar" depende da coluna Post.publishAt (migração 20261001020000_post_scheduling).
// Fica desligado até a migração ser aplicada no banco.
const SCHEDULING_ENABLED = false;
const kindOf = (f: { type: string }): Item["kind"] => (f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image");

function PostEditor({
  me,
  start,
  onClose,
  onPublished,
  onDraftSaved,
}: {
  me: Me;
  start: EditorStart;
  onClose: () => void;
  onPublished: (message: string) => void;
  onDraftSaved: () => void;
}) {
  const [step, setStep] = useState<"write" | "publish">("write");
  const [content, setContent] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [panel, setPanel] = useState<"location" | "visibility" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toStory, setToStory] = useState(false);
  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Abre já no seletor certo (Foto / Vídeos) ou no texto (Post).
  useEffect(() => {
    listDrafts(me.id).then(setDrafts);
    if (start.pick) {
      if (mediaInput.current) mediaInput.current.accept = start.pick === "image" ? "image/*" : start.pick === "video" ? "video/*" : "image/*,video/*";
      mediaInput.current?.click();
    } else textRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [me.id, start.pick]);

  // Libera as prévias da memória ao fechar.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function addFiles(list: File[]) {
    setItems((prev) => [...prev, ...list.map((file) => ({ file, url: URL.createObjectURL(file), kind: kindOf(file) }))].slice(0, MAX_FILES));
  }
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
    if (mediaInput.current) mediaInput.current.accept = "image/*,video/*";
  }
  function removeAt(i: number) {
    setItems((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });
  }

  const canNext = content.trim().length > 0 || items.length > 0;
  const visual = items.filter((i) => i.kind !== "audio");
  const audio = items.filter((i) => i.kind === "audio");
  const vis = VISIBILITY.find((v) => v.id === visibility)!;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      await publishPost({ userId: me.id, content, files: items.map((i) => i.file), location, visibility, publishAt });
      // "Publicar na história": a primeira foto/vídeo também vira história de 24h.
      const firstVisual = items.find((i) => i.kind !== "audio");
      if (toStory && firstVisual) await createMomentFromFile(me.id, firstVisual.file).catch(() => {});
      if (draftId) await deleteDraft(draftId);
      onPublished(publishAt ? `Agendado: ${scheduleLabel(publishAt)}. Só você vê até lá.` : "Publicado!");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível publicar. Tente novamente.");
      setBusy(false);
    }
  }

  // Fechar com algo escrito ou escolhido pergunta se quer salvar o rascunho.
  function requestClose() {
    if (canNext) setConfirmClose(true);
    else onClose();
  }

  async function keepDraft() {
    setBusy(true);
    try {
      await saveDraft({
        id: draftId ?? crypto.randomUUID(),
        userId: me.id,
        content,
        location,
        visibility,
        files: items.map((i) => ({ name: i.file.name, type: i.file.type, blob: i.file })),
        updatedAt: Date.now(),
      });
      onDraftSaved();
    } catch {
      setError("Não foi possível salvar o rascunho neste aparelho.");
      setBusy(false);
    }
  }

  function loadDraft(d: PostDraft) {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setContent(d.content);
    setLocation(d.location);
    setVisibility(d.visibility);
    setDraftId(d.id);
    setItems(d.files.map((f) => {
      const file = new File([f.blob], f.name, { type: f.type });
      return { file, url: URL.createObjectURL(file), kind: kindOf(f) };
    }));
    setDraftsOpen(false);
  }

  const mediaRow = (removable: boolean, tall: boolean) =>
    visual.length > 0 && (
      <div className={clsx("no-scrollbar flex gap-1 overflow-x-auto", tall ? "h-[300px] md:h-[340px]" : "h-[260px]")}>
        {visual.map((it) => {
          const index = items.indexOf(it);
          return (
            <div key={it.url} className="relative h-full shrink-0 overflow-hidden rounded-lg bg-space-card first:rounded-l-none md:first:rounded-l-lg">
              {it.kind === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={it.url} muted playsInline className="h-full w-auto max-w-[80vw] object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt="" className="h-full w-auto max-w-[80vw] object-cover" />
              )}
              {visual.length > 1 && <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-snow">{visual.indexOf(it) + 1}</span>}
              {removable && (
                <button type="button" onClick={() => removeAt(index)} aria-label="Remover" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-snow backdrop-blur hover:bg-black/75">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );

  const row = (icon: React.ReactNode, label: string, value: string | null, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]">
      <span className="text-white/60">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] text-white">{label}</span>
        {value && <span className="block truncate text-sm text-white/50">{value}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-white/35" />
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[66] flex justify-center bg-black/60 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Novo post">
      <div className="flex h-[100dvh] w-full flex-col bg-space-surface md:h-[min(860px,92vh)] md:max-w-xl md:overflow-hidden md:rounded-3xl md:border md:border-white/10">
        <input ref={mediaInput} type="file" accept="image/*,video/*" multiple hidden onChange={onPick} />
        <input ref={audioInput} type="file" accept="audio/*" hidden onChange={onPick} />

        {step === "write" ? (
          <>
            <header className="flex h-16 shrink-0 items-center gap-4 px-4 pt-[env(safe-area-inset-top)]">
              <button type="button" onClick={requestClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/85 hover:bg-white/5">
                <X className="h-6 w-6" />
              </button>
              <h2 className="flex-1 font-display text-xl font-bold text-white">Novo post</h2>
              <button type="button" disabled={!canNext} onClick={() => setStep("publish")} className="px-1 text-[16px] font-semibold text-white disabled:text-white/35">
                Próximo
              </button>
            </header>

            <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto">
              {mediaRow(true, true)}
              {visual.length > 1 && (
                <p className="flex items-center gap-2 px-5 pt-3 text-sm font-medium text-white/80">
                  <Columns2 className="h-4 w-4" /> Carrossel
                </p>
              )}
              {audio.map((a) => (
                <div key={a.url} className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Music2 className="h-5 w-5 text-chat" />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/80">{a.file.name}</span>
                  <button type="button" onClick={() => removeAt(items.indexOf(a))} aria-label="Remover música" className="text-white/50 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
                placeholder="Escreva alguma coisa..."
                className="min-h-[200px] w-full resize-none bg-transparent px-5 py-4 text-[17px] leading-relaxed text-white outline-none placeholder:text-white/35"
              />
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => mediaInput.current?.click()}
                disabled={items.length >= MAX_FILES}
                className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-4 py-2.5 text-[15px] font-medium text-white transition hover:bg-white/[0.12] disabled:opacity-40"
              >
                <ImagePlus className="h-5 w-5" /> Foto/Vídeo
              </button>
              {drafts.length > 0 && (
                <button type="button" onClick={() => setDraftsOpen(true)} className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-4 py-2.5 text-[15px] font-medium text-white transition hover:bg-white/[0.12]">
                  <FileText className="h-5 w-5" /> Rascunhos ({drafts.length})
                </button>
              )}
            </footer>
          </>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center gap-4 px-4 pt-[env(safe-area-inset-top)]">
              <button type="button" onClick={() => setStep("write")} aria-label="Voltar" className="rounded-full p-1.5 text-white/85 hover:bg-white/5">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h2 className="flex-1 font-display text-xl font-bold text-white">Publicação</h2>
            </header>

            <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto">
              {mediaRow(false, false)}
              {content.trim() && (
                <button type="button" onClick={() => setStep("write")} className="line-clamp-3 w-full px-5 py-4 text-left text-[15px] text-white/60">
                  {content}
                </button>
              )}
              <div className="border-t border-white/10" />
              {row(<MapPin className="h-6 w-6" />, "Local", location || null, () => setPanel("location"))}
              {row(<Music2 className="h-6 w-6" />, "Música", audio.length ? audio.map((a) => a.file.name).join(", ") : null, () => audioInput.current?.click())}
              <div className="mx-5 border-t border-white/10" />
              {SCHEDULING_ENABLED &&
                row(<CalendarClock className="h-6 w-6" />, "Quando publicar", publishAt ? scheduleLabel(publishAt) : "Agora", () => setScheduleOpen(true))}
              {row(<vis.icon className="h-6 w-6" />, "Quem verá este post", vis.label, () => setPanel("visibility"))}
              {visual.length > 0 && (
                <>
                  <div className="mx-5 border-t border-white/10" />
                  <label className="flex cursor-pointer items-center gap-4 px-5 py-4">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] text-white">Publicar na história</span>
                      <span className="block text-sm text-white/50">A primeira foto ou vídeo também fica 24h nas histórias</span>
                    </span>
                    <input type="checkbox" checked={toStory} onChange={(e) => setToStory(e.target.checked)} className="peer sr-only" />
                    <span className="relative h-8 w-14 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-orbit-blue peer-focus-visible:ring-2 peer-focus-visible:ring-orbit-blue/60 after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-snow after:transition peer-checked:after:translate-x-6" />
                  </label>
                </>
              )}
              {error && <p className="mx-5 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            </div>

            <footer className="shrink-0 space-y-2.5 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={publish}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient text-[16px] font-semibold text-snow shadow-glow transition active:scale-[0.99] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />} {busy ? "Publicando..." : publishAt ? "Agendar publicação" : "Publicar"}
              </button>
              <button
                type="button"
                onClick={keepDraft}
                disabled={busy}
                className="h-12 w-full rounded-2xl bg-white/[0.07] text-[16px] font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-60"
              >
                Salvar o rascunho
              </button>
            </footer>
          </>
        )}

        {scheduleOpen && (
          <ScheduleDialog
            value={publishAt}
            onCancel={() => setScheduleOpen(false)}
            onDone={(d) => {
              setPublishAt(d);
              setScheduleOpen(false);
            }}
          />
        )}

        {confirmClose && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6" onMouseDown={(e) => e.target === e.currentTarget && setConfirmClose(false)}>
            <div role="alertdialog" aria-label="Salvar o rascunho?" className="animate-pop-in w-full max-w-sm rounded-3xl border border-white/10 bg-space-surface p-6 shadow-2xl">
              <p className="font-display text-xl font-bold text-white">Salvar o rascunho?</p>
              <p className="mt-1 text-sm text-white/55">Você pode continuar depois pelos Rascunhos, neste aparelho.</p>
              <div className="mt-5 flex flex-col items-end gap-1">
                <button type="button" onClick={() => { setConfirmClose(false); keepDraft(); }} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white hover:bg-white/5">
                  Salvar
                </button>
                <button type="button" onClick={onClose} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white hover:bg-white/5">
                  Sair sem salvar
                </button>
                <button type="button" onClick={() => setConfirmClose(false)} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-red-400 hover:bg-red-500/5">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Painéis: local, quem pode ver, rascunhos */}
        {panel === "location" && (
          <Sheet title="Local" onClose={() => setPanel(null)}>
            <input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={80}
              placeholder="Ex.: Aracaju, SE"
              onKeyDown={(e) => e.key === "Enter" && setPanel(null)}
              className="w-full rounded-xl border border-white/10 bg-space-bg/60 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
            />
            <div className="mt-3 flex gap-2">
              {location && (
                <button type="button" onClick={() => { setLocation(""); setPanel(null); }} className="flex-1 rounded-xl bg-white/[0.07] py-2.5 text-sm font-medium text-white/80">
                  Remover
                </button>
              )}
              <button type="button" onClick={() => setPanel(null)} className="flex-1 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-snow">
                Pronto
              </button>
            </div>
          </Sheet>
        )}
        {panel === "visibility" && (
          <Sheet title="Quem pode ver" onClose={() => setPanel(null)}>
            {VISIBILITY.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVisibility(v.id); setPanel(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-white/[0.04]"
              >
                <v.icon className="h-5 w-5 text-white/60" />
                <span className="flex-1">
                  <span className="block text-[15px] text-white">{v.label}</span>
                  <span className="block text-xs text-white/45">{v.hint}</span>
                </span>
                <span className={clsx("h-5 w-5 rounded-full border-2", visibility === v.id ? "border-orbit-blue bg-orbit-blue shadow-[inset_0_0_0_3px_rgb(var(--c-space-surface,11_14_28))]" : "border-white/25")} />
              </button>
            ))}
          </Sheet>
        )}
        {draftsOpen && (
          <Sheet title="Rascunhos" onClose={() => setDraftsOpen(false)}>
            <ul className="space-y-1">
              {drafts.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                  <button type="button" onClick={() => loadDraft(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-space-card text-white/40">
                      {d.files[0]?.type.startsWith("image") ? (
                        <DraftThumb blob={d.files[0].blob} />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] text-white">{d.content.trim() || (d.files.length ? `${d.files.length} arquivo(s)` : "Sem texto")}</span>
                      <span className="block text-xs text-white/45">{new Date(d.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Apagar rascunho"
                    onClick={async () => {
                      await deleteDraft(d.id);
                      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
                      if (drafts.length <= 1) setDraftsOpen(false);
                    }}
                    className="rounded-full p-2 text-white/45 hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
      </div>
    </div>,
    document.body
  );
}

function DraftThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-end bg-black/50 md:items-center md:justify-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-sheet-up w-full rounded-t-3xl border-t border-white/10 bg-space-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:mx-6 md:rounded-3xl md:border">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-white">{title}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/55 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** "Hoje às 16:47", "Amanhã às 09:00" ou "12 out. às 20:30". */
function scheduleLabel(d: Date) {
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const name = diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${name} às ${time}`;
}

/** Escolha de dia (hoje até 30 dias) e hora para agendar a publicação. */
function ScheduleDialog({ value, onCancel, onDone }: { value: Date | null; onCancel: () => void; onDone: (d: Date | null) => void }) {
  const base = value ?? new Date(Date.now() + 60 * 60 * 1000);
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  const startOfBase = new Date(base);
  startOfBase.setHours(0, 0, 0, 0);
  const [dayIndex, setDayIndex] = useState(Math.max(0, days.findIndex((d) => d.getTime() === startOfBase.getTime())));
  const [time, setTime] = useState(base.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [error, setError] = useState<string | null>(null);

  function done() {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(days[dayIndex]);
    d.setHours(h || 0, m || 0, 0, 0);
    if (d.getTime() < Date.now() + 2 * 60 * 1000) return setError("Escolha um horário daqui a pelo menos alguns minutos.");
    onDone(d);
  }

  const field = "w-full appearance-none rounded-xl border border-white/10 bg-space-bg/60 px-4 py-3.5 text-[16px] text-white outline-none focus:border-orbit-purple/60";
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="dialog" aria-label="Quando publicar" className="animate-pop-in w-full max-w-sm rounded-3xl border border-white/10 bg-space-surface p-6 shadow-2xl">
        <p className="font-display text-xl font-bold text-white">Quando publicar</p>
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <select value={dayIndex} onChange={(e) => { setDayIndex(Number(e.target.value)); setError(null); }} className={field} aria-label="Dia">
            {days.map((d, i) => (
              <option key={i} value={i}>
                {i === 0 ? "Hoje" : i === 1 ? "Amanhã" : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </option>
            ))}
          </select>
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(null); }} className={`${field} w-[120px]`} aria-label="Hora" />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-2">
          {value ? (
            <button type="button" onClick={() => onDone(null)} className="rounded-xl px-3 py-2.5 text-[15px] font-medium text-white/60 hover:bg-white/5">
              Publicar agora
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-1">
            <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white hover:bg-white/5">
              Cancelar
            </button>
            <button type="button" onClick={done} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-orbit-blue hover:bg-white/5">
              Pronto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
