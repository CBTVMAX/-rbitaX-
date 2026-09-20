"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { ArrowRight, ChevronRight, Eye, EyeOff, Lock, Mail, Phone } from "lucide-react";
import { clsx } from "clsx";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.3v3.1C3.3 21.3 7.3 24 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.5l4.1-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.5l4.1 3.1c.9-2.8 3.5-4.8 6.6-4.8Z" />
    </svg>
  );
}

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<"email" | "celular">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push(params.get("redirect") || "/feed");
    router.refresh();
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleForgotPassword() {
    setResetStatus(null);
    if (!email) {
      setResetStatus("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setResetStatus(resetError ? "Não foi possível enviar o e-mail agora." : "Enviamos um link de redefinição para o seu e-mail.");
  }

  return (
    <AuthShell title="Entrar" subtitle="Seu universo está te esperando.">
      {params.get("cadastro") === "ok" && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Conta criada! Confirme seu e-mail (se necessário) e entre para continuar.
        </p>
      )}

      <button
        onClick={handleGoogle}
        type="button"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <GoogleIcon className="h-4 w-4" /> Entrar com o Google
      </button>

      <button
        type="button"
        disabled
        title="Em breve"
        className="mb-4 flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/40"
      >
        <span className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Entrar com o número de celular
        </span>
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        OU
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={clsx(
            "flex-1 rounded-full transition",
            mode === "email" ? "bg-orbit-gradient p-[1.5px]" : "p-[1.5px]"
          )}
        >
          <span
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium",
              mode === "email" ? "bg-space-card text-white" : "border border-white/10 bg-space-card text-white/50 hover:text-white"
            )}
          >
            <Mail className="h-3.5 w-3.5" /> E-mail
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("celular")}
          className={clsx(
            "flex-1 rounded-full transition",
            mode === "celular" ? "bg-orbit-gradient p-[1.5px]" : "p-[1.5px]"
          )}
        >
          <span
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium",
              mode === "celular" ? "bg-space-card text-white" : "border border-white/10 bg-space-card text-white/50 hover:text-white"
            )}
          >
            <Phone className="h-3.5 w-3.5" /> Celular
          </span>
        </button>
      </div>

      {mode === "celular" ? (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">
          Entrar com número de celular em breve. Use seu e-mail por enquanto.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">E-mail</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orbit-purple"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Senha</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-9 text-sm text-white outline-none focus:border-orbit-purple"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-white/50">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Lembrar de mim
            </label>
            <button type="button" onClick={handleForgotPassword} className="text-orbit-cyan hover:underline">
              Esqueceu sua senha?
            </button>
          </div>
          {resetStatus && <p className="text-xs text-white/50">{resetStatus}</p>}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : (
              <>
                Entrar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-white/50">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="font-medium text-orbit-cyan hover:underline">Criar uma conta</Link>
      </p>
    </AuthShell>
  );
}
