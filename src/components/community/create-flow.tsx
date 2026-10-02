"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { ACCEPT, communityError, uploadCommunityFile, type Album } from "@/lib/communities";
import { useCommunity } from "./context";
import { Composer, CreateMenu, type CreateKind } from "./composer";
import { EventForm } from "./events";
import { StoryComposer } from "./stories";
import { Sheet } from "./ui";

export type Created = { id: string; status: string; kind: CreateKind };

/**
 * "+ Criar" and every form behind it (post, story, discussion, event, album, announcement…), shared by
 * the community hub and its inner pages.
 */
export function useCreateFlow({ albums = [], onCreated }: { albums?: Album[]; onCreated: (r: Created) => void }) {
  const [menu, setMenu] = useState(false);
  const [kind, setKind] = useState<CreateKind | null>(null);
  const [albumTarget, setAlbumTarget] = useState<string | null>(null);
  const [albumEdit, setAlbumEdit] = useState<Album | null>(null);
  const [suggest, setSuggest] = useState(false);

  const start = (k: CreateKind, opts?: { album?: string | null; editAlbum?: Album | null }) => {
    setMenu(false);
    setAlbumTarget(opts?.album ?? null);
    setAlbumEdit(opts?.editAlbum ?? null);
    setSuggest(false);
    setKind(k);
  };
  /** "Sugerir post": o editor de publicação, enviando para a administração aprovar. */
  const startSuggest = () => {
    setMenu(false);
    setSuggest(true);
    setKind("post");
  };
  const close = () => (setKind(null), setSuggest(false));
  const composerKind = kind && kind !== "story" && kind !== "event" && kind !== "album" ? kind : null;

  const element = (
    <>
      <CreateMenu open={menu} onClose={() => setMenu(false)} onPick={(k) => start(k)} />
      <Composer kind={composerKind} suggest={suggest} onClose={close} onCreated={onCreated} albums={albums} defaultAlbum={albumTarget} />
      <StoryComposer open={kind === "story"} onClose={close} onCreated={() => onCreated({ id: "", status: "visible", kind: "story" })} />
      <EventForm open={kind === "event"} onClose={close} onSaved={(id) => onCreated({ id, status: "visible", kind: "event" })} />
      <AlbumForm open={kind === "album"} album={albumEdit} onClose={close} onSaved={(id) => onCreated({ id, status: "visible", kind: "album" })} />
    </>
  );
  return { openMenu: () => setMenu(true), start, startSuggest, element };
}

export function AlbumForm({ open, album, onClose, onSaved }: { open: boolean; album?: Album | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(album?.title ?? "");
    setDescription(album?.description ?? "");
    setCover(album?.coverUrl ?? null);
  }, [open, album]);

  async function upload(f: File | undefined) {
    if (!f || !viewer) return;
    setUploading(true);
    try {
      setCover((await uploadCommunityFile(supabase, viewer.id, community.id, f, "image")).url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha no envio da imagem.", true);
    }
    setUploading(false);
  }

  async function save() {
    setBusy(true);
    const { data, error } = await supabase.rpc("community_save_album", {
      p_community: community.id,
      p_id: album?.id ?? null,
      p_title: title.trim(),
      p_description: description.trim(),
      p_cover: cover,
    });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    toast(album ? "Álbum atualizado." : "Álbum criado. Envie as primeiras fotos!");
    onSaved(data as string);
    onClose();
  }

  const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={album ? "Editar álbum" : "Novo álbum"}>
      <div className="space-y-3 pt-1">
        <button type="button" onClick={() => input.current?.click()} className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span className="relative flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {cover ? "Trocar capa" : "Capa do álbum (opcional)"}
          </span>
        </button>
        <input ref={input} type="file" hidden accept={ACCEPT.image} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Nome do álbum" autoFocus className={field} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Descrição (opcional)" className={`${field} resize-none`} />
        <button type="button" onClick={save} disabled={!title.trim() || busy || uploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar álbum
        </button>
      </div>
    </Sheet>
  );
}
