import type { NextRequest } from "next/server";
import { context, json, readBody, status } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

/** Gera 10 códigos de reserva novos (os anteriores deixam de valer). Mostrados uma única vez. */
export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, never>>(req);
  if (body instanceof Response) return body;
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const s = await status(ctx);
  if (!s) return json({ error: "failed" }, 500);
  if (!s.enabled && !s.totp) return json({ error: "not_enabled", message: "Ative a verificação em duas etapas primeiro." }, 400);
  if (!s.sessionOk) return json({ error: "verify_first" }, 403);
  const { data, error } = await ctx.svc.rpc("tf_backup_new", { p_user: ctx.user.id });
  if (error || !Array.isArray(data)) return json({ error: "failed" }, 500);
  return json({ ok: true, codes: data });
}
