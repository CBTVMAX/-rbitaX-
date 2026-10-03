import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Pedido de exclusão da conta (LGPD, art. 18), com prazo para voltar atrás, como no VK.
 * 1. A pessoa vem do login validado pelo cookie, nunca do corpo da requisição.
 * 2. Contas com senha confirmam a senha atual (verificada num cliente à parte, sem mexer na sessão do navegador).
 * 3. O banco confere as regras (EXCLUIR, sem comunidades próprias, não ser conta da equipe) e desativa
 *    a página por 6 meses. Todas as sessões são encerradas.
 * 4. Entrando de novo dentro do prazo, a pessoa vê "Restaurar página". Depois da data, a tarefa agendada
 *    (netlify/functions/purge-accounts) apaga a conta de vez.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden_origin" }, 403);
  } catch {
    return json({ error: "forbidden_origin" }, 403);
  }

  const raw = await req.text();
  if (raw.length > 2048) return json({ error: "payload_too_large" }, 413);
  let body: { confirm?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const confirm = typeof body.confirm === "string" ? body.confirm : "";
  const password = typeof body.password === "string" ? body.password : "";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "not_authenticated" }, 401);

  if (user.identities?.some((i) => i.provider === "email")) {
    if (!password || !user.email) return json({ error: "password_required" }, 400);
    const probe = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error } = await probe.auth.signInWithPassword({ email: user.email, password });
    if (error || signed.user?.id !== user.id) return json({ error: "wrong_password" }, 400);
    await probe.auth.signOut({ scope: "local" });
  }

  const { data: until, error } = await supabase.rpc("deactivate_my_account", { p_confirm: confirm });
  if (error) {
    const msg = error.message ?? "";
    if (msg.startsWith("possui_comunidades")) return json({ error: "owns_communities", count: Number(msg.split(":")[1]) || 1 }, 409);
    if (msg.includes("conta_administrativa")) return json({ error: "staff_account" }, 403);
    if (msg.includes("confirmacao_invalida")) return json({ error: "confirm_required" }, 400);
    return json({ error: "failed" }, 500);
  }

  // Sai de todos os aparelhos: a página fica desativada até a pessoa voltar.
  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  return json({ ok: true, until });
}
