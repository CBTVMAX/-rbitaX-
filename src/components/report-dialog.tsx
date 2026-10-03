"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";

export type GlobalReportTarget = { type: "post" | "user" | "message"; id: string; label: string };

const REASONS: Record<GlobalReportTarget["type"], string[]> = {
  post: ["Spam ou golpe", "Assédio ou discurso de ódio", "Conteúdo sexual explícito", "Violência", "Informação falsa", "Outro motivo"],
  user: ["Perfil falso ou se passando por alguém", "Assédio ou discurso de ódio", "Spam ou golpe", "Conteúdo sexual explícito", "Menor de idade", "Outro motivo"],
  message: ["Assédio ou ameaça", "Spam ou golpe", "Conteúdo sexual não solicitado", "Discurso de ódio", "Outro motivo"],
};

/**
 * Denúncia para a equipe do Órbita X (posts do feed, perfis e mensagens).
 * O banco valida o alvo, guarda uma cópia da mensagem denunciada e evita denúncia repetida.
 */
export function ReportDialog({ target, onClose }: { target: GlobalReportTarget | null; onClose: () => void }) {
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function close() {
    setDetails("");
    setResult(null);
    onClose();
  }

  async function send(reason: string) {
    if (!target) return;
    setBusy(reason);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) {
      setBusy(null);
      return setResult({ ok: false, text: "Entre na sua conta para denunciar." });
    }
    const { error } = await supabase.from("Report").insert({
      id: crypto.randomUUID(),
      reporterId: me,
      targetType: target.type,
      targetId: target.id,
      reason,
      details: details.trim().slice(0, 500) || null,
    });
    setBusy(null);
    if (!error) return setResult({ ok: true, text: "Recebemos sua denúncia. A equipe do Órbita X vai analisar com cuidado." });
    if (error.message?.includes("already_reported")) return setResult({ ok: true, text: "Você já denunciou isso. A análise está em andamento." });
    if (error.message?.includes("rate")) return setResult({ ok: false, text: "Muitas denúncias em pouco tempo. Tente de novo mais tarde." });
    setResult({ ok: false, text: "Não foi possível enviar a denúncia agora." });
  }

  return (
    <Sheet open={!!target} onClose={close} title={target ? `Denunciar ${target.label}` : ""}>
      {result ? (
        <div className="py-4 text-center">
          {result.ok && <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />}
          <p className={result.ok ? "text-sm text-white/85" : "text-sm text-red-300"}>{result.text}</p>
          <button
            type="button"
            onClick={close}
            className="mx-auto mt-4 flex min-h-[40px] items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
          >
            Fechar
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/50">Sua denúncia é anônima: a pessoa denunciada não sabe quem enviou.</p>
          <div className="mt-3 space-y-1.5">
            {target &&
              REASONS[target.type].map((r) => (
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
        </>
      )}
    </Sheet>
  );
}
