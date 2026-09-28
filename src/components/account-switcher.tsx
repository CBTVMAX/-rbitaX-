"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Loader2, Plus, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCOUNTS_EVENT,
  MAX_ACCOUNTS,
  getAccounts,
  markAddingAccount,
  rememberAccount,
  removeAccount,
  type StoredAccount,
} from "@/lib/accounts";

function Avatar({ name, avatarUrl, size = 34 }: { name: string; avatarUrl: string | null; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <User className="h-1/2 w-1/2 text-orbit-blue/80" />
      )}
    </span>
  );
}

/**
 * Lista de contas com troca rápida. Mostra a conta ativa (do servidor) e as outras contas
 * já adicionadas neste navegador; tocar em outra troca a sessão sem pedir senha. Adicionar
 * leva ao login (a conta atual continua guardada). Remover apaga só o acesso rápido daquela
 * conta neste aparelho.
 */
export function AccountSwitcher({
  activeId,
  activeName,
  activeUsername,
  activeAvatarUrl,
}: {
  activeId: string;
  activeName: string;
  activeUsername: string;
  activeAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [list, setList] = useState<StoredAccount[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setList(getAccounts().list);
    load();
    window.addEventListener(ACCOUNTS_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(ACCOUNTS_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // A conta ativa sempre aparece no topo, mesmo antes do sync gravar no registro.
  const others = list.filter((a) => a.id !== activeId);
  const canAdd = others.length + 1 < MAX_ACCOUNTS;

  async function switchTo(acc: StoredAccount) {
    if (busy) return;
    setError(null);
    setBusy(acc.id);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.refreshSession({ refresh_token: acc.refreshToken });
      if (err || !data.session) {
        // Token expirou ou foi revogado (troca de senha, logout em todos os aparelhos…): pede login.
        removeAccount(acc.id);
        markAddingAccount();
        router.push("/entrar?add=1");
        return;
      }
      // Sessão trocada nos cookies; atualiza o token guardado e recarrega para o servidor reavaliar.
      rememberAccount({
        id: acc.id,
        name: acc.name,
        username: acc.username,
        avatarUrl: acc.avatarUrl,
        refreshToken: data.session.refresh_token,
      });
      window.location.href = "/feed";
    } catch {
      setBusy(null);
      setError("Não foi possível trocar de conta agora. Tente de novo.");
    }
  }

  function addAccount() {
    markAddingAccount();
    router.push("/entrar?add=1");
  }

  return (
    <div className="py-1">
      <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Suas contas</p>

      {/* Conta ativa */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Avatar name={activeName} avatarUrl={activeAvatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{activeName}</span>
          <span className="block truncate text-xs text-white/50">@{activeUsername}</span>
        </span>
        <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Conta atual" />
      </div>

      {/* Outras contas */}
      {others.map((acc) => (
        <div key={acc.id} className="group flex items-center gap-3 px-4 py-2 hover:bg-white/5">
          <button
            type="button"
            onClick={() => switchTo(acc)}
            disabled={!!busy}
            className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
            aria-label={`Trocar para ${acc.name}`}
          >
            <Avatar name={acc.name} avatarUrl={acc.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white/85">{acc.name}</span>
              <span className="block truncate text-xs text-white/45">@{acc.username}</span>
            </span>
            {busy === acc.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/60" />}
          </button>
          <button
            type="button"
            onClick={() => removeAccount(acc.id)}
            disabled={!!busy}
            aria-label={`Remover ${acc.name} deste aparelho`}
            title="Remover deste aparelho"
            className="shrink-0 rounded-full p-1 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white/70 focus:opacity-100 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {error && <p className="px-4 py-1 text-xs text-red-400">{error}</p>}

      {canAdd && (
        <button
          type="button"
          onClick={addAccount}
          className={clsx("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5")}
        >
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-white/60">
            <Plus className="h-4 w-4" />
          </span>
          Adicionar conta
        </button>
      )}
    </div>
  );
}
