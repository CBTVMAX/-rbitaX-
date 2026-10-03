import { context, json, publicStatus, status, syncFlag } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

/** Situação da verificação em duas etapas da conta (dados mascarados). */
export async function GET() {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const s = await status(ctx);
  if (!s) return json({ error: "failed" }, 500);
  await syncFlag(ctx, s.enabled);
  return json(publicStatus(s));
}
