import "server-only";
import crypto from "node:crypto";

/**
 * Integração com o Mercado Pago (Checkout Pro) via API REST — sem SDK extra.
 * Segredos vêm só do ambiente do servidor (nunca do repositório nem do cliente):
 *   MERCADOPAGO_ACCESS_TOKEN   — cria preferences e consulta pagamentos
 *   MERCADOPAGO_WEBHOOK_SECRET — valida a assinatura das notificações
 */
const MP_API = "https://api.mercadopago.com";

export function mpConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function token() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("mercadopago_not_configured");
  return t;
}

export type MpPreferenceInput = {
  orderId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  notificationUrl: string;
  backUrls: { success: string; pending: string; failure: string };
  payerEmail?: string | null;
  metadata?: Record<string, unknown>;
};

export async function mpCreatePreference(input: MpPreferenceInput): Promise<{ id: string; initPoint: string } | null> {
  const body = {
    items: [
      {
        id: input.orderId,
        title: input.title,
        quantity: Math.max(1, Math.round(input.quantity)),
        unit_price: Number(input.unitPrice),
        currency_id: input.currency ?? "BRL",
      },
    ],
    external_reference: input.orderId,
    notification_url: input.notificationUrl,
    back_urls: input.backUrls,
    auto_return: "approved",
    metadata: input.metadata ?? {},
    ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
  };
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      // Idempotência na criação da preference (evita duplicar em reenvio).
      "X-Idempotency-Key": `pref-${input.orderId}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("mp_create_preference_failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { id?: string; init_point?: string; sandbox_init_point?: string };
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!data.id || !initPoint) return null;
  return { id: data.id, initPoint };
}

export type MpPayment = {
  id: string;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  transaction_amount: number;
  external_reference?: string | null;
  currency_id?: string;
};

export async function mpGetPayment(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("mp_get_payment_failed", res.status);
    return null;
  }
  const p = (await res.json()) as Record<string, unknown>;
  return {
    id: String(p.id),
    status: String(p.status ?? ""),
    status_detail: p.status_detail ? String(p.status_detail) : undefined,
    transaction_amount: Number(p.transaction_amount ?? 0),
    external_reference: (p.external_reference as string) ?? null,
    currency_id: p.currency_id ? String(p.currency_id) : undefined,
  };
}

/**
 * Valida a assinatura (x-signature / x-request-id) do webhook do Mercado Pago.
 * Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * Retorna false quando o segredo não está configurado (o chamador decide a política).
 */
export function mpVerifySignature(opts: { xSignature: string | null; xRequestId: string | null; dataId: string | null }): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !opts.xSignature || !opts.dataId) return false;
  const parts: Record<string, string> = {};
  for (const kv of opts.xSignature.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const id = /[a-zA-Z]/.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  const manifest = `id:${id};request-id:${opts.xRequestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

export function webhookSecretConfigured() {
  return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET);
}
