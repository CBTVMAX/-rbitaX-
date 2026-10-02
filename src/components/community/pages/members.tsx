"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Loader2, Search, Settings, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { PresenceDot } from "@/components/presence-picker";
import { can, compactNumber, MEMBER_COLUMNS, rank, type Role } from "@/lib/communities";
import { useCommunity } from "../context";
import { useTimeZone } from "@/lib/use-tz";
import { InviteSheet } from "../community-menu";
import { SubpageFrame } from "../subpage";
import { EmptyState, RoleBadge } from "../ui";

export type MemberRow = { role: Role; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean } };
type Filter = "todos" | "equipe" | "membros";
const PAGE = 40;


export function MembersView({ canSee, initial }: { canSee: boolean; initial: MemberRow[] }) {
  const { supabase, community, viewer, role } = useCommunity();
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MemberRow[] | null>(initial);
  const [done, setDone] = useState(initial.length < PAGE);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState(false);
  const tz = useTimeZone();
  const first = useRef(true);

  async function fetchPage(offset: number) {
    const q = query.trim().replace(/[%_,()]/g, "");
    // Name/@ search needs the join to filter, so it uses an inner join on User.
    let req = supabase
      .from("CommunityMember")
      .select(q ? MEMBER_COLUMNS.replace("User!CommunityMember_userId_fkey(", "User!CommunityMember_userId_fkey!inner(") : MEMBER_COLUMNS)
      .eq("communityId", community.id);
    if (filter === "equipe") req = req.in("role", ["owner", "admin", "moderator", "editor"]);
    if (filter === "membros") req = req.eq("role", "member");
    if (q) req = req.or(`name.ilike.%${q}%,username.ilike.%${q}%`, { referencedTable: "user" });
    const { data } = await req.order("createdAt", { ascending: filter === "equipe" }).range(offset, offset + PAGE - 1);
    return ((data ?? []) as unknown as MemberRow[]).filter((m) => m.user);
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setItems(null);
      const r = await fetchPage(0);
      if (!alive) return;
      setItems(r);
      setDone(r.length < PAGE);
    }, query ? 300 : 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  async function more() {
    if (!items || loading) return;
    setLoading(true);
    const r = await fetchPage(items.length);
    setLoading(false);
    setItems([...items, ...r]);
    if (r.length < PAGE) setDone(true);
  }

  const sorted = filter === "equipe" && items ? [...items].sort((a, b) => rank(b.role) - rank(a.role) || Number(b.role === "editor") - Number(a.role === "editor")) : items;
  const canInvite = !!viewer && rank(role) >= 1 && can(community, role, "invite");

  return (
    <SubpageFrame
      title={`Membros · ${compactNumber(community.memberCount)}`}
      icon="👥"
      canSee={canSee}
      action={
        canInvite ? (
          <button type="button" onClick={() => setInvite(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-sm font-semibold text-snow shadow-glow">
            <UserPlus className="h-4 w-4" /> Convidar
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-2.5">
          <Search className="h-4 w-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou @" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
        </label>
        <div className="flex items-center gap-2">
          {(
            [
              ["todos", "Todos"],
              ["equipe", "Equipe"],
              ["membros", "Membros"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={clsx("rounded-full px-4 py-2 text-xs font-semibold", filter === id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              {label}
            </button>
          ))}
          {rank(role) >= 2 && (
            <Link href={`/comunidades/${community.slug}/gerenciar?secao=membros`} className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-orbit-cyan">
              <Settings className="h-3.5 w-3.5" /> Gerenciar
            </Link>
          )}
        </div>
        {sorted === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="Ninguém encontrado" />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">
            {sorted.map((m) => (
              <Link key={m.user.id} href={`/perfil/${m.user.username}`} className="flex min-h-[56px] items-center gap-3 border-b border-white/[0.05] px-4 py-2.5 transition last:border-0 hover:bg-white/[0.03]">
                <span className="relative">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={42} />
                  <PresenceDot userId={m.user.id} value={null} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-space-card" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                    {m.user.name} {m.user.isVerified && <VerifiedBadge />}
                  </span>
                  <span className="block truncate text-xs text-white/45">
                    @{m.user.username} · desde {new Date(m.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: tz })}
                  </span>
                </span>
                <RoleBadge role={m.role} />
              </Link>
            ))}
          </div>
        )}
        {!done && sorted && sorted.length > 0 && (
          <button type="button" onClick={more} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
          </button>
        )}
      </div>
      <InviteSheet open={invite} onClose={() => setInvite(false)} />
    </SubpageFrame>
  );
}
