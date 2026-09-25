"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, Camera, Check, Clock, Loader2, MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { runFriendAction } from "@/components/friend-button";
import { compressImage } from "@/lib/messenger/media";
import type { ChatUser } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { FriendPicker, useFriends } from "./dialogs";
import { ChatAvatar, Modal, PrimaryButton } from "./ui";

type Result = ChatUser & { friendState: string };

/** Uploads a group photo to the public "media" bucket (the person's own folder) and returns its URL. */
export async function uploadGroupPhoto(
  supabase: ReturnType<typeof useMessenger>["supabase"],
  meId: string,
  file: File
): Promise<string | null> {
  const { blob, mime } = await compressImage(file);
  const path = `${meId}/grupo-${crypto.randomUUID()}.${mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg"}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: mime, cacheControl: "31536000" });
  if (error) return null;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

function PersonRow({ u, onChat }: { u: Result; onChat: (u: ChatUser) => void }) {
  const [state, setState] = useState(u.friendState);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const next = await runFriendAction("send", u.id);
    setBusy(false);
    if (next) setState(next);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
      <Link href={`/perfil/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ChatAvatar name={u.name} url={u.avatarUrl} size={44} presence={u.presence ?? "offline"} ringClass="border-space-surface" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{u.name}</span>
          <span className="block truncate text-xs text-white/45">@{u.username}</span>
        </span>
      </Link>
      {state === "friends" ? (
        <button
          type="button"
          onClick={() => onChat(u)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-3.5 py-1.5 text-xs font-semibold text-snow shadow-glow"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Conversar
        </button>
      ) : state === "outgoing" ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55">
          <Clock className="h-3.5 w-3.5" /> Pedido enviado
        </span>
      ) : state === "incoming" ? (
        <Link href="/amigos" className="shrink-0 rounded-full border border-orbit-purple/50 px-3 py-1.5 text-xs font-semibold text-orbit-purple">
          Responder pedido
        </Link>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/5"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Adicionar amigo
        </button>
      )}
    </div>
  );
}

/** "Nova conversa": global search (same as Explorar) + friends + new group. */
export function NewConversationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase, me, startDirect, openConversation, reloadConversations, toast } = useMessenger();
  const [step, setStep] = useState<"search" | "group-members" | "group-details">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const friends = useFriends(open);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("search");
    setQuery("");
    setResults(null);
    setSelected([]);
    setGroupName("");
    setPhoto(null);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_profiles", { search_query: q, limit_count: 20 });
      setResults(((data ?? []) as Result[]).filter((u) => u.id !== me.id));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, supabase, me.id]);

  async function chat(u: ChatUser) {
    onClose();
    await startDirect(u);
  }

  async function createGroup() {
    setCreating(true);
    let avatarUrl: string | null = null;
    if (photo) avatarUrl = await uploadGroupPhoto(supabase, me.id, photo.file);
    const { data: id, error } = await supabase.rpc("create_group", {
      p_name: groupName.trim(),
      p_member_ids: selected.map((u) => u.id),
      p_avatar_url: avatarUrl,
    });
    setCreating(false);
    if (error || !id) {
      toast("Não foi possível criar o grupo. Confira se todos ainda são seus amigos.", "error");
      return;
    }
    await reloadConversations();
    onClose();
    openConversation(id);
  }

  const title =
    step === "search" ? (
      "Nova conversa"
    ) : (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep(step === "group-details" ? "group-members" : "search")}
          aria-label="Voltar"
          className="-ml-1 rounded-full p-1 text-white/60 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {step === "group-members" ? "Novo grupo · Participantes" : "Novo grupo"}
      </span>
    );

  const footer =
    step === "group-members" ? (
      <PrimaryButton disabled={!selected.length} onClick={() => setStep("group-details")}>
        Avançar{selected.length ? ` (${selected.length})` : ""}
      </PrimaryButton>
    ) : step === "group-details" ? (
      <PrimaryButton disabled={!groupName.trim() || creating} onClick={createGroup}>
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Criar grupo
      </PrimaryButton>
    ) : undefined;

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      {step === "search" && (
        <>
          <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 focus-within:border-orbit-purple/60">
            <Search className="h-4 w-4 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pessoas por nome ou @usuário"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            {searching && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
          </label>

          {results === null ? (
            <>
              <button
                type="button"
                onClick={() => setStep("group-members")}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orbit-cyan to-orbit-blue text-snow">
                  <Users className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">Novo grupo</span>
                  <span className="block text-xs text-white/45">Converse com vários amigos ao mesmo tempo</span>
                </span>
              </button>
              <p className="mb-1 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Seus amigos</p>
              {friends === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : friends.length === 0 ? (
                <p className="px-2 py-4 text-sm text-white/50">
                  Quando alguém aceitar seu pedido de amizade, vocês poderão conversar aqui. Busque pessoas acima.
                </p>
              ) : (
                friends.map((f) => <PersonRow key={f.id} u={{ ...f, friendState: "friends" }} onChat={chat} />)
              )}
            </>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/45">Ninguém encontrado com “{query.trim()}”.</p>
          ) : (
            <div className="mt-3 space-y-0.5">
              {results.map((u) => (
                <PersonRow key={u.id} u={u} onChat={chat} />
              ))}
              <p className="px-2 pt-3 text-[11px] text-white/40">O chat é liberado entre amigos, quando o pedido de amizade é aceito.</p>
            </div>
          )}
        </>
      )}

      {step === "group-members" && (
        <>
          {selected.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected((s) => s.filter((x) => x.id !== u.id))}
                  className="flex items-center gap-1.5 rounded-full bg-orbit-purple/15 py-1 pl-1 pr-2.5 text-xs font-medium text-white"
                >
                  <ChatAvatar name={u.name} url={u.avatarUrl} size={22} /> {u.name.split(" ")[0]} ×
                </button>
              ))}
            </div>
          )}
          <FriendPicker
            friends={friends}
            selected={selected.map((u) => u.id)}
            onToggle={(u) => setSelected((s) => (s.some((x) => x.id === u.id) ? s.filter((x) => x.id !== u.id) : [...s, u]))}
          />
        </>
      )}

      {step === "group-details" && (
        <div className="pt-2">
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setPhoto({ file: f, url: URL.createObjectURL(f) });
            }}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              aria-label="Foto do grupo"
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orbit-blue/70 via-orbit-purple/70 to-orbit-pink/60 text-snow"
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-7 w-7" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] font-medium">{photo ? "Trocar" : "Foto"}</span>
            </button>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-white/55">Nome do grupo</label>
              <input
                autoFocus
                value={groupName}
                maxLength={60}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex.: Tripulação ÓrbitaX"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
              />
            </div>
          </div>
          <p className="mt-5 text-xs font-medium text-white/55">
            {selected.length + 1} participantes (você e {selected.length} {selected.length === 1 ? "amigo" : "amigos"})
          </p>
          <div className="mt-2 flex -space-x-2">
            {[me, ...selected].slice(0, 12).map((u) => (
              <span key={u.id} className={clsx("rounded-full ring-2 ring-space-surface")}>
                <ChatAvatar name={u.name} url={u.avatarUrl} size={34} />
              </span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
