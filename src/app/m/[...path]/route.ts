import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fotos, vídeos e músicas só para quem tem conta: confere o login e redireciona para um link
// temporário do armazenamento (1 h). O navegador guarda o redirecionamento por um tempo, então
// a mesma foto não passa por aqui a cada tela.
export const dynamic = "force-dynamic";

const BUCKETS = new Set(["media"]);
const SAFE = /^[A-Za-z0-9._\-/ ()]{1,400}$/;
const TTL = 3600;

export async function GET(_req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const parts = (await props.params).path ?? [];
  const [bucket, ...rest] = parts.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  const file = rest.join("/");
  if (!bucket || !BUCKETS.has(bucket) || !file || !SAFE.test(file) || file.includes("..")) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return new NextResponse(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(file, TTL);
  // Rede de segurança enquanto o armazenamento ainda aceita leitura pública: sem link assinado,
  // usa o endereço público (deixa de funcionar quando o bucket fica privado).
  const target = data?.signedUrl ?? supabase.storage.from(bucket).getPublicUrl(file).data.publicUrl;
  if (!target) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": data?.signedUrl ? `private, max-age=${TTL - 300}` : "private, max-age=60", "Referrer-Policy": "no-referrer" },
  });
}
