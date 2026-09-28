import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mpConfigured, mpCreatePreference } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Pagamento ainda não habilitado no ambiente: o app mostra "em configuração".
  if (!mpConfigured()) return NextResponse.json({ configured: false }, { status: 200 });

  let packageId = "";
  try {
    const body = (await req.json()) as { packageId?: string };
    packageId = String(body.packageId ?? "");
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!packageId) return NextResponse.json({ error: "package_required" }, { status: 400 });

  // O pedido (valor e quantidade) é criado pelo banco a partir do pacote — nunca pelo cliente.
  const { data: order, error } = await supabase.rpc("create_diamond_order", { p_package_id: packageId });
  if (error || !order) {
    const msg = /rate_limited/.test(error?.message ?? "") ? "rate_limited" : "order_failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const o = order as { orderId: string; diamonds: number; amountBRL: number; label: string };

  const base = baseUrl(req);
  const pref = await mpCreatePreference({
    orderId: o.orderId,
    title: o.label || `${o.diamonds} Diamantes`,
    quantity: 1,
    unitPrice: Number(o.amountBRL),
    currency: "BRL",
    notificationUrl: `${base}/api/webhooks/mercadopago`,
    backUrls: {
      success: `${base}/diamantes?status=sucesso`,
      pending: `${base}/diamantes?status=pendente`,
      failure: `${base}/diamantes?status=falha`,
    },
    payerEmail: user.email ?? null,
    metadata: { orderId: o.orderId, userId: user.id, diamonds: o.diamonds },
  });

  if (!pref) return NextResponse.json({ error: "provider_error" }, { status: 502 });

  // Guarda o id da preference no pedido (rastreabilidade).
  await supabase.rpc("diamond_attach_provider_ref", { p_order_id: o.orderId, p_provider_ref: pref.id });

  return NextResponse.json({ initPoint: pref.initPoint, orderId: o.orderId });
}
