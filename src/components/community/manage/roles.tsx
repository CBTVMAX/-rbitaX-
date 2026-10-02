"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Check, Crown, Flag, Gem, Hammer, Heart, KeyRound, Loader2, Plus, Rocket, Shield, Star, Trash2, UserCog, Zap } from "lucide-react";
import { Avatar } from "@/components/post-card";
import {
  COMMUNITY_PERMISSIONS,
  ROLE_COLORS,
  ROLE_ICON_KEYS,
  communityError,
  type CommunityCustomRole,
} from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm, EmptyState, Sheet } from "../ui";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { star: Star, crown: Crown, shield: Shield, hammer: Hammer, key: KeyRound, flag: Flag, rocket: Rocket, heart: Heart, zap: Zap, gem: Gem };
const iconComp = (k: string) => ICONS[k] ?? Star;

type Member = { userId: string; role: string; name: string; username: string; avatarUrl: string | null; overrides: Record<string, boolean>; roleIds: string[] };

export function RolesSection() {
  const { supabase, community, toast } = useCommunity();
  const [roles, setRoles] = useState<CommunityCustomRole[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<CommunityCustomRole | "new" | null>(null);
  const [managing, setManaging] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const [r, m, mr] = await Promise.all([
      supabase.from("CommunityRole").select("id, name, description, color, icon, rank, permissions, sortOrder").eq("communityId", community.id).order("rank", { ascending: false }).order("sortOrder"),
      supabase.from("CommunityMember").select("userId, role, overrides, user:User!CommunityMember_userId_fkey(name, username, avatarUrl)").eq("communityId", community.id).order("createdAt"),
      supabase.from("CommunityMemberRole").select("userId, roleId").eq("communityId", community.id),
    ]);
    setRoles((r.data ?? []) as unknown as CommunityCustomRole[]);
    const byUser = new Map<string, string[]>();
    for (const row of (mr.data ?? []) as { userId: string; roleId: string }[]) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row.roleId]);
    setMembers(
      ((m.data ?? []) as unknown as { userId: string; role: string; overrides: Record<string, boolean>; user: { name: string; username: string; avatarUrl: string | null } | null }[])
        .filter((x) => x.user)
        .map((x) => ({ userId: x.userId, role: x.role, overrides: x.overrides ?? {}, roleIds: byUser.get(x.userId) ?? [], name: x.user!.name, username: x.user!.username, avatarUrl: x.user!.avatarUrl }))
    );
  }, [supabase, community.id]);
  useEffect(() => {
    load();
  }, [load]);

  const roleById = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r])), [roles]);

  if (!roles) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  const memberCount = (roleId: string) => members.filter((m) => m.roleIds.includes(roleId)).length;

  return (
    <div className="space-y-6">
      {/* Cargos personalizados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Cargos personalizados</h3>
            <p className="text-xs text-white/45">Crie cargos com cor, ícone, hierarquia e permissões próprias.</p>
          </div>
          <button type="button" onClick={() => setEditing("new")} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> Criar cargo
          </button>
        </div>
        {roles.length === 0 ? (
          <EmptyState icon={<Star className="h-6 w-6" />} title="Nenhum cargo ainda" text="Crie cargos como Vice-Presidente, Editor ou Conselheiro e atribua a vários membros." />
        ) : (
          <ul className="space-y-2">
            {roles.map((r) => {
              const Icon = iconComp(r.icon);
              const perms = Object.values(r.permissions ?? {}).filter(Boolean).length;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setEditing(r)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-space-card/70 p-3 text-left transition hover:border-orbit-purple/40">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${r.color}1f`, color: r.color, boxShadow: `inset 0 0 0 1px ${r.color}55` }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{r.name}</span>
                      <span className="block truncate text-xs text-white/45">Nível {r.rank} · {perms} permiss{perms === 1 ? "ão" : "ões"} · {memberCount(r.id)} membro(s)</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Equipe: atribuir cargos e permissões individuais */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Equipe</h3>
          <p className="text-xs text-white/45">Atribua cargos (vários por pessoa) e ajustes individuais de permissão.</p>
        </div>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-space-card/50 p-2.5">
              <Avatar name={m.name} url={m.avatarUrl} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {m.roleIds.length === 0 && <span className="text-[11px] text-white/40">@{m.username}</span>}
                  {m.roleIds.map((id) => {
                    const r = roleById.get(id);
                    if (!r) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: r.color, borderColor: `${r.color}55`, background: `${r.color}1a` }}>
                        {r.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setManaging(m)} aria-label={`Gerenciar cargos de ${m.name}`} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-semibold text-white/80 hover:bg-white/5">
                <UserCog className="h-4 w-4" /> Cargos
              </button>
            </li>
          ))}
        </ul>
      </section>

      {editing && <RoleEditor role={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), load(), toast("Cargo salvo."))} onDeleted={() => (setEditing(null), load(), toast("Cargo excluído."))} />}
      {managing && roles && <MemberRolesModal member={managing} roles={roles} onClose={() => setManaging(null)} onChanged={load} />}
    </div>
  );
}

