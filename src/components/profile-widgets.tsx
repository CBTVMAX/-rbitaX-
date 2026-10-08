"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Compass, ImageIcon, Loader2, Lock, MessageCircle, Search, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import { VerifiedBadge } from "@/components/verified-badge";
import { PresenceDot } from "@/components/presence-picker";
import { useOnlineIds } from "@/lib/presence-live";

export type PersonRow = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  presence: string;
  mutual?: boolean;
};

export type ProfileStatCounts = { friends: number; followers: number; photos: number; videos: number; posts: number };

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const firstName = (name: string) => name.split(" ")[0];

function Face({ p, size, ring = false }: { p: { name: string; avatarUrl: string | null }; size: number; ring?: boolean }) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card text-sm font-semibold text-white/70 transition duration-200",
        ring && "ring-2 ring-transparent ring-offset-2 ring-offset-space-surface group-hover:scale-105 group-hover:ring-pa group-hover:shadow-[0_0_18px_rgb(var(--pa)/0.45)]"
      )}
      style={{ width: size, height: size }}
    >
      {p.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        p.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function WidgetCard({ title, count, action, children, className }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("ox-card rounded-2xl border border-white/10 bg-space-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          {title}
          {typeof count === "number" && <span className="ml-1.5 font-normal text-white/45">{compact.format(count)}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkBtn = "text-xs font-medium text-pa transition hover:underline";

// ─── Lista completa (Ver todos) ──────────────────────────────────────────

type Kind = "friends" | "followers";
type Filter = "all" | "online" | "mutual";
const PAGE = 30;

function PeopleSheet({
  open,
  onClose,
  userId,
  kind,
  isMe,
  viewerId,
  initialFilter = "all",
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  kind: Kind;
  isMe: boolean;
  viewerId: string | null;
  initialFilter?: Filter;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (open) setFilter(initialFilter);
  }, [open, initialFilter]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (offset: number) => {
      const id = ++reqId.current;
      setLoading(true);
      setFailed(false);
      const { data, error } =
        kind === "friends"
          ? await supabase.rpc("get_profile_friends", { p_user: userId, p_filter: filter, p_query: query, p_offset: offset, p_limit: PAGE })
          : await supabase.rpc("get_profile_followers", { p_user: userId, p_query: query, p_offset: offset, p_limit: PAGE });
      if (id !== reqId.current) return;
      setLoading(false);
      if (error || !data) return setFailed(true);
      const res = data as unknown as { items: PersonRow[]; total: number; hidden: boolean };
      setHidden(res.hidden);
      setTotal(res.total);
      setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
    },
    [supabase, kind, userId, filter, query]
  );

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setTotal(null);
    load(0);
  }, [open, load]);

  const hasMore = total !== null && items.length < total;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && load(items.length), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, items.length, load]);

  const tabs: { id: Filter; label: string }[] =
    kind === "friends" ? [{ id: "all", label: "Todos" }, { id: "online", label: "Online" }, ...(isMe ? [] : [{ id: "mutual" as const, label: "Em comum" }])] : [];

  const emptyText =
    hidden
      ? "Esta pessoa escolheu não mostrar esta lista."
      : query
        ? "Ninguém encontrado com esse nome."
        : filter === "online"
          ? "Nenhum amigo online agora."
          : filter === "mutual"
            ? "Vocês ainda não têm amigos em comum."
            : kind === "friends"
              ? "Nenhum amigo para mostrar."
              : "Ainda sem seguidores.";

  return (
    <Sheet open={open} onClose={onClose} title={kind === "friends" ? "Amigos" : "Seguidores"}>
      <div className="space-y-3 pb-1">
        {tabs.length > 0 && (
          <div className="flex gap-1.5" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  filter === t.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65 hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-orbit-purple/60">
          <Search className="h-4 w-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
        </label>
        {total !== null && !hidden && <p className="px-1 text-xs text-white/45">{total.toLocaleString("pt-BR")} {total === 1 ? "pessoa" : "pessoas"}</p>}

        <div className="max-h-[55vh] min-h-[200px] overflow-y-auto">
          {items.map((p) => {
            const canMessage = viewerId !== null && p.id !== viewerId && (kind === "friends" ? isMe || p.mutual : false);
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
                <Link href={`/perfil/${p.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative">
                    <Face p={p} size={44} />
                    <PresenceDot value={p.presence} userId={p.id} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-space-surface" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm font-medium text-white">{p.name}</span>
                      {p.isVerified && <VerifiedBadge />}
                    </span>
                    <span className="block truncate text-xs text-white/45">
                      @{p.username}
                      {!isMe && p.mutual ? " · amigo em comum" : ""}
                    </span>
                  </span>
                </Link>
                {canMessage && (
                  <Link
                    href={`/mensagens?com=${encodeURIComponent(p.username)}`}
                    onClick={onClose}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3 text-xs font-semibold text-white/85 transition hover:bg-white/5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Mensagem
                  </Link>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="space-y-1 px-2 py-1" aria-hidden>
              {Array.from({ length: items.length ? 2 : 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="animate-pulse bg-white/[0.07] h-11 w-11 rounded-full" />
                  <span className="flex-1 space-y-1.5">
                    <span className="animate-pulse bg-white/[0.07] block h-3 w-1/2 rounded-full" />
                    <span className="animate-pulse bg-white/[0.07] block h-2.5 w-1/3 rounded-full" />
                  </span>
                </div>
              ))}
            </div>
          )}
          {!loading && failed && (
            <button type="button" onClick={() => load(items.length)} className="mx-auto mt-6 block text-sm font-medium text-pa hover:underline">
              Não carregou. Tentar de novo
            </button>
          )}
          {!loading && !failed && total === 0 && (
            <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-white/45">
              {hidden ? <Lock className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
              {emptyText}
            </p>
          )}
          <div ref={sentinel} className="h-1" />
        </div>
      </div>
    </Sheet>
  );
}

// ─── Linha de contadores ─────────────────────────────────────────────────

export function ProfileStatsRow({
  userId,
  isMe,
  viewerId,
  stats,
  canSeeFriends,
  className,
}: {
  userId: string;
  isMe: boolean;
  viewerId: string | null;
  stats: ProfileStatCounts;
  canSeeFriends: boolean;
  className?: string;
}) {
  const [sheet, setSheet] = useState<Kind | null>(null);
  const item = (n: number, one: string, many: string) => (
    <>
      <span className="font-bold text-white">{compact.format(n)}</span> <span className="text-white/55">{n === 1 ? one : many}</span>
    </>
  );
  const cls = "whitespace-nowrap rounded-lg py-0.5 text-[14px] transition hover:text-white";
  const locked = !isMe && !canSeeFriends;

  return (
    <>
      <div className={clsx("flex flex-wrap items-center gap-x-5 gap-y-1", className)}>
        <button type="button" onClick={() => !locked && setSheet("friends")} className={clsx(cls, locked && "cursor-default")} title={locked ? "Lista de amigos oculta" : undefined}>
          {item(stats.friends, "amigo", "amigos")}
        </button>
        {stats.followers > 0 && (
          <button type="button" onClick={() => !locked && setSheet("followers")} className={clsx(cls, locked && "cursor-default")}>
            {item(stats.followers, "seguidor", "seguidores")}
          </button>
        )}
        <a href="#tab-fotos" className={cls}>
          {item(stats.photos, "foto", "fotos")}
        </a>
        <a href="#tab-videos" className={cls}>
          {item(stats.videos, "vídeo", "vídeos")}
        </a>
        <a href="#tab-posts" className={cls}>
          {item(stats.posts, "post", "posts")}
        </a>
      </div>
      <PeopleSheet open={sheet !== null} onClose={() => setSheet(null)} userId={userId} kind={sheet ?? "friends"} isMe={isMe} viewerId={viewerId} />
    </>
  );
}

// ─── Widget Amigos ───────────────────────────────────────────────────────

export function ProfileFriendsWidget({
  userId,
  isMe,
  viewerId,
  total,
  friends,
  canSee,
  strip = false,
}: {
  userId: string;
  isMe: boolean;
  viewerId: string | null;
  total: number;
  friends: PersonRow[];
  canSee: boolean;
  /** Telas menores: uma faixa horizontal compacta em vez da grade. */
  strip?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!isMe && (!canSee || friends.length === 0)) {
    if (strip) return null;
    return (
      <WidgetCard title="Amigos" count={canSee ? total : undefined}>
        <p className="flex items-center gap-2 py-2 text-[13px] text-white/45">
          {canSee ? <UsersRound className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {canSee ? "Nenhum amigo para mostrar" : "Lista de amigos oculta"}
        </p>
      </WidgetCard>
    );
  }
  if (isMe && friends.length === 0) {
    return (
      <WidgetCard title="Amigos" count={0}>
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pa/10 text-pa">
            <Compass className="h-6 w-6" />
          </span>
          <p className="text-[13px] text-white/60">Encontre pessoas no Órbita X</p>
          <Link href="/explorar" className="rounded-full bg-orbit-gradient px-4 py-1.5 text-xs font-semibold text-snow shadow-glow transition hover:opacity-90">
            Explorar
          </Link>
        </div>
      </WidgetCard>
    );
  }
  const shown = friends.slice(0, 6);
  return (
    <>
      <WidgetCard
        title="Amigos"
        count={total}
        action={
          <button type="button" onClick={() => setOpen(true)} className={linkBtn}>
            Ver todos
          </button>
        }
      >
        <div className={strip ? "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" : "grid grid-cols-3 gap-x-2 gap-y-3"}>
          {shown.map((f) => (
            <Link key={f.id} href={`/perfil/${f.username}`} className={clsx("group flex min-w-0 flex-col items-center gap-1.5 text-center", strip && "w-[64px] shrink-0")}>
              <Face p={f} size={56} ring />
              <span className="max-w-full truncate text-[12px] text-white/75 group-hover:text-white">{firstName(f.name)}</span>
            </Link>
          ))}
        </div>
      </WidgetCard>
      <PeopleSheet open={open} onClose={() => setOpen(false)} userId={userId} kind="friends" isMe={isMe} viewerId={viewerId} />
    </>
  );
}

// ─── Widget Amigos online (tempo real) ───────────────────────────────────

export function ProfileOnlineWidget({ userId, isMe, viewerId, friends }: { userId: string; isMe: boolean; viewerId: string | null; friends: PersonRow[] }) {
  const [open, setOpen] = useState(false);
  const ids = useMemo(() => friends.map((f) => f.id), [friends]);
  const initial = useMemo(() => Object.fromEntries(friends.map((f) => [f.id, f.presence])), [friends]);
  const onlineIds = useOnlineIds(ids, initial);
  if (!onlineIds.length) return null;
  const byId = new Map(friends.map((f) => [f.id, f]));
  const online = onlineIds.map((id) => byId.get(id)).filter((f): f is PersonRow => !!f);
  return (
    <>
      <WidgetCard
        title="Online"
        count={online.length}
        action={
          <button type="button" onClick={() => setOpen(true)} className={linkBtn}>
            Ver todos
          </button>
        }
      >
        <div className="grid grid-cols-6 gap-2 lg:grid-cols-3 lg:gap-x-2 lg:gap-y-3">
          {online.slice(0, 6).map((f) => (
            <Link key={f.id} href={`/perfil/${f.username}`} title={f.name} className="group flex min-w-0 flex-col items-center gap-1.5 text-center">
              <span className="relative">
                <Face p={f} size={48} ring />
                <span className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-space-surface bg-emerald-400" />
              </span>
              <span className="hidden max-w-full truncate text-[12px] text-white/75 group-hover:text-white lg:block">{firstName(f.name)}</span>
            </Link>
          ))}
        </div>
      </WidgetCard>
      <PeopleSheet open={open} onClose={() => setOpen(false)} userId={userId} kind="friends" isMe={isMe} viewerId={viewerId} initialFilter="online" />
    </>
  );
}

// ─── Widget Fotos (2×2) ──────────────────────────────────────────────────

export function ProfilePhotosWidget({ photos, total, isMe }: { photos: { id: string; url: string }[]; total: number; isMe: boolean }) {
  if (!photos.length && !isMe) return null;
  return (
    <WidgetCard
      title="Fotos"
      count={total}
      action={
        photos.length > 0 ? (
          <a href="#tab-fotos" className={clsx(linkBtn, "flex items-center gap-0.5")}>
            Ver todas <ChevronRight className="h-3.5 w-3.5" />
          </a>
        ) : undefined
      }
    >
      {photos.length ? (
        <div className="grid grid-cols-2 gap-1.5">
          {photos.slice(0, 4).map((p) => (
            <a key={p.id} href="#tab-fotos" className="group relative aspect-square overflow-hidden rounded-xl bg-space-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </a>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 py-2 text-[13px] text-white/45">
          <ImageIcon className="h-4 w-4" /> As fotos das suas publicações aparecem aqui.
        </p>
      )}
    </WidgetCard>
  );
}

// ─── Mover o post fixado para "Sobre mim" ─────────────────────────────────

export function MoveToAboutButton({ postId, className, onDone }: { postId: string; className?: string; onDone?: (ok: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        const { error } = await createClient().rpc("profile_about_me_from_post", { p_post: postId });
        setBusy(false);
        onDone?.(!error);
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Mover para Sobre mim
    </button>
  );
}
