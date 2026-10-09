/** Conta e aparência: preferências de conteúdo salvas na conta (public.my_preferences). */
export type UserPrefs = {
  feedOrder: "interesting" | "recent";
  commentOrder: "top" | "new" | "old";
  autoplayVideo: boolean;
  autoplayGif: boolean;
  profanityFilter: boolean;
};

export const DEFAULT_PREFS: UserPrefs = {
  feedOrder: "interesting",
  commentOrder: "top",
  autoplayVideo: true,
  autoplayGif: true,
  profanityFilter: false,
};

export function parsePrefs(raw: unknown): UserPrefs {
  const p = raw && typeof raw === "object" ? (raw as Partial<UserPrefs>) : {};
  return {
    feedOrder: p.feedOrder === "recent" ? "recent" : "interesting",
    commentOrder: p.commentOrder === "new" || p.commentOrder === "old" ? p.commentOrder : "top",
    autoplayVideo: p.autoplayVideo !== false,
    autoplayGif: p.autoplayGif !== false,
    profanityFilter: p.profanityFilter === true,
  };
}

// Palavrões e ofensas mais comuns em português (com variações). O texto original não muda: só a
// exibição para quem ligou o filtro.
const WORDS = [
  "porra", "caralho", "caralhos", "cacete", "merda", "merdas", "bosta", "bostas", "puta", "putas", "puto", "putaria",
  "fdp", "pqp", "vsf", "tnc", "foda", "fodase", "foda-se", "fodido", "fodida", "foder", "fudido", "fudida",
  "viado", "viados", "sapatão", "traveco", "buceta", "bucetas", "xoxota", "piroca",
  "cu", "cuzão", "cuzao", "arrombado", "arrombada", "babaca", "babacas", "otário", "otária", "otario", "otaria",
  "idiota", "idiotas", "imbecil", "imbecis", "retardado", "retardada", "desgraçado", "desgraçada", "desgraca", "desgraça",
  "vagabundo", "vagabunda", "vadia", "vadias", "piranha", "piranhas", "corno", "cornos", "escroto", "escrota",
  "lixo humano", "vai se foder", "vai tomar no cu", "filho da puta", "filha da puta",
];
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(`(?<![\\p{L}\\p{N}])(${[...new Set(WORDS)].sort((a, b) => b.length - a.length).map(escape).join("|")})(?![\\p{L}\\p{N}])`, "giu");

/** "porra" → "p••••". */
export function maskProfanity(text: string) {
  return text.replace(PATTERN, (m) => m[0] + "•".repeat(Math.max(2, m.length - 1)));
}
