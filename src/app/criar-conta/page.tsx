"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";

const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const GENDER_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

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

function calcAge(isoDate: string) {
  const birth = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  return `+55${digits}`;
}

type Step = "form" | "otp" | "welcome";

export default function CriarContaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<{ name: string; username: string; orbitId: string } | null>(null);

  function validateForm(): string | null {
    if (!name.trim()) return "Digite seu nome e sobrenome.";
    const birthDate = parseBirthDate(birthDateInput);
    if (!birthDate) return "Digite uma data de nascimento válida (DD/MM/AAAA).";
    if (calcAge(birthDate) < 18) return "Você precisa ter 18 anos ou mais para criar uma conta no Órbita X.";
    if (!gender) return "Selecione seu gênero.";
    if (mode === "email" && !email.trim()) return "Digite seu e-mail.";
    if (mode === "phone" && !phone.trim()) return "Digite seu número de celular.";
    if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (!agreeTerms) return "Você precisa aceitar os Termos de Uso.";
    if (!agreePrivacy) return "Você precisa aceitar a Política de Privacidade.";
    return null;
  }

  async function sendCode() {
    const metadata = {
      name,
      birthDate: parseBirthDate(birthDateInput),
      gender,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    };

    if (mode === "email") {
      return supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data: metadata },
      });
    }
    return supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
      options: { shouldCreateUser: true, data: metadata },
    });
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    const { error: otpError } = await sendCode();
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep("otp");
  }

  async function handleResendCode() {
    setError(null);
    setLoading(true);
    const { error: otpError } = await sendCode();
    setLoading(false);
    if (otpError) setError(otpError.message);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyError } =
      mode === "email"
        ? await supabase.auth.verifyOtp({ email, token: otp, type: "email" })
        : await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: otp, type: "sms" });

    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setLoading(false);
      setError(passwordError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("User")
        .select("name, username, orbitId")
        .eq("id", user.id)
        .single();
      setWelcome({
        name: profile?.name ?? name,
        username: profile?.username ?? "",
        orbitId: profile?.orbitId ?? "",
      });
    }

    setLoading(false);
    setStep("welcome");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function handleContinue() {
    router.push("/feed");
    router.refresh();
  }

  if (step === "welcome" && welcome) {
    return (
      <AuthShell title="Bem-vindo" subtitle="Sua conta foi criada." eyebrow="Criar conta">
        <div className="rounded-2xl border border-white/10 bg-space-card p-6 text-center">
          <p className="mb-1 text-2xl">🛰️</p>
          <h2 className="mb-6 font-display text-xl font-bold text-white">Bem-vindo ao Órbita X</h2>
          <div className="mb-6 space-y-3 text-left">
            <div>
              <p className="text-xs text-white/40">Nome</p>
              <p className="text-sm font-medium text-white">{welcome.name}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">@</p>
              <p className="text-sm font-medium text-white">@{welcome.username}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Orbit ID</p>
              <p className="text-sm font-medium text-white">#{welcome.orbitId}</p>
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </AuthShell>
    );
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
      {step === "form" && (
        <>
          <button
            type="button"
            onClick={() => setMode(mode === "phone" ? "email" : "phone")}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {mode === "phone" ? "Cadastrar com e-mail" : "Cadastrar com o número de celular"}
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

          <form onSubmit={handleSendCode} className="space-y-3">
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
              <label className="mb-1 block text-xs text-white/50">Data de nascimento</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  required
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
              <label className="mb-1 block text-xs text-white/50">Gênero</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-space-card py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orbit-purple"
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mode === "email" ? (
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
            ) : (
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
            )}

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
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5"
              />
              Li e concordo com os{" "}
              <Link href="/termos" className="text-orbit-cyan hover:underline">Termos de Uso</Link>.
            </label>
            <label className="flex items-start gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-0.5"
              />
              Li e concordo com a{" "}
              <Link href="/privacidade" className="text-orbit-cyan hover:underline">Política de Privacidade</Link>.
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Enviando código..." : (
                <>
                  Continuar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <p className="text-sm text-white/50">
            Enviamos um código de verificação por {mode === "email" ? "e-mail" : "SMS"} para{" "}
            <span className="text-white">{mode === "email" ? email : normalizePhone(phone)}</span>.
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

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : (
              <>
                Verificar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => { setStep("form"); setOtp(""); setError(null); }}
              className="text-white/40 hover:text-white/70"
            >
              Voltar
            </button>
            <button type="button" onClick={handleResendCode} disabled={loading} className="text-orbit-cyan hover:underline">
              Reenviar código
            </button>
          </div>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-white/50">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-orbit-cyan hover:underline">Entrar</Link>
      </p>
    </AuthShell>
  );
}
