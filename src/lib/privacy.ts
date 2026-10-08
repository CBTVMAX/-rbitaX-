/**
 * Privacidade detalhada (como no VK). As regras valem no banco (public.privacy_allows);
 * aqui ficam só os textos e as opções que cada item aceita.
 */
export type PrivacyScope = "all" | "fof" | "friends" | "friends_except" | "selected" | "only_me";
export type PrivacyKey =
  | "basic_info"
  | "friends"
  | "communities"
  | "family"
  | "stories"
  | "comments_view"
  | "comment"
  | "messages"
  | "calls"
  | "group_add"
  | "community_invites"
  | "mention";

export type PrivacyPerson = { id: string; name: string; username: string; avatarUrl: string | null };
export type PrivacyValue = { scope: PrivacyScope; allow: PrivacyPerson[]; deny: PrivacyPerson[] };
export type PrivacyState = {
  settings: Record<PrivacyKey, PrivacyValue>;
  isPrivate: boolean;
  discoverable: boolean;
  invisible: boolean;
  personalSpaceUntil: string | null;
};

const VIEW: PrivacyScope[] = ["all", "fof", "friends", "friends_except", "selected", "only_me"];
const FRIENDS_ONLY: PrivacyScope[] = ["friends", "friends_except", "selected", "only_me"];

export type PrivacyItem = { key: PrivacyKey; label: string; hint?: string; scopes: PrivacyScope[]; action?: boolean };

export const PRIVACY_GROUPS: { title: string; items: PrivacyItem[] }[] = [
  {
    title: "Minha página",
    items: [
      { key: "basic_info", label: "Quem vê as informações básicas da minha página", hint: "Idade, signo, cidade, relacionamento, formação e carreira", scopes: VIEW },
      { key: "friends", label: "Quem vê minha lista de amigos", hint: "Quem você esconder não aparece para os outros", scopes: VIEW },
      { key: "communities", label: "Quem vê a lista das minhas comunidades", scopes: VIEW },
      { key: "family", label: "Quem vê meus parentes", scopes: ["all", "friends", "only_me"] },
    ],
  },
  {
    title: "Publicações no perfil",
    items: [
      { key: "comments_view", label: "Quem vê os comentários das minhas publicações", scopes: VIEW },
      { key: "comment", label: "Quem pode comentar minhas publicações", scopes: VIEW, action: true },
    ],
  },
  {
    title: "Histórias",
    items: [{ key: "stories", label: "Quem vê minhas histórias", scopes: VIEW }],
  },
  {
    title: "Quem pode me contatar",
    items: [
      { key: "messages", label: "Quem pode me escrever mensagens", hint: "O chat do Órbita X é só entre amigos", scopes: FRIENDS_ONLY, action: true },
      { key: "calls", label: "Quem pode me ligar", scopes: FRIENDS_ONLY, action: true },
      { key: "group_add", label: "Quem pode me adicionar em grupos de conversa", scopes: FRIENDS_ONLY, action: true },
      { key: "community_invites", label: "Quem pode me convidar para comunidades", scopes: FRIENDS_ONLY, action: true },
      { key: "mention", label: "Quem pode me marcar com @", hint: "Quem não puder até escreve seu @, mas você não recebe aviso", scopes: VIEW, action: true },
    ],
  },
];

export function scopeLabel(scope: PrivacyScope, action = false) {
  switch (scope) {
    case "all":
      return "Todos os usuários";
    case "fof":
      return "Amigos e amigos de amigos";
    case "friends":
      return "Todos os amigos";
    case "friends_except":
      return "Todos os amigos, exceto…";
    case "selected":
      return "Alguns amigos";
    case "only_me":
      return action ? "Ninguém" : "Apenas eu";
  }
}

/** Valor curto mostrado na linha ("Todos os amigos, exceto 2"). */
export function valueLabel(v: PrivacyValue, action = false) {
  if (v.scope === "friends_except") return v.deny.length ? `Amigos, exceto ${v.deny.length === 1 ? v.deny[0].name.split(" ")[0] : v.deny.length}` : "Todos os amigos";
  if (v.scope === "selected") return v.allow.length ? (v.allow.length === 1 ? v.allow[0].name.split(" ")[0] : `${v.allow.length} amigos`) : action ? "Ninguém" : "Apenas eu";
  return scopeLabel(v.scope, action);
}
