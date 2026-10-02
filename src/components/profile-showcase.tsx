"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { clsx } from "clsx";
import { Gift, Image as ImageIcon, Pin, Play, PlaySquare, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { ProfileGiftButton } from "@/components/profile-gift-button";
import { PublishButton } from "@/components/publish/publish-provider";
import { commentDate } from "@/components/comments/comment-kit";
import { useProfilePhotoPreview } from "@/components/profile-photos";

type Media = { id: string; type: string; url: string };

/** Abre a foto no visualizador da aba Fotos (sem recarregar a página). */
function openPhoto(e: React.MouseEvent, id: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  window.history.replaceState(null, "", `?foto=${encodeURIComponent(id)}`);
  window.location.hash = "tab-fotos";
}

/** Topo dos posts, como no VK: abas Foto/Vídeo com um mosaico 3×2 e "Mostrar tudo"; e "Criar entrada". */
export function ProfileMediaShowcase({
  photos: feedPhotos,
  videos,
  isMe,
  userId,
  className,
}: {
  photos: Media[];
  videos: Media[];
  isMe: boolean;
  /** Dono do perfil: com ele a vitrine mostra as fixadas primeiro e esconde as arquivadas. */
  userId?: string;
  className?: string;
}) {
  const preview = useProfilePhotoPreview(userId);
  const photos: (Media & { pinnedAt?: string | null })[] = preview ?? feedPhotos;
  const [tab, setTab] = useState<"foto" | "video">(feedPhotos.length || !videos.length ? "foto" : "video");
  const items = (tab === "foto" ? photos : videos).slice(0, 6);
  const hasMedia = photos.length > 0 || videos.length > 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {hasMedia && (
        <section className={clsx("ox-card rounded-2xl border border-white/10 bg-space-surface p-3 md:p-4", className)}>
          <div className="mb-3 flex gap-1">
            {(
              [
                ["foto", "Foto", ImageIcon, photos.length],
                ["video", "Vídeo", PlaySquare, videos.length],
              ] as const
            ).map(([id, label, Icon, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                disabled={!n}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-35",
                  tab === id ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl">
            {items.map((m) =>
              m.type === "video" ? (
                <a key={m.id} href="#tab-videos" className="relative block aspect-square bg-black">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={m.url} preload="metadata" muted className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-7 w-7 fill-snow text-snow drop-shadow" />
                  </span>
                </a>
              ) : (
                <a key={m.id} href={`?foto=${m.id}#tab-fotos`} onClick={(e) => openPhoto(e, m.id)} className="relative block aspect-square overflow-hidden bg-space-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                  {!!(m as { pinnedAt?: string | null }).pinnedAt && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-snow backdrop-blur-sm" title="Fixada">
                      <Pin className="h-3.5 w-3.5 fill-snow" />
                    </span>
                  )}
                </a>
              )
            )}
          </div>
          <a
            href={tab === "foto" ? "#tab-fotos" : "#tab-videos"}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/[0.05] py-2 text-sm font-medium text-orbit-blue transition hover:bg-white/[0.08]"
          >
            Mostrar tudo
          </a>
        </section>
      )}
      {isMe && (
        <PublishButton className="ox-card flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-space-surface py-3 text-sm font-medium text-orbit-blue transition hover:bg-white/[0.03]">
          <span className="text-lg leading-none">+</span> Criar publicação
        </PublishButton>
      )}
    </div>
  );
}

type GiftRow = {
  id: string;
  note: string | null;
  createdAt: string;
  sender: { id: string; name: string; username: string; avatarUrl: string | null } | null;
  product: { name: string; image: string | null } | null;
};

/**
 * Presentes do perfil. O banco só mostra um presente a quem enviou ou recebeu: no próprio perfil
 * aparecem todos os recebidos; no de outra pessoa, os que você mandou para ela.
 */
export function ProfileGiftsCard({ user, isMe, viewerId }: { user: { id: string; name: string; username: string; avatarUrl: string | null }; isMe: boolean; viewerId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [gifts, setGifts] = useState<GiftRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [publicGifts, setPublicGifts] = useState(false);

  useEffect(() => {
    if (!viewerId) return;
    // Com a função pública (migração profile_gifts) todos veem os presentes do perfil;
    // sem ela, o banco mostra só os que envolvem quem está vendo.
    supabase.rpc("profile_gifts" as never, { p_user: user.id, p_limit: 100 } as never).then(({ data, error }) => {
      if (!error) {
        setPublicGifts(true);
        setGifts((data ?? []) as unknown as GiftRow[]);
        return;
      }
      loadOwn();
    });
    function loadOwn() {
    supabase
      .from("VirtualGift")
      .select("id, note, createdAt, sender:User!VirtualGift_senderId_fkey(id, name, username, avatarUrl), product:StoreProduct!VirtualGift_productId_fkey(name, image)")
      .eq("recipientId", user.id)
      .order("createdAt", { ascending: false })
      .limit(100)
      .then(({ data }) => setGifts((data ?? []) as unknown as GiftRow[]));
    }
  }, [supabase, user.id, viewerId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!viewerId || gifts === null) return null;
  if (isMe && gifts.length === 0) return null;
  const first = user.name.split(" ")[0];
  const art = (g: GiftRow, size: string) =>
    g.product?.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={g.product.image} alt={g.product.name} className={clsx(size, "object-contain")} />
    ) : (
      <span className={clsx(size, "flex items-center justify-center rounded-2xl bg-white/[0.05]")}>
        <Gift className="h-1/2 w-1/2 text-orbit-cyan" />
      </span>
    );

  return (
    <section className="ox-card rounded-2xl border border-white/10 bg-space-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          {isMe || publicGifts ? "Presentes" : `Seus presentes para ${first}`}
          {gifts.length > 0 && <span className="ml-1.5 font-normal text-white/45">{gifts.length}</span>}
        </h2>
        {gifts.length > 0 && (
          <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-pa hover:underline">
            Ver todos
          </button>
        )}
      </div>
      {gifts.length > 0 ? (
        <button type="button" onClick={() => setOpen(true)} className="grid w-full grid-cols-3 gap-2">
          {gifts.slice(0, 3).map((g) => (
            <span key={g.id} className="flex aspect-square items-center justify-center" title={g.product?.name}>
              {art(g, "h-full w-full")}
            </span>
          ))}
        </button>
      ) : (
        <p className="text-[13px] text-white/50">Surpreenda {first} com um presente em Diamantes.</p>
      )}
      {!isMe && (
        <div className="mt-3 [&>button]:w-full">
          <ProfileGiftButton recipient={user} label="Enviar presente" />
        </div>
      )}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/60 backdrop-blur-[2px] md:items-center md:p-6" onClick={() => setOpen(false)} role="presentation">
            <div role="dialog" aria-label="Presentes" onClick={(e) => e.stopPropagation()} className="animate-pop-in flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-space-surface shadow-2xl md:rounded-3xl">
              <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-5 py-4">
                <h2 className="flex-1 text-base font-semibold text-white">
                  {isMe ? "Seus presentes" : publicGifts ? `Presentes de ${first}` : `Seus presentes para ${first}`} <span className="font-normal text-white/45">{gifts.length}</span>
                </h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5">
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain px-5">
                {gifts.map((g) => (
                  <article key={g.id} className="py-5">
                    {g.sender && (
                      <Link href={`/perfil/${g.sender.username}`} className="flex items-center gap-3">
                        <Avatar name={g.sender.name} url={g.sender.avatarUrl} size={40} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-orbit-blue">{g.sender.name}</span>
                          <span className="block text-xs text-white/45">{commentDate(g.createdAt)}</span>
                        </span>
                      </Link>
                    )}
                    <div className="mt-3 flex justify-center">{art(g, "h-40 w-40")}</div>
                    {g.note && <p className="mt-3 text-center text-sm text-white/80">{g.note}</p>}
                    {isMe && g.sender && g.sender.id !== viewerId && (
                      <div className="mt-3 flex justify-center [&>button]:px-4">
                        <ProfileGiftButton recipient={g.sender} label="Agradecer com um presente" />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
