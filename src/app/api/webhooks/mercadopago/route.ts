import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mpGetPayment, mpVerifySignature, webhookSecretConfigured } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago para compra de Diamantes.
 *
 * Segurança:
 *  - valida a assinatura (x-signature) quando o segredo está configurado;
 *  - registra cada entrega em WebhookEvent (índice único por x-request-id) → anti-replay;
 *  - NUNCA confia no corpo da notificação: busca o pagamento real na API do MP;
 *  - credita via diamond_credit_order (idempotente, valor conferido, uma única vez).
 */
export async function POST(req: NextRequest) {
  const svc = createServiceClient();
  if (!svc) {
    // Sem service role configurada não há como creditar com segurança. Aceita para o MP não repetir infinitamente.
    console.error("mp_webhook: service role not configured");
    return NextResponse.json({ received: true, configured: false }, { status: 200 });
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const url = new URL(req.url);
  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  // O MP manda type/topic e data.id (no corpo ou na query).
  const type = String(payload.type ?? payload.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const dataObj = (payload.data as { id?: string | number } | undefined) ?? undefined;
  const dataId = String(dataObj?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  const signatureOk = mpVerifySignature({ xSignature, xRequestId, dataId });
  // Com segredo configurado, assinatura inválida é rejeitada.
  if (webhookSecretConfigured() && !signatureOk) {
    await svc.from("WebhookEvent").insert({
      provider: "mercadopago", eventType: type, resourceId: dataId, requestId: xRequestId,
      signatureOk: false, status: "ignored", payload: payload as never, note: "invalid_signature",
    } as never);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Anti-replay: cada x-request-id é processado uma única vez.
  const { error: dupeErr } = await svc.from("WebhookEvent").insert({
    provider: "mercadopago", eventType: type, resourceId: dataId, requestId: xRequestId,
    signatureOk, status: "received", payload: payload as never,
  } as never);
  if (dupeErr) {
    // Violação de unicidade → entrega repetida; já tratada.
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // Só tratamos notificações de pagamento.
  if (type !== "payment" || !dataId) {
    await markProcessed(svc, xRequestId, "ignored", "not_a_payment");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const payment = await mpGetPayment(dataId);
  if (!payment) {
    await markProcessed(svc, xRequestId, "error", "payment_fetch_failed");
    // 200 para não entrar em loop; o MP reenvia e tentamos de novo com novo request-id.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const orderId = payment.external_reference ?? "";
  if (!orderId) {
    await markProcessed(svc, xRequestId, "ignored", "no_external_reference");
    return NextResponse.json({ received: true }, { status: 200 });
  }

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
