/** Comunidades visitadas recentemente, guardadas só neste navegador (como o "Visitado recentemente" do VK). */
export type RecentCommunity = { slug: string; name: string; avatarUrl: string | null };

const KEY = "orbitax:recent-communities";
const MAX = 12;
export const RECENT_EVENT = "orbitax:recent-communities";

export function readRecentCommunities(): RecentCommunity[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentCommunity[]) : [];
    return Array.isArray(list) ? list.filter((c) => c && typeof c.slug === "string" && typeof c.name === "string") : [];
  } catch {
    return [];
  }
}

export function rememberCommunityVisit(c: RecentCommunity) {
  try {
    const next = [c, ...readRecentCommunities().filter((x) => x.slug !== c.slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function clearRecentCommunities() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nada a limpar */
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}
