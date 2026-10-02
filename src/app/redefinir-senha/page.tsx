"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { passwordProblem } from "@/lib/password-policy";
import { authErrorMessage, pendingMfaFactor } from "@/lib/mfa";

/** Reached from the "Esqueceu sua senha?" e-mail: the link signs the person in for this step only. */
export default function RedefinirSenhaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState<"loading" | "ok" | "expired">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setReady("expired");
      // Accounts with two-step verification confirm the code before changing the password.
      if (await pendingMfaFactor(supabase)) {
        window.location.replace(`/entrar?mfa=1&redirect=${encodeURIComponent("/redefinir-senha")}`);
        return;
      }
      setReady("ok");
    });
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return setError(authErrorMessage(updateError, "Não foi possível salvar a nova senha. Peça um novo link."));
    }
    // Whoever had the old password is signed out everywhere else.
    await supabase.auth.signOut({ scope: "others" });
    window.location.href = "/feed";
  }

  return (
    <AuthShell
      title="Nova senha"
      heading={
        <>
          Crie uma <span className="orbit-text-gradient">nova senha</span>
        </>
      }
      subtitle="Depois de salvar, as outras sessões abertas da sua conta são encerradas."
    >
      {ready === "loading" && <p className="py-6 text-center text-sm text-white/50">Verificando o link…</p>}

      {ready === "expired" && (
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-white/70">Este link expirou ou já foi usado. Peça um novo na tela de entrada.</p>
          <Link href="/entrar" className="inline-flex items-center gap-2 rounded-xl bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow">
            Voltar para Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {ready === "ok" && (
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Nova senha", value: password, set: setPassword, auto: "new-password" },
            { label: "Repita a nova senha", value: confirm, set: setConfirm, auto: "new-password" },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1 block text-xs text-white/50">{f.label}</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete={f.auto}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-[36px] pr-[36px] text-sm text-white outline-none focus:border-orbit-purple"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-white/40">Mínimo de 8 caracteres, com letras e números.</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Salvando..." : (
              <>
                Salvar nova senha <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
