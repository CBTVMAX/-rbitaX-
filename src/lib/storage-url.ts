/**
 * Endereços de arquivos do Órbita X (fotos, vídeos, músicas). Nada é público: o arquivo abre por
 * /m/<bucket>/<caminho>, que confere o login e entrega um link temporário do armazenamento.
 * Assim, um endereço copiado não abre para quem não tem conta.
 */
export const MEDIA_ROUTE = "/m";

/**
 * Endereço completo (https://…/m/…): várias tabelas exigem links https, e o app Android e as
 * notificações também precisam do endereço inteiro. O site oficial é o padrão.
 */
export const SITE_ORIGIN = "https://orbitax.social.br";

export function storageUrl(bucket: string, path: string): string {
  return `${SITE_ORIGIN}${MEDIA_ROUTE}/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

const LEGACY = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/([a-z0-9-]+)\/(.+)$/;
const ROUTED = /^(?:https:\/\/(?:www\.)?orbitax\.social\.br)?\/m\/([a-z0-9-]+)\/(.+)$/;

/** Bucket e caminho de um endereço de arquivo nosso (formato novo ou antigo); null para outros. */
export function storagePathOf(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const clean = url.split(/[?#]/)[0];
  const m = clean.match(ROUTED) ?? clean.match(LEGACY);
  if (!m) return null;
  try {
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket: m[1], path: m[2] };
  }
}

/** É um arquivo enviado ao Órbita X (não um link de fora)? */
export const OWN_MEDIA = /^(?:https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public|(?:https:\/\/(?:www\.)?orbitax\.social\.br)?\/m)\//;
