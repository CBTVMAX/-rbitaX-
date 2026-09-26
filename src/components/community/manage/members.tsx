"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, MoreHorizontal, Search, Shield, ShieldCheck, ShieldOff, UserMinus, UserX, X } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { ago as timeAgo } from "@/lib/communities";
import { communityError, rank, ROLE_LABEL, type Author, type Role } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm, EmptyState, RoleBadge, Sheet } from "../ui";
import { Card, inputCls, SubTabs } from "./fields";

type Tab = "todos" | "admins" | "moderadores" | "pedidos" | "bloqueados" | "removidos";
type MemberRow = { role: Role; createdAt: string; userId: string; user: Author };
type RequestRow = { userId: string; message: string; createdAt: string; user: Author };
type BanRow = { userId: string; reason: string; createdAt: string; user: Author };
type EventRow = { id: number; kind: string; createdAt: string; userId: string | null; user: Author | null };
type Pending = { title: string; message: string; label: string; danger: boolean; run: (reason: string) => Promise<unknown>; reason?: boolean };

const USER = "id, name, username, avatarUrl, isVerified";
const PAGE = 40;

function Person({ user, sub, right, badge }: { user: Author; sub?: React.ReactNode; right?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
      <Link href={`/perfil/${user.username}`} className="shrink-0">
        <Avatar name={user.name} url={user.avatarUrl} size={42} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link href={`/perfil/${user.username}`} className="flex min-w-0 items-center gap-1 text-sm font-semibold text-white hover:underline">
            <span className="truncate">{user.name}</span> {user.isVerified && <VerifiedBadge />}
          </Link>
          {badge}
        </div>
        <div className="truncate text-xs text-white/45">{sub ?? `@${user.username}`}</div>
      </div>
      {right}
    </div>
  );
}

