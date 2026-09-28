"use client";

/**
 * Troca rápida de conta (até 3 perfis) no mesmo navegador.
 *
 * Guarda, por conta adicionada, o refresh token do Supabase para permitir alternar sem
 * digitar a senha de novo — o mesmo padrão de apps com "trocar de conta". O refresh token
 * da conta ATIVA já vive nos cookies do @supabase/ssr (acessíveis ao JS); manter 2–3 aqui
 * tem o mesmo perfil de risco. A pessoa remove uma conta quando quiser (limpa o token).
 *
 * Nada de senha é armazenado. Tudo em try/catch: em aba anônima/armazenamento bloqueado,
 * a troca simplesmente não aparece e o app segue normal.
 */

export type StoredAccount = {
  id: string; // authId (Supabase user id)
  name: string;
  username: string;
  avatarUrl: string | null;
  refreshToken: string;
  savedAt: number;
};

export type AccountRegistry = { activeId: string | null; list: StoredAccount[] };

const KEY = "orbitax.accounts.v1";
export const MAX_ACCOUNTS = 3;
export const ACCOUNTS_EVENT = "orbitax:accounts";

function read(): AccountRegistry {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { activeId: null, list: [] };
    const parsed = JSON.parse(raw) as AccountRegistry;
    if (!parsed || !Array.isArray(parsed.list)) return { activeId: null, list: [] };
    const list = parsed.list.filter((a) => a && typeof a.id === "string" && typeof a.refreshToken === "string");
    return { activeId: typeof parsed.activeId === "string" ? parsed.activeId : null, list };
  } catch {
    return { activeId: null, list: [] };
  }
}

function write(reg: AccountRegistry) {
  try {
    localStorage.setItem(KEY, JSON.stringify(reg));
    window.dispatchEvent(new CustomEvent(ACCOUNTS_EVENT));
  } catch {
    /* armazenamento indisponível: ignora silenciosamente */
  }
}

export function getAccounts(): AccountRegistry {
  return read();
}

/**
 * Insere/atualiza uma conta e a marca como ativa. Se já existe, atualiza no lugar
 * (mantém a ordem, para a lista não "pular" a cada renovação de token). Limite de 3:
 * ao passar, descarta a mais antiga que não seja a recém-adicionada.
 */
export function rememberAccount(acc: Omit<StoredAccount, "savedAt">) {
  if (!acc.id || !acc.refreshToken) return;
  const reg = read();
  const now = Date.now();
  const idx = reg.list.findIndex((a) => a.id === acc.id);
  let list = [...reg.list];
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...acc, savedAt: now };
  } else {
    list.unshift({ ...acc, savedAt: now });
    if (list.length > MAX_ACCOUNTS) list = list.slice(0, MAX_ACCOUNTS);
  }
  write({ activeId: acc.id, list });
}

export function setActiveAccount(id: string) {
  const reg = read();
  if (!reg.list.some((a) => a.id === id)) return;
  write({ ...reg, activeId: id });
}

export function removeAccount(id: string) {
  const reg = read();
  const list = reg.list.filter((a) => a.id !== id);
  const activeId = reg.activeId === id ? list[0]?.id ?? null : reg.activeId;
  write({ activeId, list });
}

/** Marca que a próxima chegada ao app deve ser tratada como "conta adicionada". */
export function markAddingAccount() {
  try {
    sessionStorage.setItem("orbitax.addingAccount", "1");
  } catch {
    /* ignora */
  }
}
