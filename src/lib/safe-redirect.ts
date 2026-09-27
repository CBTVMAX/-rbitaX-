/**
 * Only same-site paths are accepted as a post-login destination. Anything else
 * (other domains, "//host", "javascript:", backslash tricks, control characters)
 * falls back, so a crafted link can never send someone off Órbita X after they sign in.
 */
export function safeRedirect(value: string | null | undefined, fallback = "/feed"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const base = "https://orbitax.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
