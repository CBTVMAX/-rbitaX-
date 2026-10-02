"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { uploadCommunityFile } from "@/lib/communities";
import { normalizeTemplate, SHEET_COLUMNS, sheetError, validateAnswers, type SheetAnswers, type SheetRow, type SheetTemplate, type TemplateBundle } from "@/lib/sheets";
import { useCommunity } from "../context";
import { RulesNotice, SheetBody, SheetHeader, sheetVars } from "./sheet-render";

/** Formulário do membro: só responde o modelo publicado pela administração. */
export function SheetForm({ sheetId }: { sheetId?: string }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const router = useRouter();
  const [t, setT] = useState<SheetTemplate | null>(null);
  const [sheet, setSheet] = useState<SheetRow | null>(null);
  const [answers, setAnswers] = useState<SheetAnswers>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const dirty = useRef(false);
  const base = `/comunidades/${community.slug}/fichas`;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("sheet_template_get" as never, { p_community: community.id } as never);
      if (error) return setProblem(sheetError(error.message));
      const b = data as unknown as TemplateBundle;
      if (!b?.published) return setProblem("A ficha ainda não foi publicada pela administração.");
      if (!b.isMember) return setProblem("Participe da comunidade para criar sua ficha.");
      setT(normalizeTemplate(b.published, community.name));
      if (sheetId) {
        const { data: row } = await supabase.from("CommunitySheet" as never).select(SHEET_COLUMNS).eq("id", sheetId).maybeSingle();
        const r = row as unknown as SheetRow | null;
        if (!r || r.userId !== viewer?.id) return setProblem("Ficha não encontrada.");
        setSheet(r);
        setAnswers(r.answers ?? {});
      }
    })();
  }, [supabase, community.id, community.name, sheetId, viewer?.id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Depois de aprovada, só os campos liberados pela administração podem mudar.
  const locked = useMemo(() => {
    if (!t || sheet?.status !== "approved") return t;
    return { ...t, blocks: t.blocks.map((b) => (b.kind === "field" && !b.editableAfterApproval && !b.narratorOnly ? { ...b, locked: true } : b)) };
  }, [t, sheet?.status]);

  async function upload(file: File) {
    if (!viewer) throw new Error("not_authenticated");
    try {
      return (await uploadCommunityFile(supabase, viewer.id, community.id, file, "image")).url;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha no envio da imagem.", true);
      throw e;
    }
  }

  async function save(submit: boolean) {
    if (!t) return;
    const bad = validateAnswers(t, answers, submit);
    if (bad) {
      setErrorId(bad.id);
      toast(bad.message, true);
      document.getElementById(`campo-${bad.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrorId(null);
    setBusy(submit ? "send" : "draft");
    const { data, error } = await supabase.rpc("sheet_save" as never, { p_community: community.id, p_sheet: sheet?.id ?? null, p_answers: answers, p_submit: submit } as never);
    setBusy(null);
    if (error) return toast(sheetError(error.message, (error as { details?: string }).details), true);
    dirty.current = false;
    const r = data as unknown as { id: string; status: string };
    toast(submit ? (r.status === "approved" ? "Ficha publicada!" : "Ficha enviada! Aguarde a aprovação.") : "Rascunho salvo.");
    if (submit || !sheet) router.push(submit ? `${base}/${r.id}` : `${base}/${r.id}/editar`);
    if (!submit && sheet) setSheet({ ...sheet, status: r.status as SheetRow["status"] });
  }

  if (problem)
    return (
      <div className="rounded-2xl border border-white/10 bg-space-card/70 p-8 text-center text-sm text-white/65">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-300" />
        {problem}
      </div>
    );
  if (!t || !locked) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  const approved = sheet?.status === "approved";

  return (
    <div className="space-y-4 pb-24" style={sheetVars(t)}>
      <SheetHeader t={t} />
      {sheet?.status === "rejected" && sheet.rejectReason && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
          <strong>Ajustes pedidos:</strong> {sheet.rejectReason}
        </p>
      )}
      {approved && <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-200">Ficha aprovada: só os campos liberados pela administração podem ser editados.</p>}
      <RulesNotice t={t} />
      <SheetBody
        t={locked}
        mode="form"
        answers={answers}
        narrator={sheet?.narrator}
        onChange={(id, v) => {
          dirty.current = true;
          setAnswers((a) => ({ ...a, [id]: v }));
          if (errorId === id) setErrorId(null);
        }}
        errorId={errorId}
        upload={upload}
      />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-space-bg/95 px-4 py-3 backdrop-blur md:sticky md:bottom-3 md:rounded-2xl md:border">
        <div className="mx-auto flex max-w-5xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!approved && (
            <button type="button" onClick={() => save(false)} disabled={!!busy} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-medium text-white/85 hover:bg-white/5 disabled:opacity-50">
              {busy === "draft" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar rascunho
            </button>
          )}
          <button type="button" onClick={() => save(true)} disabled={!!busy} className="flex h-10 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white disabled:opacity-50" style={{ background: t.style.accent }}>
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {approved ? "Salvar alterações" : t.settings.requireApproval ? "Enviar para aprovação" : "Publicar ficha"}
          </button>
        </div>
      </div>
    </div>
  );
}
