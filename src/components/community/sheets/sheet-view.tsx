"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, Check, CheckCircle2, Clock, Loader2, MapPin, Pencil, Save, Trash2, XCircle } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { uploadCommunityFile } from "@/lib/communities";
import { answerText, fields, isBlank, normalizeTemplate, safeMedia, SHEET_COLUMNS, sheetError, STATUS_LABEL, type SheetAnswers, type SheetRow, type SheetTemplate, type TemplateBundle } from "@/lib/sheets";
import { useCommunity } from "../context";
import { Confirm, Sheet } from "../ui";
import { SheetBody, sheetVars } from "./sheet-render";

type Owner = { id: string; name: string; username: string; avatarUrl: string | null };

export function StatusChip({ status, className }: { status: SheetRow["status"]; className?: string }) {
  const Icon = status === "approved" ? CheckCircle2 : status === "pending" ? Clock : status === "rejected" ? XCircle : Pencil;
  const tone =
    status === "approved" ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : status === "pending" ? "border-amber-400/40 bg-amber-500/15 text-amber-300" : status === "rejected" ? "border-red-400/40 bg-red-500/15 text-red-300" : "border-white/20 bg-black/40 text-white/80";
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur", tone, className)}>
      <Icon className="h-3 w-3" /> {STATUS_LABEL[status]}
    </span>
  );
}

