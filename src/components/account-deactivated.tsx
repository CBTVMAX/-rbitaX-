"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, LogOut, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrbitLogo } from "@/components/orbit-logo";
import { disablePush } from "@/lib/push-client";
import { endPresenceForSignOut } from "@/components/presence-heartbeat";
import { getAccounts, removeAccount } from "@/lib/accounts";

/** "2 de novembro de 2026" */
export function deletionDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-space-bg bg-stars px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-space-surface/90 p-6 text-center shadow-2xl md:p-8">
        <OrbitLogo size={48} className="mx-auto" />
        {children}
      </div>
    </div>
  );
}

function DateBadge({ until }: { until: string }) {
  return (
    <div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
      <CalendarClock className="h-5 w-5 shrink-0 text-orbit-cyan" />
      <span>
        <span className="block text-[11px] uppercase tracking-wider text-white/45">Pode restaurar até</span>
        <span className="block text-[15px] font-semibold text-white">{deletionDate(until)}</span>
      </span>
    </div>
  );
}

/** Tela de quem entrou com a página desativada (como no VK: "Restaurar página"). */
export function RestoreAccountScreen({ until, name }: { until: string; name: string }) {
  const [busy, setBusy] = useState<"restore" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy("restore");
    setError(null);
    const { error: e } = await createClient().rpc("restore_my_account");
    if (e) {
      setBusy(null);
      return setError("Não foi possível restaurar agora. Tente de novo em instantes.");
    }
    window.location.href = "/feed";
  }

  async function signOut() {
    setBusy("out");
    const supabase = createClient();
    await disablePush(supabase).catch(() => undefined);
    await endPresenceForSignOut().catch(() => undefined);
    const active = getAccounts().activeId;
    if (active) removeAccount(active);
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <Frame>
      <h1 className="mt-5 font-display text-xl font-bold text-white">Sua página foi excluída</h1>
      <p className="mt-2 text-sm text-white/65">
        {name.split(" ")[0]}, sua página está desativada e ninguém consegue vê-la. Depois da data abaixo, ela e tudo o que você publicou
        serão apagados de vez.
      </p>
      <DateBadge until={until} />
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={restore}
          disabled={!!busy}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restaurar minha página
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={!!busy}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
        >
          {busy === "out" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sair
        </button>
      </div>
      <p className="mt-5 text-[11px] text-white/40">Ao restaurar, seu perfil, publicações, amizades e conversas voltam exatamente como estavam.</p>
    </Frame>
  );
}

/** Confirmação logo depois de pedir a exclusão (a pessoa já saiu da conta). */
export function DeactivatedNotice({ until }: { until: string | null }) {
  return (
    <Frame>
      <h1 className="mt-5 font-display text-xl font-bold text-white">Página excluída</h1>
      <p className="mt-2 text-sm text-white/65">
        Sua página foi desativada e já não aparece para ninguém. Mudou de ideia? Basta entrar de novo com seu e-mail e senha para restaurar tudo.
      </p>
      {until && <DateBadge until={until} />}
      <Link
        href="/entrar"
        className="mt-6 flex min-h-[46px] w-full items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
      >
        Entrar e restaurar
      </Link>
      <Link href="/" className="mt-3 inline-block text-xs text-white/45 hover:text-white/70">
        Voltar para o início
      </Link>
    </Frame>
  );
}
