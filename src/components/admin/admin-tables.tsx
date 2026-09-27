"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sticker,
  Trash2,
  Users2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const nf = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function adminError(msg: string) {
  if (/admin_mfa_required/.test(msg)) return "Ações de administrador exigem verificação em duas etapas. Ative em Configurações › Segurança.";
  if (/nao_pode_moderar_admin/.test(msg)) return "Não é possível moderar outro administrador.";
  if (/forbidden|not_allowed/.test(msg)) return "Sem permissão.";
  return "Não foi possível concluir a ação.";
}

function Flash({ flash }: { flash: { text: string; error?: boolean } | null }) {
  if (!flash) return null;
  return (
    <p className={clsx("rounded-xl border px-3 py-2 text-sm", flash.error ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200")}>
      {flash.text}
    </p>
  );
}

function SearchBar({ value, onChange, placeholder, onRefresh, children }: { value: string; onChange: (v: string) => void; placeholder: string; onRefresh: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-space-card/70 px-4 py-2.5 focus-within:border-orbit-purple/50">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
      </label>
      {children}
      <button type="button" onClick={onRefresh} aria-label="Atualizar" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/5">
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}

function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx("rounded-full px-3 py-2 text-xs font-semibold transition", value === o.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:bg-white/5")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const card = "overflow-hidden rounded-2xl border border-white/10 bg-space-card/70";
const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-40";

function UserAvatar({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-space-bg">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-white/70">{name?.charAt(0) ?? "?"}</span>
      )}
    </span>
  );
}

// ============================================================ Liberar adesivo para um usuário
function GrantPackModal({ user, onClose }: { user: { id: string; name: string }; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [packs, setPacks] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_packs_for", { p_user: user.id });
    setPacks((data as any[]) ?? []);
  }, [supabase, user.id]);
  useEffect(() => { load(); }, [load]);

  async function toggle(pack: any) {
    const granting = pack.ownedSource !== "grant" && pack.ownedSource !== "purchase";
    setBusy(pack.id);
    const { error } = await supabase.rpc(granting ? "admin_grant_pack" : "admin_revoke_pack", { p_user: user.id, p_pack: pack.id });
    setBusy(null);
    if (error) {
      if (/nao_e_liberacao/.test(error.message)) return setFlash({ text: "Esse pacote foi comprado pelo usuário — não dá para remover.", error: true });
      return setFlash({ text: adminError(error.message), error: true });
    }
    setFlash({ text: granting ? `“${pack.name}” liberado.` : `“${pack.name}” removido.` });
    load();
  }

  const shown = (packs ?? []).filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="animate-sheet-up relative flex max-h-[85vh] w-full flex-col rounded-t-3xl border border-white/10 bg-space-surface sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orbit-gradient text-snow"><Gift className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Liberar adesivo</p>
            <p className="truncate text-xs text-white/50">para {user.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/60 hover:bg-white/5"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2 px-4 pt-3">
          {flash && <Flash flash={flash} />}
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-space-card/70 px-3.5 py-2.5 focus-within:border-orbit-purple/50">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pacote" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {packs === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
          ) : (
            <ul className="space-y-1">
              {shown.map((p) => {
                const owned = p.ownedSource === "grant" || p.ownedSource === "purchase";
                const purchased = p.ownedSource === "purchase";
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-space-bg text-white/50"><Sticker className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-white/45">{p.tier === "free" ? "Grátis" : "Premium"}{purchased ? " · comprado" : p.ownedSource === "grant" ? " · liberado" : ""}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy === p.id || purchased}
                      onClick={() => toggle(p)}
                      className={clsx(
                        "flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50",
                        owned ? "border border-white/15 text-white/70 hover:bg-white/5" : "bg-orbit-gradient text-snow"
                      )}
                    >
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : purchased ? "Comprado" : owned ? "Remover" : <><Gift className="h-3.5 w-3.5" /> Liberar</>}
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="py-8 text-center text-sm text-white/40">Nenhum pacote encontrado.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================ Usuários
export function AdminUsers() {
  const supabase = useMemo(() => createClient(), []);
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDebounced(q);
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const [grantFor, setGrantFor] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_users", { p_search: dq || null, p_status: status === "all" ? null : status, p_limit: 50, p_offset: 0 });
    setRows((data as any[]) ?? []);
  }, [supabase, dq, status]);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string) {
    setBusy(id + action);
    const { error } = await supabase.rpc("admin_user_action", { p_user: id, p_action: action });
    setBusy(null);
    if (error) return setFlash({ text: adminError(error.message), error: true });
    setFlash({ text: "Feito." });
    load();
  }

  const total = rows?.[0]?.total ?? 0;
  return (
    <div className="space-y-4">
      <Flash flash={flash} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nome, @ ou e-mail" onRefresh={load}>
        <Chips options={[{ id: "all", label: "Todos" }, { id: "active", label: "Ativos" }, { id: "suspended", label: "Suspensos" }]} value={status} onChange={setStatus} />
      </SearchBar>
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <>
          <p className="px-1 text-xs text-white/45">{nf(total)} {total === 1 ? "usuário" : "usuários"}</p>
          <div className={clsx(card, "divide-y divide-white/[0.06]")}>
            {rows.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar name={u.name} url={u.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {u.name}
                    {u.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
                    {(u.role === "admin" || u.role === "owner") && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-orbit-purple" />}
                    {u.accountStatus === "suspended" && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">Suspenso</span>}
                  </p>
                  <p className="truncate text-xs text-white/45">@{u.username} · {u.posts} posts · desde {date(u.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => setGrantFor({ id: u.id, name: u.name })} title="Liberar adesivo" className={clsx(iconBtn, "text-orbit-pink hover:bg-white/5")}>
                    <Gift className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => act(u.id, u.isVerified ? "unverify" : "verify")} title={u.isVerified ? "Remover verificação" : "Verificar"} className={clsx(iconBtn, "text-orbit-cyan hover:bg-white/5")}>
                    {busy === u.id + (u.isVerified ? "unverify" : "verify") ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                  </button>
                  {u.accountStatus === "suspended" ? (
                    <button type="button" disabled={!!busy} onClick={() => act(u.id, "activate")} title="Reativar" className={clsx(iconBtn, "text-emerald-300 hover:bg-white/5")}>
                      {busy === u.id + "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  ) : (
                    <button type="button" disabled={!!busy} onClick={() => act(u.id, "suspend")} title="Suspender" className={clsx(iconBtn, "text-red-300 hover:bg-white/5")}>
                      {busy === u.id + "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    </button>
                  )}
                  <Link href={`/perfil/${u.username}`} title="Ver perfil" className={clsx(iconBtn, "text-white/50 hover:bg-white/5 hover:text-white")}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-white/40">Nenhum usuário encontrado.</p>}
          </div>
        </>
      )}
      {grantFor && <GrantPackModal user={grantFor} onClose={() => setGrantFor(null)} />}
    </div>
  );
}

// ============================================================ Conteúdos
export function AdminContents() {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [kind, setKind] = useState("all");
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_contents", { p_search: dq || null, p_kind: kind === "all" ? null : kind, p_limit: 50, p_offset: 0 });
    setRows((data as any[]) ?? []);
  }, [supabase, dq, kind]);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string) {
    setBusy(id + action);
    const { error } = await supabase.rpc("admin_content_action", { p_post: id, p_action: action });
    setBusy(null);
    if (error) return setFlash({ text: adminError(error.message), error: true });
    setFlash({ text: action === "delete" ? "Conteúdo excluído." : action === "hide" ? "Conteúdo ocultado." : "Conteúdo restaurado." });
    load();
  }

  const total = rows?.[0]?.total ?? 0;
  return (
    <div className="space-y-4">
      <Flash flash={flash} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar no texto das publicações" onRefresh={load}>
        <Chips options={[{ id: "all", label: "Tudo" }, { id: "Postagens", label: "Postagens" }, { id: "Imagens", label: "Imagens" }, { id: "Vídeos", label: "Vídeos" }, { id: "Textos", label: "Textos" }]} value={kind} onChange={setKind} />
      </SearchBar>
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <>
          <p className="px-1 text-xs text-white/45">{nf(total)} {total === 1 ? "conteúdo" : "conteúdos"}</p>
          <div className={clsx(card, "divide-y divide-white/[0.06]")}>
            {rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-space-bg text-white/40"><EyeOff className="h-4 w-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    <span className="font-semibold">{p.authorName}</span>
                    {p.moderationStatus !== "visible" && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">{p.moderationStatus}</span>}
                    {p.reports > 0 && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">{p.reports} denúncia(s)</span>}
                  </p>
                  <p className="truncate text-xs text-white/45">{p.content || "(sem texto)"} · {p.likes} curtidas · {p.comments} coment. · {date(p.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {p.moderationStatus === "visible" ? (
                    <button type="button" disabled={!!busy} onClick={() => act(p.id, "hide")} title="Ocultar" className={clsx(iconBtn, "text-amber-300 hover:bg-white/5")}>
                      {busy === p.id + "hide" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  ) : (
                    <button type="button" disabled={!!busy} onClick={() => act(p.id, "restore")} title="Restaurar" className={clsx(iconBtn, "text-emerald-300 hover:bg-white/5")}>
                      {busy === p.id + "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  <button type="button" disabled={!!busy} onClick={() => act(p.id, "delete")} title="Excluir" className={clsx(iconBtn, "text-red-300 hover:bg-white/5")}>
                    {busy === p.id + "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-white/40">Nenhum conteúdo encontrado.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================ Comunidades
export function AdminCommunities() {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [rows, setRows] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_communities", { p_search: dq || null, p_limit: 60, p_offset: 0 });
    setRows((data as any[]) ?? []);
  }, [supabase, dq]);
  useEffect(() => { load(); }, [load]);

  const total = rows?.[0]?.total ?? 0;
  return (
    <div className="space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder="Buscar comunidades" onRefresh={load} />
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <>
          <p className="px-1 text-xs text-white/45">{nf(total)} {total === 1 ? "comunidade" : "comunidades"}</p>
          <div className={clsx(card, "divide-y divide-white/[0.06]")}>
            {rows.map((c) => (
              <Link key={c.id} href={`/comunidades/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-space-bg text-white/40"><Users2 className="h-4 w-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {c.name}
                    {c.isOfficial && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
                    {c.isPrivate && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                  </p>
                  <p className="truncate text-xs text-white/45">{nf(c.memberCount)} membros · {c.posts} posts · {c.category ?? "sem categoria"} · dono: {c.ownerName ?? "—"}</p>
                </div>
              </Link>
            ))}
            {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-white/40">Nenhuma comunidade encontrada.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================ Denúncias
export function AdminReports() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_reports", { p_status: status, p_limit: 60, p_offset: 0 });
    setRows((data as any[]) ?? []);
  }, [supabase, status]);
  useEffect(() => { load(); }, [load]);

  async function resolve(id: string, s: string) {
    setBusy(id + s);
    const { error } = await supabase.rpc("admin_resolve_report", { p_report: id, p_status: s });
    setBusy(null);
    if (error) return setFlash({ text: adminError(error.message), error: true });
    setFlash({ text: s === "resolved" ? "Denúncia resolvida." : "Denúncia arquivada." });
    load();
  }

  const total = rows?.[0]?.total ?? 0;
  return (
    <div className="space-y-4">
      <Flash flash={flash} />
      <div className="flex items-center justify-between gap-2">
        <Chips options={[{ id: "pending", label: "Pendentes" }, { id: "resolved", label: "Resolvidas" }, { id: "dismissed", label: "Arquivadas" }, { id: "all", label: "Todas" }]} value={status} onChange={setStatus} />
        <button type="button" onClick={load} aria-label="Atualizar" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : (
        <>
          <p className="px-1 text-xs text-white/45">{nf(total)} {total === 1 ? "denúncia" : "denúncias"}</p>
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.id} className={clsx(card, "p-4")}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300"><ShieldCheck className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{r.reason}</span>
                      <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">{r.targetType}</span>
                      {r.status !== "pending" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">{r.status}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/55">Alvo: {r.targetLabel ?? r.targetId}</p>
                    {r.details && <p className="mt-1 line-clamp-2 text-xs text-white/45">“{r.details}”</p>}
                    <p className="mt-1 text-[11px] text-white/35">por {r.reporterName ?? "—"} · {date(r.createdAt)}</p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" disabled={!!busy} onClick={() => resolve(r.id, "resolved")} className="flex items-center gap-1 rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow disabled:opacity-50">
                        {busy === r.id + "resolved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Resolver
                      </button>
                      <button type="button" disabled={!!busy} onClick={() => resolve(r.id, "dismissed")} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/5 disabled:opacity-50">
                        Arquivar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className={clsx(card, "px-4 py-10 text-center text-sm text-white/40")}>Nenhuma denúncia {status === "pending" ? "pendente" : ""}. Tudo em ordem. ✨</p>}
          </div>
        </>
      )}
    </div>
  );
}
