/**
 * Reconhecimento de faixas no Painel → Músicas.
 *   1. Lê as tags gravadas no próprio arquivo (ID3 do MP3, Vorbis do FLAC/OGG, RIFF do WAV):
 *      título, artista, álbum, ano, gênero, número da faixa, duração e capa embutida.
 *   2. Sem álbum nas tags, busca no MusicBrainz (via /api/admin/music/identify): álbum, ano e capa.
 *   3. Com ano e gênero, sugere a categoria do catálogo.
 */

export type Recognized = {
  title: string;
  artist: string;
  album: string;
  year: number | null;
  genres: string[];
  trackNo: number | null;
  duration: number | null;
  picture: Blob | null;
};

/** Tira do título o que não é nome da música: "(2011 Remaster)", "[Official Video]", "(Lyrics)", "HD"… */
export function cleanTitle(title: string) {
  return title
    .replace(/\s*[([][^)\]]*\b(remaster(ed)?|remasterizad[ao]|official|oficial|video|v[ií]deo|clipe|audio|[áa]udio|lyrics?|letra|hd|hq|4k|explicit)\b[^)\]]*[)\]]/gi, "")
    .replace(/\s+-\s+(\d{4}\s+)?remaster(ed)?(\s+\d{4})?(\s+version)?$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "01 - Queen - Bohemian Rhapsody.mp3" → artista e título. */
export function fromFileName(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").replace(/^\d{1,3}[\s.-]+/, "").trim();
  const parts = base.split(/\s[-–—]\s/);
  return parts.length >= 2 ? { artist: parts[0].trim(), title: cleanTitle(parts.slice(1).join(" - ")) } : { artist: "", title: cleanTitle(base) };
}

export async function readTags(file: File): Promise<Recognized> {
  const guess = fromFileName(file.name);
  const empty: Recognized = { title: guess.title, artist: guess.artist, album: "", year: null, genres: [], trackNo: null, duration: null, picture: null };
  try {
    const { parseBlob } = await import("music-metadata");
    const meta = await parseBlob(file, { duration: false, skipCovers: false });
    const c = meta.common;
    const pic = c.picture?.[0];
    return {
      title: cleanTitle(c.title ?? "") || guess.title,
      artist: (c.artist ?? c.albumartist ?? "").trim() || guess.artist,
      album: (c.album ?? "").trim(),
      year: c.year ?? null,
      genres: (c.genre ?? []).map((g) => g.trim()).filter(Boolean),
      trackNo: c.track?.no ?? null,
      duration: meta.format.duration ? Math.round(meta.format.duration) : null,
      picture: pic ? new Blob([new Uint8Array(pic.data)], { type: pic.format || "image/jpeg" }) : null,
    };
  } catch {
    return empty;
  }
}

export type Identified = { album: string | null; year: number | null; coverUrl: string | null; title: string; artist: string; duration: number | null; tags: string[] };

/** MusicBrainz (no servidor do Órbita X). Devolve null quando não reconhece. */
export async function identifyOnline(artist: string, title: string): Promise<Identified | null> {
  if (!artist.trim() || !title.trim()) return null;
  const res = await fetch(`/api/admin/music/identify?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as (Identified & { found?: boolean }) | null;
  return body?.found ? body : null;
}

const BRAZIL = /(sertanejo|forr[oó]|piseiro|arrocha|funk carioca|baile funk|brazilian funk|samba|pagode|ax[eé]|mpb|bossa|tropic[aá]lia|m[uú]sica popular brasileira|brazilian)/i;
const ROCK = /(rock|metal|grunge|punk|britpop|new wave|emo|hardcore)/i;

/** Categoria do catálogo a partir de ano e gêneros (mesma regra usada na importação dos hits). */
export function categoryFor(year: number | null, genres: string[]): string {
  const g = genres.join(" | ");
  if (BRAZIL.test(g)) {
    if (/sertanejo|forr[oó]|piseiro|arrocha/i.test(g)) return "sertanejo";
    if (/funk carioca|baile funk|brazilian funk/i.test(g)) return "funk-br";
    if (/samba|pagode|ax[eé]/i.test(g)) return "samba-pagode";
    if (ROCK.test(g)) return "rock-nacional";
    if (/mpb|bossa|tropic[aá]lia|m[uú]sica popular brasileira/i.test(g)) return "mpb";
    return "brasil";
  }
  if (ROCK.test(g)) return !year || year < 1990 ? (year ? "rock-classico" : "rock-anos-2000") : year < 2000 ? "rock-anos-90" : "rock-anos-2000";
  if (!year) return "";
  if (year < 1970) return "anos-60";
  if (year < 1980) return "anos-70";
  if (year < 1990) return "hits-anos-80";
  if (year < 2000) return "anos-90";
  if (year < 2010) return "anos-2000";
  return "hits";
}
