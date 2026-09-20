"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Check, Loader2, X } from "lucide-react";

function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export default function CriarContaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkUsername(value: string) {
    const clean = slugifyUsername(value);
    setUsername(clean);
    if (clean.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const { data, error: rpcError } = await supabase.rpc("username_available", {
      check_username: clean,
    });
    if (rpcError) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus(data ? "free" : "taken");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agree) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    if (username.length < 3 || usernameStatus === "taken") {
      setError("Escolha um nome de usuário disponível com pelo menos 3 caracteres.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name, username, birthDate: birthDate || null },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/entrar?cadastro=ok");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <AuthShell title="Crie sua conta" subtitle="Leva menos de um minuto. O resto do perfil você completa depois.">
      <button
        onClick={handleGoogle}
        type="button"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Cadastrar com Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        OU CRIE COM SEUS DADOS
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quer ser chamado"
              className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Nome de usuário</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">@</span>
              <input
                required
                value={username}
                onChange={(e) => checkUsername(e.target.value)}
                placeholder="usuario"
                className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-7 pr-8 text-sm text-white outline-none focus:border-orbit-purple"
              />
              {usernameStatus === "checking" && (
                <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
              )}
              {usernameStatus === "free" && (
                <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              )}
              {usernameStatus === "taken" && (
                <X className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">E-mail</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Senha</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 8 caracteres"
              className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-white/50">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5"
          />
          Li e concordo com os{" "}
          <Link href="/termos" className="text-orbit-cyan hover:underline">Termos de Uso</Link> e a{" "}
          <Link href="/privacidade" className="text-orbit-cyan hover:underline">Política de Privacidade</Link>.
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Criando..." : "Continuar"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-white/50">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-orbit-cyan hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
