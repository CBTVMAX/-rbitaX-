"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import qrcode from "qrcode-generator";
import {
  Archive,
  BarChart3,
  Bell,
  BellOff,
  Check,
  Copy,
  Download,
  Loader2,
  LogOut,
  Megaphone,
  MessageSquareText,
  Palette,
  PenSquare,
  QrCode,
  ScrollText,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Lock,
  CalendarDays,
} from "lucide-react";
import { Avatar } from "@/components/post-card";
import { InstallAppButton } from "@/components/pwa";
import { loadFriends } from "@/components/messenger/dialogs";
import { categoryLabel } from "@/lib/community-categories";
import { accentOf, can, communityError, compactNumber, isEditorOrAdmin, rank, type Membership } from "@/lib/communities";
import { useCommunity } from "./context";
import { Confirm, OfficialBadge, Sheet } from "./ui";

export function communityUrl(slug: string) {
  return typeof window === "undefined" ? `/comunidades/${slug}` : `${window.location.origin}/comunidades/${slug}`;
}

/** "Mensagem" / "Escrever para a comunidade": a private chat with the community's administration in the Messenger. */
export function useCommunityChat() {
  const { supabase, community, viewer, toast } = useCommunity();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function open() {
    if (!viewer) return router.push("/entrar");
    setBusy(true);
    const { data, error } = await supabase.rpc("community_open_chat", { p_community: community.id });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    router.push(`/mensagens?c=${data}`);
  }
  return { open, busy };
}

export function useShareCommunity() {
  const { community, toast } = useCommunity();
  return async () => {
    const url = communityUrl(community.slug);
    try {
      // Só dentro do Órbita X: o link abre apenas para quem tem conta.
      await navigator.clipboard.writeText(url);
      toast("Link da comunidade copiado. Só abre para quem tem conta no Órbita X.");
    } catch {
      /* share sheet closed */
    }
  };
}

type Item = { key: string; icon: React.ComponentType<{ className?: string }>; label: string; hint?: string; onClick?: () => void; href?: string; danger?: boolean; right?: React.ReactNode };

function MenuRow({ item, onDone }: { item: Item; onDone: () => void }) {
  const Icon = item.icon;
  const inner = (
    <>
      <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.danger ? "bg-red-500/10 text-red-300" : "bg-white/[0.05] text-white/80")}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block text-sm font-medium", item.danger ? "text-red-300" : "text-white")}>{item.label}</span>
        {item.hint && <span className="block truncate text-[11px] text-white/45">{item.hint}</span>}
      </span>
      {item.right}
    </>
  );
  const cls = "flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-white/[0.04] active:scale-[0.99]";
  return item.href ? (
    <Link href={item.href} className={cls} onClick={onDone}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={item.onClick}>
      {inner}
    </button>
  );
}

