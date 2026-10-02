"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function JoinChatButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("join_group_by_code", { p_code: code });
    if (error || !data) {
      setBusy(false);
      setError(/group_full/.test(error?.message ?? "") ? "Este chat está cheio (500 participantes)." : "Não foi possível entrar agora. O link pode ter mudado.");
      return;
    }
    router.replace(`/mensagens?c=${data}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Entrar no chat
      </button>
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </>
  );
}