const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

function RoleEditor({ role, onClose, onSaved, onDeleted }: { role: CommunityCustomRole | null; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { supabase, community } = useCommunity();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? ROLE_COLORS[1]);
  const [icon, setIcon] = useState(role?.icon ?? "star");
  const [rankValue, setRankValue] = useState(role?.rank ?? 10);
  const [perms, setPerms] = useState<Record<string, boolean>>(role?.permissions ?? {});
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  async function save() {
    if (name.trim().length < 1) return setError("Dê um nome ao cargo.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("community_save_role", {
      p_community: community.id,
      p: { id: role?.id, name: name.trim(), description: description.trim() || null, color, icon, rank: rankValue, permissions: Object.keys(perms).filter((k) => perms[k]) } as never,
    });
    setBusy(false);
    if (e) return setError(/role_name_taken/.test(e.message) ? "Já existe um cargo com esse nome." : /too_many_roles/.test(e.message) ? "Limite de cargos atingido." : communityError(e.message));
    onSaved();
  }

  async function remove() {
    if (!role) return;
    setBusy(true);
    const { error: e } = await supabase.rpc("community_delete_role", { p_role: role.id });
    setBusy(false);
    setConfirmDel(false);
    if (e) return setError(communityError(e.message));
    onDeleted();
  }

  const Icon = iconComp(icon);
  return (
    <>
      <Sheet
        open
        onClose={onClose}
        wide
        title={role ? "Editar cargo" : "Criar cargo personalizado"}
        footer={
          <div className="flex items-center gap-2">
            {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <span className="min-w-0 flex-1" />}
            {role && (
              <button type="button" onClick={() => setConfirmDel(true)} className="flex h-10 items-center gap-1.5 rounded-full border border-red-500/30 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            )}
            <button type="button" onClick={save} disabled={busy} className="flex h-10 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}66` }}>
              <Icon className="h-6 w-6" />
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nome do cargo (ex.: Vice-Presidente)" className={clsx(field, "font-semibold")} autoFocus />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} rows={2} placeholder="Descrição (opcional)" className={clsx(field, "resize-none")} />

          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/60">Cor</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} className={clsx("h-8 w-8 rounded-full transition", color === c && "ring-2 ring-white ring-offset-2 ring-offset-space-surface")} style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-white/60">Ícone</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_ICON_KEYS.map((k) => {
                const I = iconComp(k);
                return (
                  <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k} className={clsx("flex h-9 w-9 items-center justify-center rounded-xl border transition", icon === k ? "border-transparent text-snow" : "border-white/10 text-white/60 hover:bg-white/5")} style={icon === k ? { background: color } : undefined}>
                    <I className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-white/60">Nível hierárquico</p>
              <span className="text-xs font-semibold text-white">{rankValue}</span>
            </div>
            <input type="range" min={1} max={99} value={rankValue} onChange={(e) => setRankValue(Number(e.target.value))} className="w-full accent-[rgb(var(--app-accent,139_92_246))]" />
            <p className="mt-1 text-[11px] text-white/40">Cargos de nível maior estão acima na hierarquia. Ninguém gerencia quem está acima de si — e ter um cargo não dá a propriedade da comunidade.</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-white/60">Permissões</p>
            <div className="space-y-3">
              {COMMUNITY_PERMISSIONS.map((g) => (
                <div key={g.group}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">{g.group}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {g.items.map((it) => (
                      <label key={it.key} className={clsx("flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition", perms[it.key] ? "border-orbit-purple/40 bg-orbit-purple/[0.08] text-white" : "border-white/[0.07] text-white/70 hover:bg-white/[0.03]")}>
                        <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", perms[it.key] ? "border-transparent bg-orbit-gradient text-snow" : "border-white/20")}>{perms[it.key] && <Check className="h-3.5 w-3.5" />}</span>
                        <input type="checkbox" checked={!!perms[it.key]} onChange={() => toggle(it.key)} className="sr-only" />
                        <span className="min-w-0 flex-1">{it.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirmDel}
        title="Excluir cargo?"
        message="O cargo será removido de todos os membros que o possuem. Esta ação não pode ser desfeita."
        confirmLabel="Excluir cargo"
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDel(false)}
      />
    </>
  );
}

const OVERRIDE_KEYS = ["publish_as_community", "moderate", "delete_content", "manage_members", "manage_events", "view_stats"] as const;
const OVERRIDE_LABEL: Record<string, string> = { publish_as_community: "Publicar como comunidade", moderate: "Moderar comentários", delete_content: "Excluir conteúdo", manage_members: "Gerenciar membros", manage_events: "Gerenciar eventos", view_stats: "Ver estatísticas" };

function MemberRolesModal({ member, roles, onClose, onChanged }: { member: Member; roles: CommunityCustomRole[]; onClose: () => void; onChanged: () => void }) {
  const { supabase, community, toast } = useCommunity();
  const [assigned, setAssigned] = useState<string[]>(member.roleIds);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(member.overrides ?? {});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole(roleId: string) {
    const on = !assigned.includes(roleId);
    setBusy(roleId);
    setError(null);
    const { error: e } = await supabase.rpc("community_assign_role", { p_community: community.id, p_user: member.userId, p_role: roleId, p_on: on });
    setBusy(null);
    if (e) return setError(communityError(e.message));
    setAssigned((a) => (on ? [...a, roleId] : a.filter((x) => x !== roleId)));
    onChanged();
  }

  // Ciclo Herdar → Permitir → Bloquear
  function cycle(key: string) {
    setOverrides((o) => {
      const cur = key in o ? (o[key] ? "allow" : "deny") : "inherit";
      const next = cur === "inherit" ? { ...o, [key]: true } : cur === "allow" ? { ...o, [key]: false } : (() => { const c = { ...o }; delete c[key]; return c; })();
      return next;
    });
  }

  async function saveOverrides() {
    setBusy("ov");
    setError(null);
    const { error: e } = await supabase.rpc("community_set_overrides", { p_community: community.id, p_user: member.userId, p: overrides as never });
    setBusy(null);
    if (e) return setError(communityError(e.message));
    toast("Permissões individuais salvas.");
    onChanged();
  }

  return (
    <Sheet open onClose={onClose} title={`Cargos de ${member.name}`}>
      <div className="space-y-5 pt-1">
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <section>
          <p className="mb-2 text-xs font-semibold text-white/60">Cargos (pode ter vários)</p>
          {roles.length === 0 ? (
            <p className="text-xs text-white/40">Crie um cargo primeiro.</p>
          ) : (
            <ul className="space-y-1.5">
              {roles.map((r) => {
                const on = assigned.includes(r.id);
                const Icon = iconComp(r.icon);
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => toggleRole(r.id)} disabled={busy === r.id} className={clsx("flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60", on ? "border-transparent" : "border-white/10 hover:bg-white/5")} style={on ? { background: `${r.color}1f`, boxShadow: `inset 0 0 0 1px ${r.color}66` } : undefined}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ color: r.color }}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{r.name}</span>
                      {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : on && <Check className="h-4 w-4" style={{ color: r.color }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <p className="mb-1 text-xs font-semibold text-white/60">Permissões individuais</p>
          <p className="mb-2 text-[11px] text-white/40">Ajustes só para esta pessoa, além dos cargos. “Herdar” segue os cargos.</p>
          <ul className="space-y-1.5">
            {OVERRIDE_KEYS.map((k) => {
              const state = k in overrides ? (overrides[k] ? "allow" : "deny") : "inherit";
              return (
                <li key={k} className="flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{OVERRIDE_LABEL[k]}</span>
                  <button
                    type="button"
                    onClick={() => cycle(k)}
                    className={clsx(
                      "h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition",
                      state === "allow" ? "bg-emerald-500/20 text-emerald-300" : state === "deny" ? "bg-red-500/20 text-red-300" : "border border-white/10 text-white/55"
                    )}
                  >
                    {state === "allow" ? "Permitir" : state === "deny" ? "Bloquear" : "Herdar"}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={saveOverrides} disabled={busy === "ov"} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy === "ov" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar permissões individuais
          </button>
        </section>
      </div>
    </Sheet>
  );
}
