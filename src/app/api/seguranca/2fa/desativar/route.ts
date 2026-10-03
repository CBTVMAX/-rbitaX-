import type { NextRequest } from "next/server";
import { context, json, readBody, status, syncFlag, TRUST_COOKIE } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

/** Desconecta o e-mail ou o celular. Sem nenhum dos dois, a verificação por código é desligada. */
export async function POST(req: NextRequest) {
  const body = await readBody<{ channel?: unknown }>(req);
  if (body instanceof Response) return body;
  const channel = body.channel === "sms" ? "sms" : body.channel === "email" ? "email" : null;
  if (!channel) return json({ error: "bad_request" }, 400);
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const s = await status(ctx);
  if (!s) return json({ error: "failed" }, 500);
  if (!s.sessionOk) return json({ error: "verify_first" }, 403);
  const { data: stillOn, error } = await ctx.svc.rpc("tf_disable", { p_user: ctx.user.id, p_channel: channel });
  if (error) return json({ error: "failed" }, 500);
  await syncFlag(ctx, Boolean(stillOn));
  const res = json({ ok: true, enabled: Boolean(stillOn) });
  if (!stillOn) res.cookies.set(TRUST_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
