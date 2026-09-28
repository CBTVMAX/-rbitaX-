"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { rememberAccount } from "@/lib/accounts";

/**
 * Mantém o registro de contas em dia com a sessão viva: guarda o refresh token atual da
 * conta ativa (ele gira a cada renovação, então precisa ser re-sincronizado) junto com o
 * perfil que o servidor já renderizou. É montado no layout autenticado, então toda vez que
 * alguém entra/troca de conta, essa conta passa a existir para a "troca rápida".
 */
export function AccountSync({
  userId,
  name,
  username,
  avatarUrl,
}: {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}) {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const save = (refreshToken?: string | null) => {
      if (!refreshToken || cancelled) return;
      rememberAccount({ id: userId, name, username, avatarUrl, refreshToken });
    };

    // Captura a sessão atual assim que monta.
    supabase.auth.getSession().then(({ data }) => save(data.session?.refresh_token));

    // E acompanha renovações/entradas desta mesma conta (o token gira periodicamente).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== userId) return; // só a conta que o servidor renderizou
      save(session.refresh_token);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [userId, name, username, avatarUrl]);

  return null;
}
