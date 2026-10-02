"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  ImageOff,
  Images,
  Link2,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseDbDate, type ReactionKey } from "@/lib/communities";
import { summarizeReactions } from "@/lib/post-reactions";
import { saveAvatarUrl } from "@/lib/avatar-upload";
import { Avatar } from "@/components/post-card";
import { ReactionButton, ReactorsSheet } from "@/components/reactions";
import { CommentsSheet } from "@/components/comments/comments-sheet";
import { PublishButton } from "@/components/publish/publish-provider";

type Owner = { id: string; name: string; username: string; avatarUrl: string | null };

type Photo = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  post: { id: string; content: string | null; createdAt: string };
};

type AlbumId = "all" | "avatar" | "wall";

const PAGE = 48;
const COLUMNS = "id, url, width, height, createdAt, post:Post!inner(id, content, createdAt, authorId, communityId, isArchived)";
// Fotos de perfil ficam em ".../avatar/..." (envio antigo) ou ".../posts/avatar-..." (editor novo).
const AVATAR_PATTERNS = ["%/avatar/%", "%/posts/avatar-%"];

const ALBUM_LABEL: Record<AlbumId, string> = { all: "Todas as fotos", avatar: "Fotos do perfil", wall: "Fotos no muro" };

const isAvatarPhoto = (url: string) => url.includes("/avatar/") || url.includes("/posts/avatar-");

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

