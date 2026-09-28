// Ordena a mídia de uma publicação pela coluna `position` (ordem em que foi enviada) e
// devolve só os campos que o card usa. Server-safe (sem "use client").
type RawMedia = { id: string; type: string; url: string; position?: number | null };

export function sortMedia(media: unknown): { id: string; type: string; url: string }[] {
  const arr = (media as RawMedia[] | null) ?? [];
  return [...arr]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(({ id, type, url }) => ({ id, type, url }));
}
