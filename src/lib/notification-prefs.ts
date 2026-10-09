/** Itens de Configurações → Notificações. A regra vale no banco (gatilho notification_pref_guard). */
export type NotifyLevel = "all" | "friends" | "off";
export type NotifyKey =
  | "reactions"
  | "comments"
  | "mentions"
  | "reposts"
  | "testimonials"
  | "friend_requests"
  | "friend_accept"
  | "follows"
  | "family"
  | "community_invites"
  | "community_events"
  | "community_activity";

export type CommunityNotify = { id: string; name: string; slug: string; avatarUrl: string | null; level: "all" | "announcements" | "off" };
export type NotificationPrefsState = { prefs: Record<NotifyKey, NotifyLevel>; communities: CommunityNotify[] };

const WHO: NotifyLevel[] = ["all", "friends", "off"];
const ON_OFF: NotifyLevel[] = ["all", "off"];

export const NOTIFY_GROUPS: { title: string; items: { key: NotifyKey; label: string; hint?: string; levels: NotifyLevel[] }[] }[] = [
  {
    title: "Interações",
    items: [
      { key: "reactions", label: "Reações e curtidas", hint: "Nas suas publicações, histórias e discussões", levels: WHO },
      { key: "comments", label: "Comentários e respostas", levels: WHO },
      { key: "mentions", label: "Marcações com @", hint: "Em publicações, comentários e conversas", levels: WHO },
      { key: "reposts", label: "Compartilhamentos", levels: WHO },
      { key: "testimonials", label: "Depoimentos", levels: WHO },
    ],
  },
  {
    title: "Pessoas",
    items: [
      { key: "friend_requests", label: "Pedidos de amizade", levels: ON_OFF },
      { key: "friend_accept", label: "Pedidos de amizade aceitos", levels: ON_OFF },
      { key: "follows", label: "Novos seguidores", levels: ON_OFF },
      { key: "family", label: "Pedidos de parentesco", levels: WHO },
    ],
  },
  {
    title: "Comunidades",
    items: [
      { key: "community_invites", label: "Convites para comunidades", levels: WHO },
      { key: "community_events", label: "Eventos", hint: "Novos eventos e lembretes", levels: ON_OFF },
      { key: "community_activity", label: "Atividade nas comunidades", hint: "Pedidos de entrada, cargos, fichas, sugestões e boas-vindas", levels: ON_OFF },
    ],
  },
];

export const LEVEL_LABEL: Record<NotifyLevel, string> = { all: "Todos", friends: "Apenas amigos", off: "Desativado" };
export const COMMUNITY_LEVEL_LABEL: Record<CommunityNotify["level"], string> = {
  all: "Todas as publicações",
  announcements: "Só anúncios",
  off: "Desativadas",
};