function longDate(iso: string) {
  const d = parseDbDate(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
  return `${date} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Seção "Fotos" do perfil, como no VK: álbuns (Fotos do perfil, Fotos no muro), a grade de
 * "Fotografias" (por ano no computador) e o visualizador em tela cheia com reações e comentários.
 * Lê as fotos direto do banco (todas as publicações do perfil, não só as já carregadas no feed).
 */
export function ProfilePhotos({ owner, isMe, viewerId, total }: { owner: Owner; isMe: boolean; viewerId: string | null; total?: number | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [album, setAlbum] = useState<AlbumId>("all");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState<{ all: number; avatar: number } | null>(null);
  const [covers, setCovers] = useState<{ avatar: string | null; wall: string | null }>({ avatar: null, wall: null });
  const [open, setOpen] = useState<{ list: Photo[]; index: number } | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  // Formato medido no carregamento (as fotos antigas não têm largura/altura salvas no banco).
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const query = useCallback(
    (which: AlbumId, head = false) => {
      let q = supabase
        .from("Media")
        .select(head ? "id, post:Post!inner(authorId, communityId, isArchived)" : COLUMNS, head ? { count: "exact", head: true } : undefined)
        .eq("type", "image")
        .eq("post.authorId", owner.id)
        .is("post.communityId", null)
        .eq("post.isArchived", false);
      if (which === "avatar") q = q.or(AVATAR_PATTERNS.map((p) => `url.ilike.${p}`).join(","));
      if (which === "wall") for (const p of AVATAR_PATTERNS) q = q.not("url", "ilike", p);
      return q;
    },
    [supabase, owner.id]
  );

  // Contagens e capas dos álbuns.
  useEffect(() => {
    (async () => {
      const [all, avatar, avatarCover, wallCover] = await Promise.all([
        query("all", true),
        query("avatar", true),
        query("avatar").order("createdAt", { ascending: false }).limit(1),
        query("wall").order("createdAt", { ascending: false }).limit(1),
      ]);
      setCounts({ all: all.count ?? total ?? 0, avatar: avatar.count ?? 0 });
      const first = (r: { data: unknown }) => ((r.data as Photo[] | null) ?? [])[0]?.url ?? null;
      setCovers({ avatar: first(avatarCover) ?? owner.avatarUrl, wall: first(wallCover) });
    })();
  }, [query, total, owner.avatarUrl]);

  const loadPage = useCallback(
    async (which: AlbumId, from: number) => {
      const { data } = await query(which)
        .order("createdAt", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE - 1);
      const rows = (data ?? []) as unknown as Photo[];
      setHasMore(rows.length === PAGE);
      return rows;
    },
    [query]
  );

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    loadPage(album, 0).then((rows) => alive && setPhotos(rows));
    return () => {
      alive = false;
    };
  }, [album, loadPage]);

  const more = useCallback(async () => {
    if (!photos || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const rows = await loadPage(album, photos.length);
    setPhotos((p) => [...(p ?? []), ...rows.filter((r) => !p?.some((x) => x.id === r.id))]);
    setLoadingMore(false);
  }, [photos, hasMore, loadingMore, loadPage, album]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && more(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, hasMore]);

  // Link direto de uma foto (?foto=<id>): abre o visualizador nela.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !photos) return;
    const id = new URLSearchParams(window.location.search).get("foto");
    if (!id) return;
    deepLinked.current = true;
    const index = photos.findIndex((p) => p.id === id);
    if (index >= 0) return setOpen({ list: photos, index });
    query("all")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => data && setOpen({ list: [data as unknown as Photo], index: 0 }));
  }, [photos, query]);

  const albumCount = (a: AlbumId) => (counts ? (a === "all" ? counts.all : a === "avatar" ? counts.avatar : Math.max(0, counts.all - counts.avatar)) : null);
  const currentTotal = albumCount(album) ?? photos?.length ?? 0;

  function removed(id: string) {
    setPhotos((p) => p?.filter((x) => x.id !== id) ?? p);
    setCounts((c) => (c ? { all: Math.max(0, c.all - 1), avatar: c.avatar - (open?.list.find((x) => x.id === id && isAvatarPhoto(x.url)) ? 1 : 0) } : c));
    setOpen((o) => {
      if (!o) return o;
      const list = o.list.filter((x) => x.id !== id);
      return list.length ? { list, index: Math.min(o.index, list.length - 1) } : null;
    });
  }

  const albums: { id: Exclude<AlbumId, "all">; cover: string | null }[] = [
    { id: "avatar", cover: covers.avatar },
    { id: "wall", cover: covers.wall },
  ];

  const byYear = useMemo(() => {
    const groups: { year: number; items: Photo[] }[] = [];
    for (const p of photos ?? []) {
      const year = parseDbDate(p.createdAt).getFullYear();
      const g = groups[groups.length - 1];
      if (g?.year === year) g.items.push(p);
      else groups.push({ year, items: [p] });
    }
    return groups;
  }, [photos]);

  const openAt = (p: Photo) => photos && setOpen({ list: photos, index: photos.findIndex((x) => x.id === p.id) });
  const tile = (p: Photo, className: string, style?: React.CSSProperties) => (
    <button key={p.id} type="button" onClick={() => openAt(p)} style={style} className={clsx("group relative block overflow-hidden bg-space-card", className)} aria-label="Abrir foto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.url}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          if (w && h && !p.width && !ratios[p.id]) setRatios((r) => ({ ...r, [p.id]: w / h }));
        }}
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
      />
      <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
    </button>
  );

  const empty = photos !== null && photos.length === 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Álbuns */}
      <section className="ox-card rounded-2xl border border-white/10 bg-space-surface p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <h3 className="text-[15px] font-semibold text-white">
            Álbuns <span className="ml-1 font-normal text-white/45">{albums.filter((a) => (albumCount(a.id) ?? 0) > 0).length || ""}</span>
          </h3>
          {album !== "all" && (
            <button type="button" onClick={() => setAlbum("all")} className="text-[13px] font-medium text-orbit-blue hover:underline">
              Ver todas as fotos
            </button>
          )}
        </div>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible lg:grid-cols-4">
          {albums.map((a) => {
            const n = albumCount(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAlbum((cur) => (cur === a.id ? "all" : a.id))}
                aria-pressed={album === a.id}
                className={clsx(
                  "group relative aspect-[4/3] w-[46%] shrink-0 snap-start overflow-hidden rounded-xl bg-space-card text-left ring-2 transition md:w-auto",
                  album === a.id ? "ring-orbit-blue" : "ring-transparent hover:ring-white/15"
                )}
              >
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-white/25">
                    {a.id === "avatar" ? <UserCircle2 className="h-10 w-10" /> : <Images className="h-10 w-10" />}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2 pt-8">
                  <span className="block truncate text-[13px] font-semibold text-snow">{ALBUM_LABEL[a.id]}</span>
                  <span className="block text-[12px] text-snow/75">{n === null ? " " : plural(n, "foto", "fotos")}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fotografias */}
      <section className="ox-card rounded-2xl border border-white/10 bg-space-surface p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <h3 className="text-[15px] font-semibold text-white">
            {album === "all" ? "Fotografias" : ALBUM_LABEL[album]} <span className="ml-1 font-normal text-white/45">{currentTotal > 0 && currentTotal.toLocaleString("pt-BR")}</span>
          </h3>
          {isMe && (
            <PublishButton className="hidden items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/[0.1] md:flex">
              <Plus className="h-4 w-4" /> Carregar foto
            </PublishButton>
          )}
        </div>

        {photos === null ? (
          <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl md:grid-cols-4 md:gap-1">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="aspect-square animate-pulse bg-white/[0.05]" />
            ))}
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <ImageOff className="mb-3 h-9 w-9 text-white/25" />
            <p className="text-sm font-medium text-white/80">{album === "all" ? "Nenhuma foto ainda" : "Nenhuma foto neste álbum"}</p>
            <p className="mt-1 text-xs text-white/45">{isMe ? "As fotos das suas publicações aparecem aqui." : `As fotos que ${owner.name.split(" ")[0]} publicar aparecem aqui.`}</p>
          </div>
        ) : (
          <>
            {/* Celular: grade 3×N quadrada, como no app do VK. */}
            <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl md:hidden">
              {photos.map((p) => tile(p, "aspect-square"))}
            </div>
            {/* Computador: separado por ano, em linhas justificadas que respeitam o formato da foto. */}
            <div className="hidden space-y-4 md:block">
              {byYear.map((g, gi) => (
                <div key={`${g.year}-${gi}`}>
                  {(byYear.length > 1 || g.year !== new Date().getFullYear()) && <h4 className="mb-2 px-1 text-[13px] font-semibold text-white/60">{g.year}</h4>}
                  <div className="flex flex-wrap gap-1">
                    {g.items.map((p) => {
                      const r = Math.min(2.4, Math.max(0.5, p.width && p.height ? p.width / p.height : (ratios[p.id] ?? 1)));
                      return tile(p, "rounded-md", { flexGrow: r, flexBasis: `${Math.round(r * 170)}px`, aspectRatio: `${r}` });
                    })}
                    <span aria-hidden style={{ flexGrow: 999 }} />
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div ref={sentinel} className="flex justify-center py-4">
                {loadingMore ? <Loader2 className="h-5 w-5 animate-spin text-white/40" /> : <button type="button" onClick={more} className="text-sm font-medium text-orbit-blue">Mostrar mais</button>}
              </div>
            )}
          </>
        )}
      </section>

      {/* "+ Adicionar" flutuante no celular, como no VK. */}
      {isMe && (
        <PublishButton className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-orbit-blue px-5 py-3 text-sm font-semibold text-snow shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition active:scale-95 md:hidden">
          <Plus className="h-5 w-5" /> Adicionar foto
        </PublishButton>
      )}

      {open && (
        <PhotoViewer
          owner={owner}
          isMe={isMe}
          viewerId={viewerId}
          list={open.list}
          index={open.index}
          total={open.list === photos ? currentTotal : open.list.length}
          albumLabel={ALBUM_LABEL[album]}
          onIndex={(index) => {
            setOpen((o) => (o ? { ...o, index } : o));
            if (open.list === photos && index >= photos.length - 6) more();
          }}
          onClose={() => {
            setOpen(null);
            const url = new URL(window.location.href);
            if (url.searchParams.has("foto")) {
              url.searchParams.delete("foto");
              window.history.replaceState(null, "", url.toString());
            }
          }}
          onAlbum={(a) => {
            setOpen(null);
            setAlbum(a);
          }}
          onRemoved={removed}
        />
      )}
    </div>
  );
}

type Stats = { count: number; mine: ReactionKey | null; top: ReactionKey[]; comments: number };

function PhotoViewer({
  owner,
  isMe,
  viewerId,
  list,
  index,
  total,
  albumLabel,
  onIndex,
  onClose,
  onAlbum,
  onRemoved,
}: {
  owner: Owner;
  isMe: boolean;
  viewerId: string | null;
  list: Photo[];
  index: number;
  total: number;
  albumLabel: string;
  onIndex: (i: number) => void;
  onClose: () => void;
  onAlbum: (a: AlbumId) => void;
  onRemoved: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const photo = list[index];
  const [stats, setStats] = useState<Stats | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [comments, setComments] = useState(false);
  const [reactors, setReactors] = useState(false);
  const [chrome, setChrome] = useState(true);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const avatarAlbum = isAvatarPhoto(photo.url);

  const flash = (text: string) => {
    setNote(text);
    window.setTimeout(() => setNote(null), 2200);
  };

  useEffect(() => {
    let alive = true;
    setStats(null);
    Promise.all([
      supabase.from("Like").select("postId, userId, reaction").eq("postId", photo.post.id).limit(5000),
      supabase.from("Comment").select("id", { count: "exact", head: true }).eq("postId", photo.post.id).neq("status", "removed"),
    ]).then(([likes, c]) => {
      if (!alive) return;
      const s = summarizeReactions((likes.data ?? []) as { postId: string; userId: string; reaction: string | null }[], viewerId);
      setStats({ count: s.count(photo.post.id), mine: s.mine(photo.post.id), top: s.top(photo.post.id), comments: c.count ?? 0 });
    });
    return () => {
      alive = false;
    };
  }, [supabase, photo.post.id, viewerId]);

  // Pré-carrega as vizinhas para a troca ser instantânea.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const p = list[i];
      if (p) new Image().src = p.url;
    }
  }, [index, list]);

  const go = useCallback((d: number) => {
    const next = index + d;
    if (next >= 0 && next < list.length) onIndex(next);
  }, [index, list.length, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (comments || reactors) return;
      const typing = (e.target as HTMLElement | null)?.closest("textarea, input");
      if (e.key === "Escape") (menu || confirm ? (setMenu(false), setConfirm(false)) : onClose());
      else if (!typing && e.key === "ArrowLeft") go(-1);
      else if (!typing && e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose, menu, confirm, comments, reactors]);

  async function react(next: ReactionKey | null) {
    if (!viewerId || !stats) return;
    const prev = stats.mine;
    if (prev === next) return;
    const delta = next && !prev ? 1 : !next && prev ? -1 : 0;
    setStats({ ...stats, mine: next, count: stats.count + delta, top: next && !stats.top.includes(next) ? [...stats.top, next].slice(-3) : stats.top });
    const { error } = !next
      ? await supabase.from("Like").delete().eq("postId", photo.post.id).eq("userId", viewerId)
      : prev
        ? await supabase.from("Like").update({ reaction: next }).eq("postId", photo.post.id).eq("userId", viewerId)
        : await supabase.from("Like").insert({ id: crypto.randomUUID(), postId: photo.post.id, userId: viewerId, reaction: next });
    if (error) setStats((s) => (s ? { ...s, mine: prev, count: s.count - delta } : s));
  }

  const link = () => `${window.location.origin}/perfil/${owner.username}?foto=${photo.id}#tab-fotos`;

  async function share() {
    setMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Foto de ${owner.name} no ÓrbitaX`, url: link() });
        return;
      } catch {
        // cancelado: copia o link
      }
    }
    copy();
  }

  async function copy() {
    setMenu(false);
    try {
      await navigator.clipboard.writeText(link());
      flash("Link copiado!");
    } catch {
      flash("Não foi possível copiar o link.");
    }
  }

  async function download() {
    setMenu(false);
    try {
      const blob = await (await fetch(photo.url)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `orbitax-${owner.username}-${photo.id.slice(0, 8)}.${(blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      window.open(photo.url, "_blank", "noopener,noreferrer");
    }
  }

  async function setAsAvatar() {
    if (!viewerId || busy) return;
    setMenu(false);
    setBusy(true);
    try {
      await saveAvatarUrl(supabase, viewerId, photo.url);
      flash("Foto de perfil atualizada!");
      router.refresh();
    } catch {
      flash("Não foi possível trocar a foto de perfil.");
    }
    setBusy(false);
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("Media").delete().eq("id", photo.id);
    if (error) {
      setBusy(false);
      setConfirm(false);
      return flash("Não foi possível remover a foto.");
    }
    // Se a publicação ficou sem nada (só tinha esta foto e nenhum texto), some com ela também.
    const { count } = await supabase.from("Media").select("id", { count: "exact", head: true }).eq("postId", photo.post.id);
    if (!count && !photo.post.content?.trim()) await supabase.from("Post").delete().eq("id", photo.post.id);
    setBusy(false);
    setConfirm(false);
    onRemoved(photo.id);
    router.refresh();
  }

  const counter = total > 1 ? `${(index + 1).toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}` : "";
  const caption = photo.post.content?.trim();

  const menuItems: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean; hide?: boolean }[] = [
    { icon: UserCircle2, label: "Instalar no perfil", onClick: setAsAvatar, hide: !isMe },
    { icon: Download, label: "Baixar", onClick: download },
    { icon: FolderOpen, label: "Ir para o álbum", onClick: () => onAlbum(avatarAlbum ? "avatar" : "wall") },
    { icon: Link2, label: "Copiar link", onClick: copy },
    { icon: Share2, label: "Compartilhar", onClick: share },
    { icon: Trash2, label: "Remover foto", onClick: () => (setMenu(false), setConfirm(true)), danger: true, hide: !isMe },
  ];

  const reactionButton = (label: boolean) =>
    stats ? (
      <ReactionButton mine={stats.mine} count={label ? 0 : stats.count} top={stats.top} onPick={viewerId ? react : () => flash("Entre para reagir.")} onShowList={() => setReactors(true)} label={label} />
    ) : (
      <span className="flex h-10 w-16 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin opacity-50" /></span>
    );

  const authorRow = (
    <div className="flex items-center gap-3">
      <Link href={`/perfil/${owner.username}`} onClick={onClose} className="shrink-0">
        <Avatar name={owner.name} url={owner.avatarUrl} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/perfil/${owner.username}`} onClick={onClose} className="block truncate text-[15px] font-semibold text-white hover:underline">
          {owner.name}
        </Link>
        <p className="truncate text-[12px] text-white/50">{longDate(photo.post.createdAt)}</p>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[90] flex bg-black" role="dialog" aria-modal="true" aria-label="Foto">
      {/* Área da foto: sempre escura, por isso a tinta fica branca mesmo no tema claro. */}
      <div className="relative flex min-w-0 flex-1 flex-col text-white" style={{ "--c-ink": "255 255 255" } as React.CSSProperties}>
        <header className={clsx("absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-2 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))] transition-opacity md:px-4", !chrome && "pointer-events-none opacity-0")}>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
          <p className="flex-1 text-center text-[15px] font-medium tabular-nums md:text-left">{counter}</p>
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Mais opções" aria-expanded={menu} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-6 w-6" />}
            </button>
          </div>
        </header>

        <div
          className="relative flex min-h-0 flex-1 select-none items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setChrome((v) => !v)}
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const t = touch.current;
            touch.current = null;
            if (!t) return;
            const dx = e.changedTouches[0].clientX - t.x;
            const dy = e.changedTouches[0].clientY - t.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
            else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) onClose();
            else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) setChrome((v) => !v);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={caption || `Foto de ${owner.name}`} draggable={false} className="max-h-full max-w-full object-contain" />
          {index > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="absolute inset-y-0 left-0 hidden w-24 items-center justify-start pl-4 text-white/70 transition hover:bg-gradient-to-r hover:from-black/30 hover:text-white md:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40"><ChevronLeft className="h-7 w-7" /></span>
            </button>
          )}
          {index < list.length - 1 && (
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className="absolute inset-y-0 right-0 hidden w-24 items-center justify-end pr-4 text-white/70 transition hover:bg-gradient-to-l hover:from-black/30 hover:text-white md:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40"><ChevronRight className="h-7 w-7" /></span>
            </button>
          )}
        </div>

        {/* Celular: legenda e ações embaixo, como no app do VK. */}
        <footer className={clsx("absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 transition-opacity lg:hidden", !chrome && "pointer-events-none opacity-0")}>
          {caption && <p className="mb-2 line-clamp-3 whitespace-pre-line px-1 text-[14px] leading-snug text-white/90">{caption}</p>}
          <div className="flex items-center gap-1 text-white/90">
            {reactionButton(false)}
            <button type="button" onClick={() => (viewerId ? setComments(true) : flash("Entre para comentar."))} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 hover:bg-white/10">
              <MessageCircle className="h-[18px] w-[18px]" />
              {!!stats?.comments && <span className="text-[15px] tabular-nums">{stats.comments}</span>}
            </button>
            <button type="button" onClick={share} aria-label="Compartilhar" className="flex min-h-[40px] items-center rounded-full px-3 hover:bg-white/10">
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </footer>

        {/* Computador: barra de baixo como no VK ("Fotos do perfil 7 de 181 · Compartilhar · Remover · Mais"). */}
        <div className="hidden shrink-0 items-center gap-4 border-t border-white/10 px-5 py-3 text-[13px] text-white/60 lg:flex">
          <button type="button" onClick={() => onAlbum(avatarAlbum ? "avatar" : "wall")} className="font-medium text-white/85 hover:underline">
            {avatarAlbum ? "Fotos do perfil" : albumLabel === ALBUM_LABEL.all ? "Fotos no muro" : albumLabel}
          </button>
          {counter && <span className="tabular-nums">{counter}</span>}
          <span className="flex-1" />
          <button type="button" onClick={share} className="hover:text-white">Compartilhar</button>
          {isMe && <button type="button" onClick={() => setConfirm(true)} className="hover:text-white">Remover</button>}
          <button type="button" onClick={() => setMenu((v) => !v)} className="hover:text-white">Mais</button>
        </div>

        {menu && (
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} role="presentation">
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="animate-pop-in absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1d22] py-1.5 shadow-2xl md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:w-64"
            >
              {menuItems
                .filter((m) => !m.hide)
                .map((m) => (
                  <button key={m.label} type="button" role="menuitem" onClick={m.onClick} className={clsx("flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition hover:bg-white/[0.06] md:py-2.5 md:text-sm", m.danger ? "text-red-400" : "text-white/90")}>
                    <m.icon className="h-5 w-5 shrink-0 opacity-80" /> {m.label}
                  </button>
                ))}
            </div>
          </div>
        )}

        {confirm && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 md:items-center" onClick={() => !busy && setConfirm(false)} role="presentation">
            <div role="alertdialog" aria-label="Remover foto" onClick={(e) => e.stopPropagation()} className="animate-pop-in w-full max-w-sm rounded-2xl border border-white/10 bg-[#1c1d22] p-5 text-center shadow-2xl">
              <p className="text-[16px] font-semibold">Remover esta foto?</p>
              <p className="mt-1.5 text-[13px] text-white/60">Ela sai do álbum e da publicação. Isso não pode ser desfeito.</p>
              <div className="mt-5 flex gap-2">
                <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="h-11 flex-1 rounded-xl bg-white/[0.07] text-sm font-medium hover:bg-white/[0.12]">Cancelar</button>
                <button type="button" disabled={busy} onClick={remove} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-semibold text-snow hover:bg-red-500/90 disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {note && <p className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-medium backdrop-blur">{note}</p>}
      </div>

      {/* Computador: painel à direita com autor, legenda, reações e comentários. */}
      <aside className="hidden w-[380px] shrink-0 border-l border-white/10 bg-space-surface lg:block">
        {viewerId ? (
          <CommentsSheet
            key={photo.post.id}
            open
            embedded
            onClose={onClose}
            postId={photo.post.id}
            postAuthor={owner}
            viewerId={viewerId}
            onCountChange={(d) => setStats((s) => (s ? { ...s, comments: Math.max(0, s.comments + d) } : s))}
            intro={
              <div className="space-y-3 border-b border-white/[0.07] px-2 pb-3 pt-4">
                {authorRow}
                {caption && <p className="whitespace-pre-line text-[14px] leading-relaxed text-white/90">{caption}</p>}
                <div className="flex items-center gap-1 text-white/70">
                  {reactionButton(false)}
                  <span className="flex min-h-[40px] items-center gap-1.5 px-3">
                    <MessageCircle className="h-[18px] w-[18px]" />
                    {!!stats?.comments && <span className="text-[15px] tabular-nums">{stats.comments}</span>}
                  </span>
                  <button type="button" onClick={share} aria-label="Compartilhar" className="flex min-h-[40px] items-center rounded-full px-3 hover:bg-white/5">
                    <Share2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            }
          />
        ) : (
          <div className="space-y-3 p-4">{authorRow}{caption && <p className="whitespace-pre-line text-[14px] text-white/90">{caption}</p>}</div>
        )}
      </aside>

      {viewerId && (
        <CommentsSheet
          open={comments}
          onClose={() => setComments(false)}
          postId={photo.post.id}
          postAuthor={owner}
          viewerId={viewerId}
          onCountChange={(d) => setStats((s) => (s ? { ...s, comments: Math.max(0, s.comments + d) } : s))}
          summary={stats ? `${plural(stats.count, "reação", "reações")} · ${plural(stats.comments, "comentário", "comentários")}` : undefined}
        />
      )}
      <ReactorsSheet open={reactors} onClose={() => setReactors(false)} postId={photo.post.id} total={stats?.count ?? 0} />
    </div>,
    document.body
  );
}
