"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Entrar com Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        OU
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-white/50">E-mail</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Senha</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-white/50">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="font-medium text-orbit-cyan hover:underline">Criar uma conta</Link>
      </p>
    </AuthShell>
  );
}
