/**
 * Nível do perfil calculado a partir de ATIVIDADE REAL (sem número fictício).
 * XP vem de dados que já existem: publicações, seguidores, amizades e comunidades.
 * Assim o nível é verdadeiro e sobe conforme a pessoa usa a plataforma.
 */

export type LevelSignals = {
  posts: number;
  followers: number;
  friends: number;
  communities: number;
  following: number;
};

export type LevelInfo = {
  level: number;
  totalXp: number;
  /** XP acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP necessário para passar do nível atual ao próximo. */
  xpForNext: number;
  /** 0..1 para a barra de progresso. */
  progress: number;
};

const WEIGHTS = { posts: 40, followers: 25, friends: 20, communities: 30, following: 3 };

export function computeXp(s: LevelSignals): number {
  return (
    Math.max(0, s.posts) * WEIGHTS.posts +
    Math.max(0, s.followers) * WEIGHTS.followers +
    Math.max(0, s.friends) * WEIGHTS.friends +
    Math.max(0, s.communities) * WEIGHTS.communities +
    Math.max(0, s.following) * WEIGHTS.following
  );
}

/** XP para avançar DO nível L para L+1 (curva crescente). */
function stepFor(level: number): number {
  return 100 + (level - 1) * 70;
}

export function computeLevel(s: LevelSignals): LevelInfo {
  const totalXp = computeXp(s);
  let level = 1;
  let acc = 0;
  while (acc + stepFor(level) <= totalXp && level < 999) {
    acc += stepFor(level);
    level += 1;
  }
  const xpForNext = stepFor(level);
  const xpIntoLevel = totalXp - acc;
  return { level, totalXp, xpIntoLevel, xpForNext, progress: xpForNext ? Math.min(1, xpIntoLevel / xpForNext) : 0 };
}
