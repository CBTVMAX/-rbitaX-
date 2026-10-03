import type { SupabaseClient } from "@supabase/supabase-js";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  coverUrl: string | null;
  duration: number | null;
  genre: string | null;
  isOfficial: boolean;
  userId: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  /** Faixa do YouTube (vídeo oficial ou link do usuário): toca completa no player incorporado. */
  youtubeId: string | null;
};

export type MusicAlbum = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  updatedAt: string;
  trackIds: string[];
};

export const TRACK_COLUMNS =
  "id, title, artist, album, audioUrl, coverUrl, duration, genre, isOfficial, userId, license, licenseUrl, sourceUrl, youtubeId" as const;

/** Gêneros do catálogo, na ordem em que aparecem. */
export const GENRES: { id: string; label: string }[] = [
  { id: "hits", label: "Hits" },
  { id: "rock-classico", label: "Rock clássico" },
  { id: "rock-anos-90", label: "Rock anos 90" },
  { id: "rock-anos-2000", label: "Rock anos 2000" },
  { id: "hits-anos-80", label: "Anos 80" },
  { id: "pop-rock", label: "Pop rock" },
  { id: "rock", label: "Rock indie" },
  { id: "pop", label: "Pop" },
  { id: "eletronica", label: "Eletrônica" },
  { id: "hiphop", label: "Hip-hop" },
  { id: "jazz", label: "Jazz" },
  { id: "blues", label: "Blues" },
  { id: "classica", label: "Clássica" },
  { id: "folk", label: "Folk" },
  { id: "reggae", label: "Reggae" },
  { id: "metal", label: "Metal" },
  { id: "punk", label: "Punk" },
  { id: "indie", label: "Indie" },
  { id: "chillout", label: "Chillout" },
  { id: "ambient", label: "Ambient" },
  { id: "dance", label: "Dance" },
  { id: "funk", label: "Funk" },
  { id: "soul", label: "Soul" },
  { id: "acustico", label: "Acústico" },
];

export const genreLabel = (id: string | null) => GENRES.find((g) => g.id === id)?.label ?? "Outros";

export function formatDuration(sec: number | null | undefined) {
  if (!sec || !Number.isFinite(sec)) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Catálogo oficial + músicas da pessoa + álbuns dela, numa leva só. */
export async function loadMusic(supabase: SupabaseClient, userId: string) {
  const [catalog, mine, albums] = await Promise.all([
    supabase.from("Track").select(TRACK_COLUMNS).eq("isOfficial", true).order("genre").order("album").order("createdAt").limit(1000),
    supabase.from("Track").select(TRACK_COLUMNS).eq("userId", userId).eq("isOfficial", false).order("createdAt", { ascending: false }).limit(500),
    supabase
      .from("Playlist")
      .select("id, title, description, coverUrl, isPublic, updatedAt, items:PlaylistTrack(trackId, position)")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })
      .limit(200),
  ]);
  type AlbumRow = Omit<MusicAlbum, "trackIds"> & { items: { trackId: string; position: number }[] | null };
  // Ordem da vitrine: hits e rock primeiro, depois os gêneros do catálogo livre.
  const order = new Map(GENRES.map((g, i) => [g.id, i]));
  const sorted = ((catalog.data as MusicTrack[] | null) ?? []).slice().sort((a, b) => (order.get(a.genre ?? "") ?? 99) - (order.get(b.genre ?? "") ?? 99));
  return {
    catalog: sorted,
    mine: (mine.data as MusicTrack[] | null) ?? [],
    albums: ((albums.data as AlbumRow[] | null) ?? []).map(({ items, ...a }) => ({
      ...a,
      trackIds: (items ?? []).slice().sort((x, y) => x.position - y.position).map((i) => i.trackId),
    })),
  };
}

/** Faixas de álbum que não estão no catálogo nem nas minhas (ex.: de outra pessoa) não aparecem. */
export function albumTracks(album: MusicAlbum, byId: Map<string, MusicTrack>) {
  return album.trackIds.map((id) => byId.get(id)).filter((t): t is MusicTrack => !!t);
}

/** Aceita link do YouTube (watch, youtu.be, shorts, embed, music) ou o próprio ID. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") return /^[A-Za-z0-9_-]{11}$/.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null;
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
