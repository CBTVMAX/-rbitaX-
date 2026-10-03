import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Verificação em duas etapas por e-mail ou SMS (como no VK). O código nasce e é conferido no banco
 * (funções tf_*, só service role); aqui ele é apenas entregue — pelo Resend (e-mail) ou Twilio (SMS).
 */

export const TRUST_COOKIE = "ox_td";
export const TRUST_DAYS = 30;

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export type TwoFactorStatus = {
  enabled: boolean;
  emailOn: boolean;
  email: string | null;
  phone: string | null;
  totp: boolean;
  backupLeft: number;
  devices: number;
  sessionOk: boolean;
};

export type Ctx = { user: User; sessionId: string; aal: string; svc: SupabaseClient };

export function channelsAvailable() {
  return {
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM)),
  };
}

/** Mesma origem + corpo pequeno em JSON. */
export async function readBody<T>(req: NextRequest): Promise<T | NextResponse> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden_origin" }, 403);
  } catch {
    return json({ error: "forbidden_origin" }, 403);
  }
  const raw = await req.text();
  if (raw.length > 2048) return json({ error: "payload_too_large" }, 413);
  try {
    return JSON.parse(raw || "{}") as T;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
}

/** Pessoa e sessão do login atual (validados pelo Supabase Auth), mais o cliente de serviço. */
export async function context(): Promise<Ctx | NextResponse> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "not_authenticated" }, 401);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let claims: { sub?: string; session_id?: string; aal?: string } = {};
  try {
    claims = JSON.parse(Buffer.from((token ?? "").split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return json({ error: "not_authenticated" }, 401);
  }
  if (claims.sub !== user.id || !claims.session_id) return json({ error: "not_authenticated" }, 401);
  const svc = createServiceClient();
  if (!svc) return json({ error: "unavailable" }, 503);
  return { user, sessionId: claims.session_id, aal: claims.aal ?? "aal1", svc: svc as unknown as SupabaseClient };
}

export async function status(ctx: Ctx): Promise<TwoFactorStatus | null> {
  const { data, error } = await ctx.svc.rpc("tf_status", { p_user: ctx.user.id, p_session: ctx.sessionId });
  return error ? null : (data as TwoFactorStatus);
}

/** Mantém app_metadata.two_factor em dia: o middleware usa para saber quem precisa do código. */
export async function syncFlag(ctx: Ctx, enabled: boolean) {
  if (Boolean(ctx.user.app_metadata?.two_factor) === enabled) return;
  await ctx.svc.auth.admin.updateUserById(ctx.user.id, { app_metadata: { two_factor: enabled } });
}

export function maskEmail(email: string | null) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shown = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(2, Math.min(6, name.length - shown.length)))}@${domain}`;
}

export function maskPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+55") && digits.length >= 12) return `+55 (${digits.slice(2, 4)}) •••••-${digits.slice(-4)}`;
  return `+${digits.slice(0, digits.length - 8)} •••• ${digits.slice(-4)}`;
}

/** Número brasileiro sem DDI ganha +55; resultado em E.164 ou null. */
export function normalizePhone(value: string) {
  let digits = value.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) {
    digits = digits.replace(/^0+/, "");
    digits = digits.length <= 11 ? `+55${digits}` : `+${digits}`;
  }
  return /^\+[1-9]\d{9,14}$/.test(digits) ? digits : null;
}

export function publicStatus(s: TwoFactorStatus) {
  return {
    enabled: s.enabled,
    emailOn: s.emailOn,
    email: maskEmail(s.email),
    phone: maskPhone(s.phone),
    totp: s.totp,
    backupLeft: s.backupLeft,
    devices: s.devices,
    sessionOk: s.sessionOk,
    available: channelsAvailable(),
  };
}

export function issueError(message: string) {
  if (message.includes("tf_wait")) return json({ error: "wait", message: "Aguarde um pouco antes de pedir outro código." }, 429);
  if (message.includes("tf_limit")) return json({ error: "limit", message: "Muitos códigos pedidos. Tente de novo em uma hora." }, 429);
  if (message.includes("tf_phone")) return json({ error: "phone", message: "Número de celular inválido. Use DDD + número." }, 400);
  if (message.includes("tf_no_email")) return json({ error: "no_email", message: "Sua conta não tem e-mail cadastrado." }, 400);
  if (message.includes("tf_channel_off")) return json({ error: "channel_off", message: "Essa forma de receber o código não está ativa." }, 400);
  return json({ error: "failed", message: "Não foi possível enviar o código agora." }, 500);
}

// ---------------------------------------------------------------- entrega

function emailHtml(code: string, purpose: "login" | "setup") {
  const title = purpose === "login" ? "Seu código de acesso" : "Confirme a verificação em duas etapas";
  const lead =
    purpose === "login"
      ? "Use o código abaixo para concluir a entrada na sua conta do Órbita X."
      : "Use o código abaixo para ativar o envio de códigos para este e-mail.";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0d1a;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8e9f3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#141729;border:1px solid #262a45;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;color:#fff;padding-bottom:4px">Órbita X</td></tr>
<tr><td style="font-size:16px;font-weight:600;color:#fff;padding:16px 0 6px">${title}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#a9adc6;padding-bottom:20px">${lead}</td></tr>
<tr><td align="center" style="padding:8px 0 20px"><div style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;color:#fff;background:#1d2140;border-radius:14px;padding:14px 22px">${code}</div></td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#7f84a3">O código vale por 10 minutos. Se não foi você, ignore este e-mail e troque sua senha em Configurações › Segurança. Nunca compartilhe este código — a equipe do Órbita X nunca pede.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function deliver(channel: "email" | "sms", target: string, code: string, purpose: "login" | "setup") {
  if (channel === "email") {
    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Órbita X <seguranca@orbitax.social.br>",
        to: [target],
        subject: `${code} é o seu código do Órbita X`,
        html: emailHtml(code, purpose),
        text: `Seu código do Órbita X: ${code}\n\nVale por 10 minutos. Se não foi você, ignore este e-mail. Nunca compartilhe este código.`,
      }),
    }).catch(() => null);
    return Boolean(res?.ok);
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tokenTw = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tokenTw) return false;
  const form = new URLSearchParams({ To: target, Body: `Órbita X: seu código é ${code}. Vale por 10 minutos. Não compartilhe.` });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else if (process.env.TWILIO_FROM) form.set("From", process.env.TWILIO_FROM);
  else return false;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tokenTw}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  }).catch(() => null);
  return Boolean(res?.ok);
}
