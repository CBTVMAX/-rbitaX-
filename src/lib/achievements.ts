/**
 * Conquistas do perfil — calculadas a partir de ATIVIDADE REAL (sem dado fictício).
 * Servem para qualquer perfil; nada é "premiado" à toa: cada emblema tem um critério
 * verificável com dados que já existem.
 */

export type AchievementInput = {
  posts: number;
  followers: number;
  friends: number;
  communities: number;
  level: number;
  accountAgeDays: number;
  isVerified: boolean;
  isPremium: boolean;
  hasAvatar: boolean;
  hasCover: boolean;
  hasBio: boolean;
};

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  /** chave de ícone (mapeada para um ícone no componente) */
  icon: string;
  /** cor de destaque quando conquistada */
  color: string;
  earned: boolean;
  /** progresso textual quando ainda não conquistada */
  hint?: string;
};

export function computeAchievements(i: AchievementInput): Achievement[] {
  const a = (id: string, name: string, desc: string, icon: string, color: string, earned: boolean, hint?: string): Achievement => ({
    id,
    name,
    desc,
    icon,
    color,
    earned,
    hint: earned ? undefined : hint,
  });

  return [
    a("identidade", "Identidade", "Perfil com foto, capa e bio", "user-check", "#22d3ee", i.hasAvatar && i.hasCover && i.hasBio, "Complete foto, capa e bio"),
    a("primeira", "Primeira órbita", "Fez a primeira publicação", "rocket", "#8b5cf6", i.posts >= 1, "Publique algo"),
    a("criador", "Criador", "10 ou mais publicações", "pen", "#ec4899", i.posts >= 10, `${i.posts}/10 publicações`),
    a("explorador", "Explorador", "Entrou em uma comunidade", "compass", "#2b6cff", i.communities >= 1, "Entre em uma comunidade"),
    a("comunitario", "Comunitário", "5 ou mais comunidades", "users-round", "#22d3ee", i.communities >= 5, `${i.communities}/5 comunidades`),
    a("conectado", "Conectado", "5 ou mais amizades", "users", "#8b5cf6", i.friends >= 5, `${i.friends}/5 amizades`),
    a("popular", "Popular", "10 ou mais seguidores", "heart", "#ec4899", i.followers >= 10, `${i.followers}/10 seguidores`),
    a("influente", "Influente", "50 ou mais seguidores", "trending-up", "#f59e0b", i.followers >= 50, `${i.followers}/50 seguidores`),
    a("ascensao", "Ascensão", "Alcançou o nível 5", "zap", "#22d3ee", i.level >= 5, `Nível ${i.level}/5`),
    a("veterano", "Veterano", "Alcançou o nível 25", "award", "#f59e0b", i.level >= 25, `Nível ${i.level}/25`),
    a("antigo", "Órbita antiga", "30 dias ou mais de conta", "calendar", "#2b6cff", i.accountAgeDays >= 30, "Conta com 30+ dias"),
    a("verificado", "Verificado", "Conta verificada", "badge-check", "#2b6cff", i.isVerified, "Conta verificada"),
    a("premium", "Premium", "Assinante Órbita Premium", "crown", "#f59e0b", i.isPremium, "Seja Órbita Premium"),
  ];
}