/** Ficha preenchida: leitura para todos, aprovação para a administração e campos do narrador. */
export function SheetView({ sheetId }: { sheetId: string }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const router = useRouter();
  const [bundle, setBundle] = useState<TemplateBundle | null>(null);
  const [sheet, setSheet] = useState<SheetRow | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [narr, setNarr] = useState<SheetAnswers>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const base = `/comunidades/${community.slug}/fichas`;

  useEffect(() => {
    (async () => {
      const [{ data: b, error }, { data: row }] = await Promise.all([
        supabase.rpc("sheet_template_get" as never, { p_community: community.id } as never),
        supabase.from("CommunitySheet" as never).select(SHEET_COLUMNS).eq("id", sheetId).maybeSingle(),
      ]);
      if (error) return setProblem(sheetError(error.message));
      const r = row as unknown as SheetRow | null;
      if (!r || r.communityId !== community.id) return setProblem("Ficha não encontrada ou ainda não aprovada.");
      setBundle(b as unknown as TemplateBundle);
      setSheet(r);
      setNarr(r.narrator ?? {});
      const { data: u } = await supabase.from("User").select("id, name, username, avatarUrl").eq("id", r.userId).maybeSingle();
      setOwner(u as Owner | null);
    })();
  }, [supabase, community.id, sheetId]);

  const t: SheetTemplate | null = useMemo(() => (bundle?.published ? normalizeTemplate(bundle.published, community.name) : null), [bundle, community.name]);

  if (problem)
    return (
      <div className="rounded-2xl border border-white/10 bg-space-card/70 p-8 text-center text-sm text-white/65">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-300" />
        {problem}
      </div>
    );
  if (!sheet || !t || !bundle) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  const mine = sheet.userId === viewer?.id;
  const manage = bundle.canManage;
  const narrate = bundle.canNarrate;
  const fs = fields(t);
  const badge = fs.find((f) => f.card === "badge");
  const infos = fs.filter((f) => f.card === "info" && !isBlank(sheet.answers[f.id])).slice(0, 4);
  const cover = safeMedia(sheet.coverUrl);
  const avatar = safeMedia(sheet.avatarUrl);
  const narratorChanged = JSON.stringify(narr) !== JSON.stringify(sheet.narrator ?? {});
  const hasNarratorFields = fs.some((f) => f.narratorOnly);

  async function review(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("sheet_review" as never, { p_sheet: sheet!.id, p_approve: approve, p_reason: approve ? null : reason } as never);
    setBusy(null);
    if (error) return toast(sheetError(error.message), true);
    setSheet({ ...sheet!, status: approve ? "approved" : "rejected", rejectReason: approve ? null : reason || null });
    setRejecting(false);
    toast(approve ? "Ficha aprovada. O membro foi avisado." : "Ficha recusada. O membro foi avisado.");
  }
  async function saveNarrator() {
    setBusy("narr");
    const { error } = await supabase.rpc("sheet_narrate" as never, { p_sheet: sheet!.id, p_values: narr } as never);
    setBusy(null);
    if (error) return toast(sheetError(error.message), true);
    setSheet({ ...sheet!, narrator: narr });
    toast("Campos do narrador salvos.");
  }
  async function remove() {
    setBusy("delete");
    const { error } = await supabase.rpc("sheet_delete" as never, { p_sheet: sheet!.id } as never);
    setBusy(null);
    if (error) return toast(sheetError(error.message), true);
    toast("Ficha excluída.");
    router.push(base);
  }

  return (
    <div className="space-y-4 pb-10" style={sheetVars(t)}>
      <header className="relative overflow-hidden rounded-3xl border" style={{ borderColor: "var(--sh-border)", background: "var(--sh-bg)" }}>
        <div className="relative h-40 md:h-56">
          {cover || safeMedia(t.coverUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(cover ?? safeMedia(t.coverUrl))!} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: "linear-gradient(135deg, var(--sh-accent), transparent)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <StatusChip status={sheet.status} className="absolute left-3 top-3" />
        </div>
        <div className="relative -mt-14 flex flex-col gap-4 px-4 pb-5 md:-mt-20 md:flex-row md:items-end md:px-6">
          <span className="block h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 bg-space-card md:h-36 md:w-36" style={{ borderColor: "var(--sh-accent)" }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/60">{(sheet.title ?? "?").slice(0, 1)}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold md:text-3xl" style={{ color: "var(--sh-title)" }}>
              {sheet.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-80">
              {infos.map((f) => (
                <span key={f.id} className={clsx("flex items-center gap-1", f.type === "location" && "text-[color:var(--sh-accent)]")}>
                  {f.type === "location" && <MapPin className="h-3.5 w-3.5" />}
                  {answerText(f, sheet.answers[f.id])}
                </span>
              ))}
            </div>
            {badge && !isBlank(sheet.answers[badge.id]) && (
              <span className="mt-2 inline-block rounded-full border px-3 py-1 text-sm font-medium" style={{ borderColor: "var(--sh-accent)", color: "var(--sh-accent)" }}>
                {answerText(badge, sheet.answers[badge.id])}
              </span>
            )}
            {owner && (
              <Link href={`/perfil/${owner.username}`} className="mt-3 flex w-fit items-center gap-2 text-xs opacity-70 hover:opacity-100">
                <Avatar name={owner.name} url={owner.avatarUrl} size={22} /> Ficha de {owner.name}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {mine && (
              <Link href={`${base}/${sheet.id}/editar`} className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm font-medium hover:bg-white/5">
                <Pencil className="h-4 w-4" /> Editar
              </Link>
            )}
            {(mine || manage) && (
              <button type="button" onClick={() => setDeleting(true)} className="flex h-10 items-center gap-1.5 rounded-xl border border-red-400/30 px-4 text-sm text-red-300 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            )}
          </div>
        </div>
      </header>

      {sheet.status === "rejected" && sheet.rejectReason && (mine || manage) && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
          <strong>Motivo da recusa:</strong> {sheet.rejectReason}
        </p>
      )}
      {sheet.status === "draft" && mine && <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">Esta ficha é um rascunho: só você vê. Toque em Editar para terminar e enviar.</p>}

      {manage && sheet.status === "pending" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-amber-100">Esta ficha aguarda a sua aprovação.</p>
          <button type="button" onClick={() => setRejecting(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-400/40 px-4 text-sm text-red-200 hover:bg-red-500/10">
            <XCircle className="h-4 w-4" /> Recusar
          </button>
          <button type="button" onClick={() => review(true)} disabled={!!busy} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar
          </button>
        </div>
      )}
      {manage && sheet.status === "approved" && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setRejecting(true)} className="text-xs text-white/50 hover:text-red-300">
            Revogar aprovação
          </button>
        </div>
      )}

      <SheetBody t={t} mode="view" answers={sheet.answers ?? {}} narrator={narr} canNarrate={narrate} onNarrator={(id, v) => setNarr((n) => ({ ...n, [id]: v }))} upload={(f) => uploadCommunityFile(supabase, viewer!.id, community.id, f, "image").then((r) => r.url)} />

      {narrate && hasNarratorFields && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex justify-end md:bottom-3">
          <button type="button" onClick={saveNarrator} disabled={!narratorChanged || busy === "narr"} className="flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-2xl disabled:opacity-40" style={{ background: t.style.accent }}>
            {busy === "narr" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar campos do narrador
          </button>
        </div>
      )}

      <Sheet open={rejecting} onClose={() => setRejecting(false)} title="Recusar ficha">
        <div className="space-y-3 pt-1">
          <p className="text-sm text-white/65">Explique o que precisa mudar. O membro recebe a notificação e pode corrigir e enviar de novo.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} placeholder="Ex.: A história precisa de mais detalhes sobre o passado." className="w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" />
          <button type="button" onClick={() => review(false)} disabled={busy === "reject"} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "reject" && <Loader2 className="h-4 w-4 animate-spin" />} Recusar ficha
          </button>
        </div>
      </Sheet>
      <Confirm open={deleting} title="Excluir esta ficha?" message="A ficha e as respostas dela somem de vez." confirmLabel="Excluir" busy={busy === "delete"} onConfirm={remove} onClose={() => setDeleting(false)} />
    </div>
  );
}
