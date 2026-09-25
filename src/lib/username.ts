// Mirrors the rules enforced by the normalize_username() trigger in the database.
export function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function usernameError(value: string, ownOrbitId: string | null): string | null {
  const u = normalizeUsername(value);
  if (u.length < 3 || u.length > 30) return "Use de 3 a 30 caracteres.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Use apenas letras minúsculas, números, ponto (.) e sublinhado (_).";
  if (u.startsWith(".") || u.endsWith(".") || u.includes("..")) return "Não comece nem termine com ponto, nem use dois pontos seguidos.";
  if (/^[0-9]+$/.test(u) && u !== ownOrbitId) return "Nomes só com números são reservados para o Orbit ID.";
  return null;
}