export function MembersSection({ badges, onBadge }: { badges: { requests: number }; onBadge: (requests: number) => void }) {
  const { community, role, supabase, viewer, toast } = useCommunity();
  const router = useRouter();
  const myRank = rank(role);
  const [tab, setTab] = useState<Tab>("todos");
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [more, setMore] = useState(false);
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [bans, setBans] = useState<BanRow[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [target, setTarget] = useState<MemberRow | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function loadMembers(offset = 0) {
    const clean = q.trim().replace(/[,()%*\\]/g, "").slice(0, 40);
    let query = supabase
      .from("CommunityMember")
      .select(`role, createdAt, userId, user:User!CommunityMember_userId_fkey${clean ? "!inner" : ""}(${USER})`)
      .eq("communityId", community.id);
    if (tab === "admins") query = query.in("role", ["owner", "admin"]);
    if (tab === "moderadores") query = query.eq("role", "moderator");
    if (clean) query = query.or(`name.ilike.%${clean}%,username.ilike.%${clean}%`, { referencedTable: "user" });
    const { data } = await query.order("createdAt", { ascending: true }).range(offset, offset + PAGE - 1);
    const rows = ((data ?? []) as unknown as MemberRow[]).filter((m) => m.user).sort((a, b) => (offset ? 0 : rank(b.role) - rank(a.role)));
    setMembers((l) => (offset ? [...(l ?? []), ...rows] : rows));
    setMore(rows.length === PAGE);
  }

  useEffect(() => {
    if (tab === "todos" || tab === "admins" || tab === "moderadores") {
      setMembers(null);
      const t = setTimeout(() => loadMembers(), q ? 250 : 0);
      return () => clearTimeout(t);
    }
    if (tab === "pedidos")
      supabase
        .from("CommunityJoinRequest")
        .select(`userId, message, createdAt, user:User!CommunityJoinRequest_userId_fkey(${USER})`)
        .eq("communityId", community.id)
        .eq("status", "pending")
        .order("createdAt", { ascending: true })
        .limit(200)
        .then(({ data }) => setRequests(((data ?? []) as unknown as RequestRow[]).filter((r) => r.user)));
    if (tab === "bloqueados")
      supabase
        .from("CommunityBan")
        .select(`userId, reason, createdAt, user:User!CommunityBan_userId_fkey(${USER})`)
        .eq("communityId", community.id)
        .order("createdAt", { ascending: false })
        .limit(200)
        .then(({ data }) => setBans(((data ?? []) as unknown as BanRow[]).filter((r) => r.user)));
    if (tab === "removidos")
      supabase
        .from("CommunityMemberEvent")
        .select(`id, kind, createdAt, userId, user:User!CommunityMemberEvent_userId_fkey(${USER})`)
        .eq("communityId", community.id)
        .in("kind", ["remove", "ban"])
        .order("createdAt", { ascending: false })
        .limit(100)
        .then(({ data }) => setEvents((data ?? []) as unknown as EventRow[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q]);

  async function rpc(key: string, call: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(key);
    const { error } = await call;
    setBusy(null);
    if (error) {
      toast(communityError(error.message), true);
      return false;
    }
    toast(ok);
    return true;
  }

  async function decide(r: RequestRow, approve: boolean) {
    const ok = await rpc(
      `req-${r.userId}`,
      supabase.rpc("community_decide_request", { p_community: community.id, p_user: r.userId, p_approve: approve }),
      approve ? `${r.user.name} agora é membro.` : "Pedido recusado."
    );
    if (!ok) return;
    const left = (requests ?? []).filter((x) => x.userId !== r.userId);
    setRequests(left);
    onBadge(left.length);
    if (approve) router.refresh();
  }

  async function setRole(m: MemberRow, next: Role) {
    setTarget(null);
    const ok = await rpc(
      `role-${m.userId}`,
      supabase.rpc("community_set_role", { p_community: community.id, p_user: m.userId, p_role: next }),
      next === "owner" ? `${m.user.name} agora é o proprietário.` : `${m.user.name} agora é ${ROLE_LABEL[next].toLowerCase()}.`
    );
    if (!ok) return;
    if (next === "owner") {
      router.refresh();
      router.push(`/comunidades/${community.slug}`);
      return;
    }
    setMembers((l) => (l ?? []).map((x) => (x.userId === m.userId ? { ...x, role: next } : x)));
  }

  async function removeMember(m: MemberRow, ban: boolean, why: string) {
    const ok = await rpc(
      `rm-${m.userId}`,
      supabase.rpc("community_remove_member", { p_community: community.id, p_user: m.userId, p_ban: ban, p_reason: why.trim().slice(0, 300) }),
      ban ? `${m.user.name} foi bloqueado.` : `${m.user.name} foi removido.`
    );
    if (ok) setMembers((l) => (l ?? []).filter((x) => x.userId !== m.userId));
    return ok;
  }

  async function unban(b: BanRow) {
    const ok = await rpc(`ban-${b.userId}`, supabase.rpc("community_unban", { p_community: community.id, p_user: b.userId }), `${b.user.name} foi desbloqueado e pode voltar a participar.`);
    if (ok) setBans((l) => (l ?? []).filter((x) => x.userId !== b.userId));
  }

  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: "todos", label: "Todos", show: true },
    { id: "admins", label: "Administradores", show: true },
    { id: "moderadores", label: "Moderadores", show: true },
    { id: "pedidos", label: "Pedidos", count: badges.requests, show: myRank >= 3 },
    { id: "bloqueados", label: "Bloqueados", show: true },
    { id: "removidos", label: "Removidos", show: myRank >= 3 },
  ];

  // What I can do with this person (the RPCs enforce the same rules).
  function actionsFor(m: MemberRow) {
    const t = rank(m.role);
    const list: { label: string; icon: React.ComponentType<{ className?: string }>; run: () => void; danger?: boolean }[] = [];
    if (m.userId === viewer?.id || t >= myRank) return list;
    if (myRank === 4 && t < 3)
      list.push({ label: "Promover a administrador", icon: ShieldCheck, run: () => setRole(m, "admin") });
    if (myRank >= 3 && t === 1) list.push({ label: "Tornar moderador", icon: Shield, run: () => setRole(m, "moderator") });
    if (myRank === 4 && t === 3) list.push({ label: "Rebaixar para moderador", icon: Shield, run: () => setRole(m, "moderator") });
    if (myRank >= 3 && t >= 2) list.push({ label: "Rebaixar para membro", icon: ShieldOff, run: () => setRole(m, "member") });
    if (myRank === 4)
      list.push({
        label: "Transferir propriedade",
        icon: Crown,
        run: () =>
          setPending({
            title: `Transferir a comunidade para ${m.user.name}?`,
            message: "Essa pessoa vira proprietária e você passa a ser administrador. Só ela poderá devolver a propriedade.",
            label: "Transferir",
            danger: true,
            run: () => setRole(m, "owner"),
          }),
      });
    list.push({
      label: "Remover da comunidade",
      icon: UserMinus,
      danger: true,
      run: () => setPending({ title: `Remover ${m.user.name}?`, message: "A pessoa sai da comunidade, mas pode entrar de novo (ou pedir para entrar, se for privada).", label: "Remover", danger: true, run: () => removeMember(m, false, "") }),
    });
    list.push({
      label: "Bloquear",
      icon: UserX,
      danger: true,
      run: () =>
        setPending({
          title: `Bloquear ${m.user.name}?`,
          message: "A pessoa é removida e não pode voltar, ver a comunidade (se privada) nem interagir até ser desbloqueada.",
          label: "Bloquear",
          danger: true,
          reason: true,
          run: (why) => removeMember(m, true, why),
        }),
    });
    return list;
  }

  const list = (children: React.ReactNode) => <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">{children}</div>;
  const loading = (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-white/40" />
    </div>
  );

  let body: React.ReactNode;
  if (tab === "pedidos")
    body =
      requests === null ? loading : requests.length === 0 ? (
        <EmptyState icon={<Check className="h-6 w-6" />} title="Nenhum pedido pendente" text={community.isPrivate ? "Quando alguém pedir para entrar, aparece aqui." : "Comunidades públicas não recebem pedidos: qualquer pessoa entra na hora."} />
      ) : (
        list(
          requests.map((r) => (
            <div key={r.userId}>
              <Person
                user={r.user}
                sub={`@${r.user.username} · pediu ${timeAgo(r.createdAt)}`}
                right={
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => decide(r, false)} disabled={!!busy} aria-label={`Recusar ${r.user.name}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-red-300">
                      <X className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => decide(r, true)} disabled={!!busy} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow">
                      {busy === `req-${r.userId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar
                    </button>
                  </div>
                }
              />
              {r.message && <p className="-mt-1 mb-3 ml-[70px] mr-4 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-white/70">“{r.message}”</p>}
            </div>
          ))
        )
      );
  else if (tab === "bloqueados")
    body =
      bans === null ? loading : bans.length === 0 ? (
        <EmptyState icon={<UserX className="h-6 w-6" />} title="Ninguém bloqueado" />
      ) : (
        list(
          bans.map((b) => (
            <Person
              key={b.userId}
              user={b.user}
              sub={`${b.reason ? `“${b.reason}” · ` : ""}bloqueado ${timeAgo(b.createdAt)}`}
              right={
                <button type="button" onClick={() => unban(b)} disabled={!!busy} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-4 text-xs font-semibold text-white/85 hover:bg-white/5">
                  {busy === `ban-${b.userId}` && <Loader2 className="h-4 w-4 animate-spin" />} Desbloquear
                </button>
              }
            />
          ))
        )
      );
  else if (tab === "removidos")
    body =
      events === null ? loading : events.length === 0 ? (
        <EmptyState icon={<UserMinus className="h-6 w-6" />} title="Ninguém foi removido" />
      ) : (
        list(
          events.map((e) =>
            e.user ? (
              <Person key={e.id} user={e.user} sub={`${e.kind === "ban" ? "Bloqueado" : "Removido"} ${timeAgo(e.createdAt)}`} />
            ) : (
              <p key={e.id} className="px-4 py-3 text-xs text-white/40">
                Conta excluída · {timeAgo(e.createdAt)}
              </p>
            )
          )
        )
      );
  else
    body = (
      <div className="space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou @" className={`${inputCls} pl-11`} />
        </label>
        {members === null
          ? loading
          : members.length === 0
            ? <EmptyState icon={<Search className="h-6 w-6" />} title="Ninguém encontrado" />
            : list(
                members.map((m) => {
                  const acts = actionsFor(m);
                  return (
                    <Person
                      key={m.userId}
                      user={m.user}
                      sub={`@${m.user.username} · entrou ${timeAgo(m.createdAt)}`}
                      badge={<RoleBadge role={m.role} />}
                      right={
                        <div className="flex shrink-0 items-center gap-1.5">
                          {acts.length > 0 && (
                            <button type="button" onClick={() => setTarget(m)} aria-label={`Ações para ${m.user.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white">
                              {busy?.endsWith(m.userId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                            </button>
                          )}
                        </div>
                      }
                    />
                  );
                })
              )}
        {more && (
          <button type="button" onClick={() => loadMembers(members?.length ?? 0)} className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
            Carregar mais
          </button>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <Card title="Membros" desc={`${community.memberCount} ${community.memberCount === 1 ? "pessoa participa" : "pessoas participam"} desta comunidade.`}>
        <SubTabs tabs={tabs.filter((t) => t.show)} value={tab} onChange={setTab} />
      </Card>
      {body}

      <Sheet open={!!target} onClose={() => setTarget(null)} title={target?.user.name}>
        {target && (
          <div className="space-y-1 pt-1">
            <p className="mb-2 flex items-center gap-2 text-xs text-white/50">
              Cargo atual: <RoleBadge role={target.role} /> {target.role === "member" && "Membro"}
            </p>
            {actionsFor(target).map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setTarget(null);
                    a.run();
                  }}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm transition hover:bg-white/5 ${a.danger ? "text-red-300" : "text-white/85"}`}
                >
                  <Icon className="h-[18px] w-[18px]" /> {a.label}
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      <Confirm
        open={!!pending}
        title={pending?.title ?? ""}
        message={pending?.message}
        confirmLabel={pending?.label ?? ""}
        danger={pending?.danger}
        busy={!!busy}
        onClose={() => (setPending(null), setReason(""))}
        onConfirm={async () => {
          await pending?.run(reason);
          setPending(null);
          setReason("");
        }}
      >
        {pending?.reason && (
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Motivo (opcional, só a equipe vê)" className={`${inputCls} mt-4`} />
        )}
      </Confirm>
    </div>
  );
}
