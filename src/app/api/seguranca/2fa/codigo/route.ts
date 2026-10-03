import type { NextRequest } from "next/server";
import { channelsAvailable, context, deliver, issueError, json, maskEmail, maskPhone, normalizePhone, readBody, status } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

/**
 * Envia um código de 6 dígitos.
 * purpose "login": confirmar a entrada (canal já ativo na conta).
 * purpose "setup": ativar um canal novo (e-mail da conta ou um celular informado).
 */
export async function POST(req: NextRequest) {
  const body = await readBody<{ purpose?: unknown; channel?: unknown; phone?: unknown }>(req);
  if (body instanceof Response) return body;
  const purpose = body.purpose === "setup" ? "setup" : body.purpose === "login" ? "login" : null;
  const channel = body.channel === "sms" ? "sms" : body.channel === "email" ? "email" : null;
  if (!purpose || !channel) return json({ error: "bad_request" }, 400);
  if (!channelsAvailable()[channel]) {
    return json({ error: "channel_unavailable", message: channel === "sms" ? "O envio por SMS ainda não está disponível." : "O envio por e-mail ainda não está disponível." }, 503);
  }

  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const s = await status(ctx);
  if (!s) return json({ error: "failed" }, 500);
  if (purpose === "login" && !s.enabled) return json({ error: "not_enabled" }, 400);
  // Mudar as opções exige uma sessão já confirmada (quando a verificação está ativa).
  if (purpose === "setup" && s.enabled && !s.sessionOk) return json({ error: "verify_first" }, 403);

  let phone: string | null = null;
  if (purpose === "setup" && channel === "sms") {
    phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
    if (!phone) return json({ error: "phone", message: "Número de celular inválido. Use DDD + número." }, 400);
  }

  const { data, error } = await ctx.svc.rpc("tf_issue", {
    p_user: ctx.user.id,
    p_session: ctx.sessionId,
    p_purpose: purpose,
    p_channel: channel,
    p_target: phone,
  });
  if (error) return issueError(error.message ?? "");
  const issued = data as { code: string; target: string };
  const sent = await deliver(channel, issued.target, issued.code, purpose);
  if (!sent) return json({ error: "send_failed", message: "Não conseguimos enviar o código agora. Tente de novo em instantes." }, 502);
  return json({ ok: true, channel, target: channel === "email" ? maskEmail(issued.target) : maskPhone(issued.target) });
}
