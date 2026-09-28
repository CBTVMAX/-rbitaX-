import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mpGetPayment, mpVerifySignature, webhookSecretConfigured } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — notificações do MP são pequenas.
const isProd = process.env.NODE_ENV === "production";

/**
 * Webhook do Mercado Pago (compra de Diamantes).
 *
 * Ordem obrigatória (nada é gravado no banco antes de validar):
 *  1. receber  2. limitar tamanho do corpo  3. ler headers  4. validar assinatura
 *  5. exigir x-request-id  6. registrar (anti-replay via índice único)  7. buscar o
 *  pagamento real no MP  8. só então creditar (idempotente). Corpo da notificação nunca
 *  é confiado como fonte de verdade.
 */
export async function POST(req: NextRequest) {
  // 5.b Sem segredo em produção → recusa (nunca "sem segredo = aceita").
  if (isProd && !webhookSecretConfigured()) {
    console.error("mp_webhook: MERCADOPAGO_WEBHOOK_SECRET ausente em produção");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  const svc = createServiceClient();
  if (!svc) {
    console.error("mp_webhook: service role ausente");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // 2. Limite de tamanho do corpo (Content-Length + leitura limitada).
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (declaredLen > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  // 3. Headers necessários.
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const url = new URL(req.url);

  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = String(payload.type ?? payload.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const dataObj = (payload.data as { id?: string | number } | undefined) ?? undefined;
  const dataId = String(dataObj?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  // 4. Validar assinatura ANTES de qualquer gravação.
  const signatureOk = mpVerifySignature({ xSignature, xRequestId, dataId });
  if (webhookSecretConfigured() && !signatureOk) {
    // Requisição inválida: NÃO grava payload arbitrário no banco.
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 5. x-request-id é obrigatório para a proteção anti-replay.
  if (!xRequestId) return NextResponse.json({ error: "missing_request_id" }, { status: 400 });

  // 6. Registrar a entrega (índice único por requestId) → anti-replay. Só depois de validada.
  const { error: dupeErr } = await svc.from("WebhookEvent").insert({
    provider: "mercadopago", eventType: type, resourceId: dataId, requestId: xRequestId,
    signatureOk, status: "received", payload: payload as never,
  } as never);
  if (dupeErr) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  if (type !== "payment" || !dataId) {
    await markProcessed(svc, xRequestId, "ignored", "not_a_payment");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 7. Buscar o pagamento real no MP (não confiar no corpo).
  const payment = await mpGetPayment(dataId);
  if (!payment) {
    await markProcessed(svc, xRequestId, "error", "payment_fetch_failed");
    return NextResponse.json({ received: true }, { status: 200 });
  }
  const orderId = payment.external_reference ?? "";
  if (!orderId) {
    await markProcessed(svc, xRequestId, "ignored", "no_external_reference");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 8. Creditar (idempotente) só depois de tudo validado.
  try {
    if (payment.status === "approved") {
      await svc.rpc("diamond_credit_order", {
        p_order_id: orderId, p_provider_payment_id: payment.id,
        p_raw_status: payment.status, p_amount_brl: payment.transaction_amount,
      });
    } else if (payment.status === "refunded" || payment.status === "charged_back") {
      await svc.rpc("diamond_fail_order", { p_order_id: orderId, p_status: "refunded", p_raw_status: payment.status });
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await svc.rpc("diamond_fail_order", { p_order_id: orderId, p_status: payment.status, p_raw_status: payment.status_detail ?? payment.status });
    } else {
      await svc.rpc("diamond_fail_order", { p_order_id: orderId, p_status: "in_process", p_raw_status: payment.status });
    }
    await markProcessed(svc, xRequestId, "processed", payment.status);
  } catch (e) {
    console.error("mp_webhook credit error", e);
    await markProcessed(svc, xRequestId, "error", "credit_failed");
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function markProcessed(
  svc: NonNullable<ReturnType<typeof createServiceClient>>,
  requestId: string | null,
  status: string,
  note: string
) {
  if (!requestId) return;
  await svc
    .from("WebhookEvent")
    .update({ status, note, processedAt: new Date().toISOString() } as never)
    .eq("requestId", requestId)
    .eq("provider", "mercadopago");
}
