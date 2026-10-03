import { createClient } from "@supabase/supabase-js";

/**
 * Exclusão definitiva das contas cujo prazo de 6 meses acabou (roda todo dia às 03:17 UTC).
 * Para cada conta vencida: o banco passa a posse dos grupos adiante e lista os arquivos,
 * que são apagados; por fim o login é removido e o gatilho on_auth_user_deleted apaga o perfil.
 */
export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("purge-accounts: SUPABASE_SERVICE_ROLE_KEY não configurada");
    return new Response("missing service key", { status: 503 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: due, error } = await supabase.rpc("accounts_due_for_deletion");
  if (error) {
    console.error("purge-accounts: falha ao listar contas", error.message);
    return new Response("error", { status: 500 });
  }

  let deleted = 0;
  for (const userId of (due as string[] | null) ?? []) {
    const { data: files, error: prepError } = await supabase.rpc("finalize_account_deletion", { p_user: userId });
    if (prepError) {
      console.error("purge-accounts: preparação falhou", userId, prepError.message);
      continue;
    }
    const byBucket = new Map<string, string[]>();
    for (const f of (files as { bucket: string; name: string }[] | null) ?? []) {
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.name]);
    }
    for (const [bucket, names] of byBucket) {
      for (let i = 0; i < names.length; i += 100) await supabase.storage.from(bucket).remove(names.slice(i, i + 100));
    }
    const { error: delError } = await supabase.auth.admin.deleteUser(userId);
    if (delError) console.error("purge-accounts: exclusão falhou", userId, delError.message);
    else deleted++;
  }

  console.log(`purge-accounts: ${deleted} conta(s) excluída(s) de ${(due as string[] | null)?.length ?? 0} vencida(s)`);
  return new Response(`ok ${deleted}`);
};

export const config = { schedule: "17 3 * * *" };
