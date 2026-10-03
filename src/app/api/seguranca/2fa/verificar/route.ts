import type { NextRequest } from "next/server";
import { context, json, readBody, syncFlag, TRUST_COOKIE, TRUST_DAYS } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

function deviceLabel(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Aparelho";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${browser} · ${os}`;
}

/** Confere o código (ou um código de reserva, ao entrar). */
export async function POST(req: NextRequest) {
  const body = await readBody<{ purpose?: unknown; code?: unknown; trust?: unknown }>(req);
  if (body instanceof Response) return body;
  const purpose = body.purpose === "setup" ? "setup" : body.purpose === "login" ? "login" : null;
  const code = typeof body.code === "string" ? body.code.slice(0, 20) : "";
  if (!purpose || !code) return json({ error: "bad_request" }, 400);

  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.svc.rpc("tf_verify", { p_user: ctx.user.id, p_session: ctx.sessionId, p_purpose: purpose, p_code: code });
  if (error) return json({ error: "failed" }, 500);
  const result = data as { ok: boolean; reason?: string; left?: number; method?: string; backupLeft?: number };
  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "O código expirou. Peça um novo."
        : result.reason === "too_many"
          ? "Muitas tentativas erradas. Peça um novo código."
          : `Código incorreto.${typeof result.left === "number" ? ` Restam ${result.left} ${result.left === 1 ? "tentativa" : "tentativas"}.` : ""}`;
    return json({ ok: false, reason: result.reason, message }, 400);
  }

  if (purpose === "setup") await syncFlag(ctx, true);
  const res = json({ ok: true, method: result.method, backupLeft: result.backupLeft });
  if (purpose === "login" && body.trust === true) {
    const { data: token } = await ctx.svc.rpc("tf_trust_device", { p_user: ctx.user.id, p_label: deviceLabel(req.headers.get("user-agent") ?? "") });
    if (typeof token === "string") {
      res.cookies.set(TRUST_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TRUST_DAYS * 24 * 60 * 60,
      });
    }
  }
  return res;
}