/** The ⋯ menu of a community: member tools and, for the team, shortcuts to every management area. */
export function CommunityMenu({
  open,
  onClose,
  membership,
  onLeft,
}: {
  open: boolean;
  onClose: () => void;
  membership: Membership;
  onLeft?: () => void;
}) {
  const { community, viewer, role, supabase, toast, refresh } = useCommunity();
  const router = useRouter();
  const share = useShareCommunity();
  const chat = useCommunityChat();
  const [favorite, setFavorite] = useState(!!membership.favorite);
  const [notify, setNotify] = useState(membership.notify);
  const [sheet, setSheet] = useState<"invite" | "qr" | "similar" | "install" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const member = rank(role) >= 1;
  const base = `/comunidades/${community.slug}`;
  const manage = `${base}/gerenciar`;

  async function toggleFavorite() {
    if (!viewer) return router.push("/entrar");
    const next = !favorite;
    setFavorite(next);
    const { error } = next
      ? await supabase.from("CommunityFavorite").insert({ userId: viewer.id, communityId: community.id })
      : await supabase.from("CommunityFavorite").delete().eq("userId", viewer.id).eq("communityId", community.id);
    if (error) {
      setFavorite(!next);
      return toast("Não foi possível atualizar os favoritos.", true);
    }
    toast(next ? "Adicionada às suas comunidades favoritas." : "Removida dos favoritos.");
  }

  async function toggleNotify() {
    const next = !notify;
    setNotify(next);
    const { error } = await supabase.rpc("community_set_notify", { p_community: community.id, p_on: next });
    if (error) {
      setNotify(!next);
      return toast(communityError(error.message), true);
    }
    toast(next ? "Notificações desta comunidade ativadas." : "Notificações desta comunidade desativadas.");
  }

  async function leave() {
    setBusy(true);
    const { error } = await supabase.rpc("community_leave", { p_community: community.id });
    setBusy(false);
    setLeaving(false);
    if (error) return toast(communityError(error.message), true);
    toast(`Você saiu de ${community.name}.`);
    onClose();
    onLeft?.();
    refresh();
  }

  const done = onClose;
  const memberItems: Item[] = [
    { key: "share", icon: Share2, label: "Compartilhar", onClick: () => (done(), share()) },
    member && can(community, role, "invite") && { key: "invite", icon: UserPlus, label: "Convidar amigos", onClick: () => setSheet("invite") },
    member && { key: "stories", icon: Archive, label: "Arquivo de histórias", href: `${base}/historias` },
    viewer && rank(role) < 3 && !membership.banned && { key: "chat", icon: MessageSquareText, label: "Escrever para a comunidade", hint: "Conversa privada com a administração no Messenger", onClick: () => (done(), chat.open()) },
    {
      key: "copy",
      icon: Copy,
      label: "Copiar link",
      onClick: () => {
        navigator.clipboard.writeText(communityUrl(community.slug)).then(() => toast("Link copiado."));
        done();
      },
    },
    { key: "qr", icon: QrCode, label: "QR Code", onClick: () => setSheet("qr") },
    { key: "similar", icon: Sparkles, label: "Comunidades parecidas", onClick: () => setSheet("similar") },
    { key: "install", icon: Smartphone, label: "Adicionar à tela inicial", onClick: () => setSheet("install") },
    member && role !== "owner" && { key: "leave", icon: LogOut, label: "Sair da comunidade", danger: true, onClick: () => setLeaving(true) },
  ].filter(Boolean) as Item[];

  const r = rank(role);
  const adminItems: Item[] = [
    r >= 2 && { key: "manage", icon: Settings, label: "Gerenciar", href: manage },
    r >= 2 && { key: "members", icon: Users, label: "Membros", href: `${manage}?secao=membros` },
    r >= 3 && { key: "mods", icon: ShieldCheck, label: "Moderadores e equipe", href: `${manage}?secao=membros&papel=equipe` },
    r >= 3 && { key: "stats", icon: BarChart3, label: "Estatísticas", href: `${manage}?secao=estatisticas` },
    isEditorOrAdmin(role) && { key: "ads", icon: Megaphone, label: "Anúncios", hint: "Avisos fixados que notificam os membros", href: `${base}/avisos` },
    isEditorOrAdmin(role) && { key: "events", icon: CalendarDays, label: "Eventos", href: `${base}/eventos` },
    r >= 3 && { key: "info", icon: PenSquare, label: "Editar informações", href: `${manage}?secao=geral` },
    r >= 3 && { key: "custom", icon: Palette, label: "Personalização", href: `${manage}?secao=personalizacao` },
    r >= 3 && { key: "privacy", icon: Lock, label: "Privacidade", href: `${manage}?secao=privacidade` },
    r >= 2 && { key: "mod", icon: ShieldAlert, label: "Moderação", href: `${manage}?secao=moderacao` },
    r >= 3 && { key: "log", icon: ScrollText, label: "Registro de ações", href: `${manage}?secao=registro` },
  ].filter(Boolean) as Item[];

  return (
    <>
      <Sheet open={open && !sheet && !leaving} onClose={onClose} title={community.name}>
        <div className="space-y-4 pt-1">
          {/* Como no "Mais" do VK: Favoritos e Notificações em destaque no topo. */}
          {viewer && (
            <div className={clsx("grid gap-2", member ? "grid-cols-2" : "grid-cols-1")}>
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={favorite}
                className={clsx("flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition", favorite ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/10 text-orbit-cyan hover:bg-white/[0.04]")}
              >
                <Star className={clsx("h-6 w-6", favorite && "fill-amber-300")} />
                {favorite ? "Nos favoritos" : "Favoritos"}
              </button>
              {member && (
                <button
                  type="button"
                  onClick={toggleNotify}
                  aria-pressed={notify}
                  className={clsx("flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-medium transition", notify ? "border-orbit-cyan/40 bg-orbit-cyan/10 text-orbit-cyan" : "border-white/10 text-white/60 hover:bg-white/[0.04]")}
                >
                  {notify ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
                  {notify ? "Notificações ativas" : "Notificações"}
                </button>
              )}
            </div>
          )}
          <div className="space-y-0.5">
            {memberItems.map((i) => (
              <MenuRow key={i.key} item={i} onDone={done} />
            ))}
          </div>
          {adminItems.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Administração</p>
              <div className="space-y-0.5 rounded-3xl border border-orbit-purple/20 bg-orbit-purple/[0.04] p-1">
                {adminItems.map((i) => (
                  <MenuRow key={i.key} item={i} onDone={done} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>
      <InviteSheet open={sheet === "invite"} onClose={() => (setSheet(null), onClose())} />
      <QrSheet open={sheet === "qr"} onClose={() => (setSheet(null), onClose())} />
      <SimilarSheet open={sheet === "similar"} onClose={() => (setSheet(null), onClose())} />
      <InstallSheet open={sheet === "install"} onClose={() => (setSheet(null), onClose())} />
      <Confirm
        open={leaving && open}
        title={`Sair de ${community.name}?`}
        message={community.isPrivate ? "Esta comunidade é privada: para voltar, você precisará pedir para entrar de novo." : "Você deixa de receber as novidades. Pode voltar quando quiser."}
        confirmLabel="Sair"
        busy={busy}
        onConfirm={leave}
        onClose={() => setLeaving(false)}
      />
    </>
  );
}

type Friend = { id: string; name: string; username: string; avatarUrl: string | null };

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !viewer || friends) return;
    (async () => {
      const list = (await loadFriends(supabase, viewer.id)) as Friend[];
      const { data } = list.length
        ? await supabase.from("CommunityMember").select("userId").eq("communityId", community.id).in("userId", list.map((f) => f.id))
        : { data: [] as { userId: string }[] };
      setMembers(new Set((data ?? []).map((m) => m.userId)));
      setFriends(list);
    })();
  }, [open, viewer, friends, supabase, community.id]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (friends ?? []).filter((f) => !q || f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
  }, [friends, query]);

  async function send() {
    setBusy(true);
    const { data, error } = await supabase.rpc("community_invite", { p_community: community.id, p_users: Array.from(picked) });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    const n = (data as number) ?? 0;
    toast(n === 0 ? "Esses amigos já foram convidados por você." : n === 1 ? "Convite enviado." : `${n} convites enviados.`);
    setPicked(new Set());
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Convidar amigos"
      footer={
        <button
          type="button"
          onClick={send}
          disabled={!picked.size || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {picked.size ? `Convidar ${picked.size} ${picked.size === 1 ? "amigo" : "amigos"}` : "Escolha quem convidar"}
        </button>
      }
    >
      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-2.5">
        <Search className="h-4 w-4 text-white/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar amigos" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
      </label>
      <div className="mt-3 space-y-0.5">
        {friends === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : friends.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">Você ainda não tem amigos no Órbita X para convidar.</p>
        ) : (
          shown.map((f) => {
            const already = members.has(f.id);
            const on = picked.has(f.id);
            return (
              <button
                key={f.id}
                type="button"
                disabled={already}
                onClick={() => setPicked((s) => (s.has(f.id) ? (s.delete(f.id), new Set(s)) : new Set(s).add(f.id)))}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                <Avatar name={f.name} url={f.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{f.name}</span>
                  <span className="block truncate text-xs text-white/45">{already ? "Já participa" : `@${f.username}`}</span>
                </span>
                {!already && (
                  <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full border", on ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25")}>
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </Sheet>
  );
}

/** QR code of the community link, drawn locally (no external service) and downloadable as PNG. */
export function QrSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { community, toast } = useCommunity();
  const url = communityUrl(community.slug);
  const accent = accentOf(community.accentColor);
  const modules = useMemo(() => {
    const qr = qrcode(0, "H");
    qr.addData(url, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    const cells: boolean[][] = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
    return cells;
  }, [url]);
  const n = modules.length;
  const margin = 3;
  const size = n + margin * 2;
  const logo = Math.round(n * 0.22);
  const logoAt = margin + Math.floor((n - logo) / 2);

  async function download() {
    const scale = 16;
    const c = document.createElement("canvas");
    c.width = c.height = size * scale;
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#0b0d1a";
    modules.forEach((row, r) =>
      row.forEach((dark, col) => {
        const inLogo = r + margin >= logoAt && r + margin < logoAt + logo && col + margin >= logoAt && col + margin < logoAt + logo;
        if (dark && !inLogo) g.fillRect((col + margin) * scale, (r + margin) * scale, scale, scale);
      })
    );
    const grad = g.createLinearGradient(logoAt * scale, logoAt * scale, (logoAt + logo) * scale, (logoAt + logo) * scale);
    grad.addColorStop(0, accent.from);
    grad.addColorStop(1, accent.to);
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(logoAt * scale, logoAt * scale, logo * scale, logo * scale, scale * 1.4);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `bold ${Math.round(logo * scale * 0.55)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(community.name.slice(0, 1).toUpperCase(), (logoAt + logo / 2) * scale, (logoAt + logo / 2) * scale + scale * 0.3);
    const a = document.createElement("a");
    a.download = `comunidade-${community.slug}-qrcode.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    toast("QR Code baixado.");
  }

  return (
    <Sheet open={open} onClose={onClose} title="QR Code da comunidade">
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="rounded-[28px] p-[3px] shadow-[0_0_40px_rgb(var(--app-accent,139_92_246)/0.35)]" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
          <div className="rounded-[25px] bg-white p-3">
            <svg viewBox={`0 0 ${size} ${size}`} className="h-56 w-56" role="img" aria-label={`QR Code para ${url}`} shapeRendering="crispEdges">
              <rect width={size} height={size} fill="#fff" />
              {modules.map((row, r) =>
                row.map((dark, col) => {
                  const inLogo = r + margin >= logoAt && r + margin < logoAt + logo && col + margin >= logoAt && col + margin < logoAt + logo;
                  return dark && !inLogo ? <rect key={`${r}-${col}`} x={col + margin} y={r + margin} width={1} height={1} fill="#0b0d1a" /> : null;
                })
              )}
              <defs>
                <linearGradient id="qr-accent" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={accent.from} />
                  <stop offset="1" stopColor={accent.to} />
                </linearGradient>
              </defs>
              <rect x={logoAt} y={logoAt} width={logo} height={logo} rx={1.4} fill="url(#qr-accent)" />
              <text x={logoAt + logo / 2} y={logoAt + logo / 2 + 0.35} textAnchor="middle" dominantBaseline="middle" fontSize={logo * 0.55} fontWeight={700} fill="#fff" fontFamily="system-ui, sans-serif">
                {community.name.slice(0, 1).toUpperCase()}
              </text>
            </svg>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 font-semibold text-white">
          {community.name} {community.isOfficial && <OfficialBadge />}
        </p>
        <p className="text-xs text-white/45">Aponte a câmera do celular para abrir a comunidade</p>
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={download} className="flex h-12 items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow">
            <Download className="h-4 w-4" /> Baixar
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url).then(() => toast("Link copiado."))}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-semibold text-white/85 hover:bg-white/5"
          >
            <Copy className="h-4 w-4" /> Copiar link
          </button>
        </div>
      </div>
    </Sheet>
  );
}

type Similar = { id: string; name: string; slug: string; avatarUrl: string | null; memberCount: number; isOfficial: boolean; isPrivate: boolean; description: string | null };

export function SimilarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase, community } = useCommunity();
  const [list, setList] = useState<Similar[] | null>(null);
  useEffect(() => {
    if (!open || list) return;
    (async () => {
      const cols = "id, name, slug, avatarUrl, memberCount, isOfficial, isPrivate, description";
      let rows: Similar[] = [];
      if (community.category) {
        const { data } = await supabase.from("Community").select(cols).eq("category", community.category).neq("id", community.id).order("memberCount", { ascending: false }).limit(12);
        rows = (data ?? []) as Similar[];
      }
      if (rows.length < 4) {
        const { data } = await supabase.from("Community").select(cols).neq("id", community.id).order("memberCount", { ascending: false }).limit(12);
        const extra = ((data ?? []) as Similar[]).filter((x) => !rows.some((r) => r.id === x.id));
        rows = [...rows, ...extra].slice(0, 12);
      }
      setList(rows);
    })();
  }, [open, list, supabase, community.category, community.id]);

  return (
    <Sheet open={open} onClose={onClose} title="Comunidades semelhantes">
      {community.category && <p className="-mt-1 mb-3 text-xs text-white/45">Mesma categoria: {categoryLabel(community.category)}</p>}
      {list === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/50">Ainda não há outras comunidades por aqui.</p>
      ) : (
        <div className="space-y-1">
          {list.map((c) => {
            const a = accentOf(null);
            return (
              <Link key={c.id} href={`/comunidades/${c.slug}`} onClick={onClose} className="flex min-h-[56px] items-center gap-3 rounded-2xl px-2 transition hover:bg-white/[0.04]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}>
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    <span className="truncate">{c.name}</span> {c.isOfficial && <OfficialBadge />}
                    {c.isPrivate && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                  </span>
                  <span className="block truncate text-xs text-white/45">
                    {compactNumber(c.memberCount)} {c.memberCount === 1 ? "membro" : "membros"}
                    {c.description ? ` · ${c.description}` : ""}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/** Installs Órbita X (Chrome/Edge/Android) or explains the taps on iPhone. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { community, toast } = useCommunity();
  const [ios, setIos] = useState(false);
  useEffect(() => setIos(/iphone|ipad|ipod/i.test(navigator.userAgent)), []);
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar à tela inicial">
      <div className="space-y-4 pt-1 text-sm text-white/75">
        <p>Instale o Órbita X no seu aparelho para acompanhar {community.name} e as outras comunidades com um toque, com notificações e tela cheia.</p>
        <InstallAppButton
          label="Instalar o Órbita X"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow"
        />
        <ol className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px]">
          {ios ? (
            <>
              <li>1. No Safari, toque em <strong className="text-white">Compartilhar</strong> (quadrado com seta).</li>
              <li>2. Escolha <strong className="text-white">Adicionar à Tela de Início</strong>.</li>
              <li>3. Toque em <strong className="text-white">Adicionar</strong>. Pronto!</li>
            </>
          ) : (
            <>
              <li>1. Abra o menu do navegador (⋮).</li>
              <li>2. Toque em <strong className="text-white">Adicionar à tela inicial</strong> ou <strong className="text-white">Instalar app</strong>.</li>
              <li>3. Confirme. O atalho abre o Órbita X como aplicativo.</li>
            </>
          )}
        </ol>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(communityUrl(community.slug)).then(() => toast("Link da comunidade copiado."))}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-semibold text-white/85 hover:bg-white/5"
        >
          <Copy className="h-4 w-4" /> Copiar link da comunidade
        </button>
      </div>
    </Sheet>
  );
}
