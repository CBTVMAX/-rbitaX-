"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { ArrowRight, Calendar, ChevronRight, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";

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

function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 20);
}

function parseBirthDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function formatBirthDateInput(raw: string, previous: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  const next = parts.join("/");
  return raw.length < previous.length ? raw : next;
}

export default function CriarContaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function reserveUsername(base: string) {
    const clean = slugifyUsername(base) || "usuario";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? clean : `${clean}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error: rpcError } = await supabase.rpc("username_available", { check_username: candidate });
      if (!rpcError && data) return candidate;
    }
    return `${clean}${Date.now().toString().slice(-6)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agree) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    const birthDate = birthDateInput ? parseBirthDate(birthDateInput) : null;
    if (birthDateInput && !birthDate) {
      setError("Digite uma data de nascimento válida (DD/MM/AAAA).");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const username = await reserveUsername(name || email.split("@")[0] || "usuario");
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name, username, birthDate },
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

  function normalizePhone(value: string) {
    const digits = value.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits;
    return `+55${digits}`;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    setPhoneLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) });
    setPhoneLoading(false);

    if (otpError) {
      setPhoneError(otpError.message);
      return;
    }
    setOtpSent(true);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    setPhoneLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otp,
      type: "sms",
    });
    setPhoneLoading(false);

    if (verifyError) {
      setPhoneError(verifyError.message);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <AuthShell
      title="Crie sua conta"
      eyebrow="Criar conta"
      heading={
        <>
          Faça parte do <span className="orbit-text-gradient">ÓrbitaX</span>
        </>
      }
      subtitle="Leva menos de um minuto. O resto do seu perfil você completa depois."
      topRight={
        <>
          <p className="text-xs font-semibold uppercase leading-6 tracking-[0.15em] text-white/70">
            Pessoas
            <br />
            Ideias
            <br />
            Conteúdos
            <br />
            Em órbita
          </p>
          <span className="mt-2 ml-auto block h-0.5 w-8 bg-orbit-pink" />
        </>
      }
    >
      <button
        type="button"
        onClick={() => setPhoneMode(true)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Cadastrar com o número de celular
        </span>
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        onClick={handleGoogle}
        type="button"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <GoogleIcon className="h-4 w-4" /> Cadastrar com o Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        OU PREENCHA SEUS DADOS
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {phoneMode ? (
        !otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-white/50">Número de celular</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 (11) 91234-5678"
                  className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orbit-purple"
                />
              </div>
            </div>

            {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}

            <button
              type="submit"
              disabled={phoneLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {phoneLoading ? "Enviando código..." : (
                <>
                  Enviar código <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPhoneMode(false)}
              className="w-full text-center text-xs text-white/40 hover:text-white/70"
            >
              Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-xs text-white/50">
              Enviamos um código de verificação por SMS para <span className="text-white">{normalizePhone(phone)}</span>.
            </p>
            <div>
              <label className="mb-1 block text-xs text-white/50">Código de verificação</label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  required
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-3 text-sm tracking-[0.3em] text-white outline-none focus:border-orbit-purple"
                />
              </div>
            </div>

            {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}

            <button
              type="submit"
              disabled={phoneLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {phoneLoading ? "Verificando..." : (
                <>
                  Verificar e criar conta <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(""); setPhoneError(null); }}
              className="w-full text-center text-xs text-white/40 hover:text-white/70"
            >
              Trocar número ou reenviar código
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Nome e sobrenome</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orbit-purple"
              />
            </div>
          </div>

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
            <label className="mb-1 block text-xs text-white/50">Data de nascimento</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                inputMode="numeric"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(formatBirthDateInput(e.target.value, birthDateInput))}
                placeholder="DD / MM / AAAA"
                maxLength={10}
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Criando..." : (
              <>
                Continuar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-white/50">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-orbit-cyan hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
