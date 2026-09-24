"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { ArrowRight, Calendar, UserRound } from "lucide-react";

const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const GENDER_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

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

export default function CompletarCadastroPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [gender, setGender] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/entrar");
        return;
      }
      setChecking(false);
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const birthDate = parseBirthDate(birthDateInput);
    if (!birthDate) {
      setError("Digite uma data de nascimento válida (DD/MM/AAAA).");
      return;
    }
    if (calcAge(birthDate) < 18) {
      setError("Você precisa ter 18 anos ou mais para criar uma conta no Órbita X.");
      return;
    }
    if (!gender) {
      setError("Selecione seu gênero.");
      return;
    }
    if (!agreeTerms) {
      setError("Você precisa aceitar os Termos de Uso.");
      return;
    }
    if (!agreePrivacy) {
      setError("Você precisa aceitar a Política de Privacidade.");
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc("complete_signup", {
      p_birth_date: birthDate,
      p_gender: gender,
      p_terms_version: TERMS_VERSION,
      p_privacy_version: PRIVACY_VERSION,
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(true);
  }

  if (checking) return null;

  if (done) {
    return (
      <AuthShell title="Tudo pronto" subtitle="Sua conta está completa." eyebrow="Criar conta">
        <div className="rounded-2xl border border-white/10 bg-space-card p-6 text-center">
          <p className="mb-1 text-2xl">🛰️</p>
          <h2 className="mb-6 font-display text-xl font-bold text-white">Bem-vindo ao Órbita X</h2>
          <button
            onClick={() => { router.push("/feed"); router.refresh(); }}
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
      title="Complete seu cadastro"
      eyebrow="Quase lá"
      subtitle="Precisamos de mais algumas informações antes de você entrar no Órbita X."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
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

        <label className="flex items-start gap-2 text-xs text-white/50">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5" />
          Li e concordo com os{" "}
          <Link href="/termos" className="text-orbit-cyan hover:underline">Termos de Uso</Link>.
        </label>
        <label className="flex items-start gap-2 text-xs text-white/50">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5" />
          Li e concordo com a{" "}
          <Link href="/privacidade" className="text-orbit-cyan hover:underline">Política de Privacidade</Link>.
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Salvando..." : (
            <>
              Continuar <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
