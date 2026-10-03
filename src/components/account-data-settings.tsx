"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Download, Loader2, Trash2, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { disablePush } from "@/lib/push-client";
import { endPresenceForSignOut } from "@/components/presence-heartbeat";
import { getAccounts, removeAccount } from "@/lib/accounts";

function Card({ icon: Icon, title, desc, danger = false, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className={clsx("rounded-2xl border bg-space-surface/80 p-4 md:p-5", danger ? "border-red-500/25" : "border-white/10")}>
      <div className="flex items-start gap-3">
        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", danger ? "bg-red-500/10 text-red-400" : "bg-orbit-purple/10 text-orbit-purple")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-white/60">{desc}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const input =
  "w-full rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none focus:border-orbit-purple";
const primary =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50";
const danger =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-red-500/90 px-5 text-sm font-semibold text-snow transition hover:bg-red-500 disabled:opacity-40";
const secondary =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5 disabled:opacity-50";

const DELETE_ERROR: Record<string, string> = {
  wrong_password: "A senha não confere.",
  password_required: "Digite sua senha para confirmar.",
  confirm_required: "Digite EXCLUIR para confirmar.",
  staff_account: "Contas da equipe do Órbita X não podem ser excluídas por aqui.",
  not_authenticated: "Sua sessão expirou. Entre de novo e tente outra vez.",
};

export function AccountDataSettings({ username }: { username: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [hasPassword, setHasPassword] = useState(true);
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<React.ReactNode>(null);

  // Mesmo prazo do banco (6 meses), para mostrar a data exata antes de confirmar.
  const deadline = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasPassword(!!data.user?.identities?.some((i) => i.provider === "email")));
  }, [supabase]);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    const { data, error } = await supabase.rpc("export_my_data");
    setExporting(false);
    if (error || !data) return setExportError("Não foi possível gerar seus dados agora. Tente de novo em instantes.");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbitax-${username}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setExported(true);
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "EXCLUIR") return setDeleteError(DELETE_ERROR.confirm_required);
    if (hasPassword && !password) return setDeleteError(DELETE_ERROR.password_required);
    setDeleting(true);
    setDeleteError(null);
    let body: { ok?: boolean; error?: string; count?: number; until?: string } = {};
    try {
      const res = await fetch("/api/conta/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirm.trim(), password }),
      });
      body = await res.json().catch(() => ({}));
    } catch {
      body = { error: "network" };
    }
    if (!body.ok) {
      setDeleting(false);
      if (body.error === "owns_communities") {
        return setDeleteError(
          <>
            Você é dono de {body.count === 1 ? "uma comunidade" : `${body.count} comunidades`}. Transfira a propriedade (Gerenciar → Zona de risco) ou
            exclua a comunidade antes de excluir sua conta.{" "}
            <Link href="/comunidades" className="font-semibold underline">Ver comunidades</Link>
          </>
        );
      }
      return setDeleteError(DELETE_ERROR[body.error ?? ""] ?? "Não foi possível excluir a conta agora. Tente de novo em instantes.");
    }
    // Página desativada e sessões encerradas: limpa este aparelho e mostra a data limite.
    await disablePush(supabase).catch(() => undefined);
    await endPresenceForSignOut().catch(() => undefined);
    const active = getAccounts().activeId;
    if (active) removeAccount(active);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.href = `/conta-desativada${body.until ? `?ate=${encodeURIComponent(body.until)}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <Card
        icon={Download}
        title="Baixar uma cópia dos seus dados"
        desc="Um arquivo com seu perfil, publicações, comentários, mensagens que você enviou, amizades, comunidades, compras e histórico de segurança."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportData} disabled={exporting} className={primary}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {exporting ? "Gerando arquivo…" : "Baixar meus dados"}
          </button>
          {exported && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Arquivo baixado
            </span>
          )}
        </div>
        {exportError && <p className="mt-3 text-sm text-red-300">{exportError}</p>}
        <p className="mt-3 text-[11px] text-white/40">
          Formato JSON, que pode ser aberto em qualquer editor de texto. Fotos e vídeos aparecem como links. Direito garantido pela LGPD (Lei nº 13.709/2018).
        </p>
      </Card>

      <Card icon={UserX} title="Excluir conta" desc="Sua página fica desativada por 6 meses e some para todo mundo. Nesse prazo, é só entrar de novo para restaurar. Depois, tudo é apagado de vez." danger>
        {step === "idle" ? (
          <button type="button" onClick={() => setStep("confirm")} className={secondary.replace("text-white/85", "text-red-400")}>
            <Trash2 className="h-4 w-4" /> Quero excluir minha conta
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-3">
            <div className="flex gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p>Antes de continuar:</p>
                <ul className="list-disc space-y-0.5 pl-4 text-red-200/85">
                  <li>Você sai de todos os aparelhos e sua página some da busca, do feed e das conversas.</li>
                  <li>Você terá até {deadline} para restaurar, entrando com seu e-mail e senha.</li>
                  <li>Depois dessa data, perfil, publicações, mensagens, fotos e Diamantes são apagados para sempre.</li>
                  <li>Comunidades que você criou precisam ser transferidas antes.</li>
                  <li>Baixe seus dados acima se quiser guardar uma cópia.</li>
                </ul>
              </div>
            </div>
            <label className="block text-sm text-white/75">
              Digite <span className="font-semibold text-white">EXCLUIR</span> para confirmar
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className={clsx(input, "mt-1.5")}
              />
            </label>
            {hasPassword && (
              <label className="block text-sm text-white/75">
                Sua senha
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={clsx(input, "mt-1.5")} />
              </label>
            )}
            {deleteError && <p className="text-sm text-red-300">{deleteError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={deleting || confirm.trim().toUpperCase() !== "EXCLUIR"} className={danger}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir minha página
              </button>
              <button
                type="button"
                onClick={() => (setStep("idle"), setConfirm(""), setPassword(""), setDeleteError(null))}
                disabled={deleting}
                className={secondary}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
