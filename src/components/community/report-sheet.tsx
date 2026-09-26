"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet } from "./ui";
import { useCommunity } from "./context";

const REASONS = ["Spam ou golpe", "Assédio ou discurso de ódio", "Conteúdo sexual explícito", "Violência", "Informação falsa", "Outro motivo"];

export type ReportTarget = { type: "community_post" | "community_comment" | "community_discussion" | "community_reply" | "community"; id: string; label: string };

/** The database fills in the community and checks the reporter can see it; moderators get it in Gerenciar → Moderação. */
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const { supabase, viewer, toast } = useCommunity();
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function send(reason: string) {
    if (!target || !viewer) return;
    setBusy(reason);
    const { error } = await supabase.from("Report").insert({
      id: crypto.randomUUID(),
      reporterId: viewer.id,
      targetType: target.type,
      targetId: target.id,
      reason,
      details: details.trim().slice(0, 500) || null,
    });
    setBusy(null);
    setDetails("");
    onClose();
    toast(error ? "Não foi possível enviar a denúncia agora." : "Denúncia enviada à moderação da comunidade.", !!error);
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={target ? `Denunciar ${target.label}` : ""}>
      <p className="text-xs text-white/50">Sua denúncia é anônima para quem publicou.</p>
      <div className="mt-3 space-y-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => send(r)}
            disabled={!!busy}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-white/85 transition hover:border-red-400/40 hover:bg-red-400/[0.05] disabled:opacity-50"
          >
            {r} {busy === r && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Detalhes (opcional)"
        className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
      />
    </Sheet>
  );
}
