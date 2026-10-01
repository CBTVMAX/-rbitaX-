/** Abas e filtros do feed (usados na página, no topo do celular e nos links da navegação). */
export const FEED_TABS = [
  { id: "para-voce", label: "Para você" },
  { id: "seguindo", label: "Seguindo" },
  { id: "recentes", label: "Recentes" },
  { id: "salvos", label: "Salvos" },
] as const;
export type FeedTab = (typeof FEED_TABS)[number]["id"];

export const FEED_TYPES = [
  { id: "todos", label: "Todos os tipos" },
  { id: "fotos", label: "Fotos" },
  { id: "videos", label: "Vídeos" },
  { id: "texto", label: "Texto" },
  { id: "musica", label: "Música" },
] as const;
export type FeedType = (typeof FEED_TYPES)[number]["id"];
