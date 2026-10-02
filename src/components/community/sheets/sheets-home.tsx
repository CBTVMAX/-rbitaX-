"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, CheckCircle2, Clock, FileText, LayoutGrid, List, Loader2, MapPin, PenSquare, Plus, Search, Wrench, XCircle } from "lucide-react";
import { answerText, fields, isBlank, normalizeTemplate, safeMedia, SHEET_COLUMNS, type SheetRow, type SheetTemplate, type TemplateBundle } from "@/lib/sheets";
import { useCommunity } from "../context";
import { StatusChip } from "./sheet-view";

type Tab = "approved" | "pending" | "rejected" | "mine";

/** Fichas da comunidade: lista com abas, busca, filtros e "Criar minha ficha". */
export function SheetsHome() {
  const { supabase, community, viewer } = useCommunity();
  const [bundle, setBundle] = useState<TemplateBundle | null>(null);
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("approved");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const base = `/comunidades/${community.slug}/fichas`;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("sheet_template_get" as never, { p_community: community.id } as never);
      if (error) {
        setMissing(true);
        setRows([]);
        return;
      }
      setBundle(data as unknown as TemplateBundle);
      // O banco só devolve o que cada um pode ver: aprovadas, as próprias e (para a administração) todas.
      const { data: list } = await supabase.from("CommunitySheet" as never).select(SHEET_COLUMNS).eq("communityId", community.id).order("updatedAt", { ascending: false }).limit(300);
      setRows((list ?? []) as unknown as SheetRow[]);
    })();
  }, [supabase, community.id]);

  const t: SheetTemplate | null = useMemo(() => (bundle?.published ? normalizeTemplate(bundle.published, community.name) : null), [bundle, community.name]);
  const manage = !!bundle?.canManage;
  const mine = (rows ?? []).filter((r) => r.userId === viewer?.id);
  const count = (s: SheetRow["status"]) => (rows ?? []).filter((r) => r.status === s && (manage || r.userId === viewer?.id || s === "approved")).length;
  const filterFields = t ? fields(t).filter((f) => f.type === "single" && f.filter) : [];

  const shown = useMemo(() => {
    let list = rows ?? [];
    if (tab === "mine") list = list.filter((r) => r.userId === viewer?.id);
    else list = list.filter((r) => r.status === tab && (tab === "approved" || manage));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.title ?? "").toLowerCase().includes(q));
    for (const [id, v] of Object.entries(filters)) if (v) list = list.filter((r) => r.answers?.[id] === v);
    if (sort === "name") list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "pt-BR"));
    return list;
  }, [rows, tab, query, filters, sort, manage, viewer?.id]);

  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  if (missing)
    return (
      <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
        As fichas ainda não foram ativadas no banco de dados desta comunidade.
      </p>
    );

  const canCreate = !!t && !!bundle?.isMember && mine.length < (t.settings.maxPerMember ?? 1);
  const tabs: [Tab, string, React.ComponentType<{ className?: string }>, number][] = [
    ["approved", "Aprovadas", CheckCircle2, count("approved")],
    ...(manage
      ? ([
          ["pending", "Pendentes", Clock, count("pending")],
          ["rejected", "Recusadas", XCircle, count("rejected")],
        ] as [Tab, string, React.ComponentType<{ className?: string }>, number][])
      : []),
    ...(mine.length ? ([["mine", "Minhas fichas", PenSquare, mine.length]] as [Tab, string, React.ComponentType<{ className?: string }>, number][]) : []),
  ];

  return (
    <div className="space-y-4">
      {t && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10" style={{ background: t.style.background }}>
          {safeMedia(t.coverUrl) && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeMedia(t.coverUrl)!} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
            </>
          )}
          <div className="relative px-5 py-7 md:px-8 md:py-10">
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-white md:text-3xl" style={{ fontFamily: "Georgia, serif" }}>
              {t.title}
            </h2>
            {t.subtitle && <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/75">{t.subtitle}</p>}
            {t.description && <p className="mt-3 line-clamp-3 max-w-2xl whitespace-pre-wrap text-sm text-white/85">{t.description}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canCreate && (
          <Link href={`${base}/nova`} className="flex h-10 items-center gap-2 rounded-2xl bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> {t?.settings.buttonLabel || "Criar minha ficha"}
          </Link>
        )}
        {manage && (
          <Link href={`${base}/construtor`} className="flex h-10 items-center gap-2 rounded-2xl border border-orbit-purple/40 bg-orbit-purple/10 px-5 text-sm font-semibold text-white">
            <Wrench className="h-4 w-4" /> Construtor de ficha
          </Link>
        )}
      </div>

      {!t ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-white/40" />
          <p className="text-sm text-white/65">{manage ? "Monte a ficha da comunidade no Construtor de ficha e publique para os membros preencherem." : "A administração ainda não publicou a ficha desta comunidade."}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map(([id, l, Icon, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  "flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition",
                  tab === id ? "border-orbit-purple/50 bg-orbit-purple/15 text-white" : "border-white/10 text-white/65 hover:bg-white/[0.04]"
                )}
              >
                <Icon className={clsx("h-4 w-4", id === "approved" ? "text-emerald-400" : id === "pending" ? "text-amber-400" : id === "rejected" ? "text-red-400" : "text-orbit-cyan")} />
                {l}
                <span className="rounded-full bg-white/10 px-1.5 text-xs tabular-nums">{n}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="flex h-10 min-w-0 flex-1 basis-60 items-center gap-2 rounded-xl border border-white/10 bg-space-card/60 px-3.5">
              <Search className="h-4 w-4 text-white/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar personagem…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            </label>
            {filterFields.map((f) => (
              <select key={f.id} value={filters[f.id] ?? ""} onChange={(e) => setFilters((x) => ({ ...x, [f.id]: e.target.value }))} className="h-10 rounded-xl border border-white/10 bg-space-card/60 px-3 text-sm text-white">
                <option value="">{f.label}: todos</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ))}
            <select value={sort} onChange={(e) => setSort(e.target.value as "recent" | "name")} className="h-10 rounded-xl border border-white/10 bg-space-card/60 px-3 text-sm text-white">
              <option value="recent">Mais recentes</option>
              <option value="name">Nome (A–Z)</option>
            </select>
            <div className="flex rounded-xl border border-white/10 p-0.5">
              <button type="button" onClick={() => setLayout("list")} aria-label="Lista" className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", layout === "list" ? "bg-white/10 text-white" : "text-white/50")}>
                <List className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setLayout("grid")} aria-label="Grade" className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", layout === "grid" ? "bg-white/10 text-white" : "text-white/50")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">Nenhuma ficha aqui ainda.</p>
          ) : layout === "grid" ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {shown.map((r) => (
                <SheetCard key={r.id} r={r} t={t} href={`${base}/${r.id}`} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-space-card/60">
              {shown.map((r) => (
                <Link key={r.id} href={`${base}/${r.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03]">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
                    {safeMedia(r.avatarUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={safeMedia(r.avatarUrl)!} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{r.title}</span>
                    <span className="block truncate text-xs text-white/50">{infoLines(r, t).join(" · ")}</span>
                  </span>
                  <StatusChip status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function infoLines(r: SheetRow, t: SheetTemplate) {
  return fields(t)
    .filter((f) => f.card === "info" && !isBlank(r.answers?.[f.id]))
    .slice(0, 3)
    .map((f) => answerText(f, r.answers[f.id]));
}

function SheetCard({ r, t, href }: { r: SheetRow; t: SheetTemplate; href: string }) {
  const img = safeMedia(r.avatarUrl) ?? safeMedia(r.coverUrl);
  const fs = fields(t);
  const badge = fs.find((f) => f.card === "badge");
  const infos = fs.filter((f) => f.card === "info" && !isBlank(r.answers?.[f.id])).slice(0, 3);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-card/70 transition hover:border-orbit-purple/40">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-white/[0.04]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/30">{(r.title ?? "?").slice(0, 1)}</span>
        )}
        <StatusChip status={r.status} className="absolute bottom-2 left-2" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={href} className="truncate text-[15px] font-semibold text-white hover:underline">
          {r.title}
        </Link>
        {infos.map((f) => (
          <span key={f.id} className={clsx("flex items-center gap-1.5 truncate text-xs", f.type === "location" ? "text-orbit-pink" : "text-white/60")}>
            {f.type === "location" && <MapPin className="h-3 w-3 shrink-0" />}
            <span className="truncate">{answerText(f, r.answers[f.id])}</span>
          </span>
        ))}
        {badge && !isBlank(r.answers?.[badge.id]) && (
          <span className="mt-1 w-fit max-w-full truncate rounded-lg border border-orbit-purple/40 bg-orbit-purple/10 px-2 py-0.5 text-xs text-white/85">{answerText(badge, r.answers[badge.id])}</span>
        )}
        <Link href={href} className="mt-auto flex h-9 items-center justify-center gap-1 rounded-xl border border-white/10 pt-0 text-xs font-medium text-white/85 hover:bg-white/[0.05]" style={{ marginTop: "0.6rem" }}>
          Ver ficha <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
