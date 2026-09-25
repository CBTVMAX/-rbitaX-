/**
 * Órbita X Store: in-app catalog (StoreProduct) paid with Órbita Coins (CoinWallet/CoinTransaction).
 * Prices, balance and ownership are always decided by the database (acquire_product / send_gift);
 * the app only displays them.
 */
export type ProductKind = "sticker_pack" | "gift" | "frame" | "wallpaper";

export type StoreProduct = {
  id: string;
  kind: ProductKind;
  refId: string;
  name: string;
  description: string;
  image: string;
  priceCoins: number;
  tier: "free" | "premium";
  isAdult: boolean;
  badge: string | null;
  sortOrder: number;
  meta: { count?: number; animated?: boolean; section?: string; category?: string; rarity?: string; full?: string } | null;
};

export type InventoryItem = { productId: string; source: "purchase" | "free" | "grant"; isFavorite: boolean; acquiredAt: string };

export const PRODUCT_COLUMNS = "id, kind, refId, name, description, image, priceCoins, tier, isAdult, badge, sortOrder, meta" as const;

export type StoreCategory = "adesivos" | "presentes" | "temas" | "molduras" | "premium" | "novidades";

export const STORE_CATEGORIES: { id: StoreCategory; label: string }[] = [
  { id: "adesivos", label: "Adesivos" },
  { id: "presentes", label: "Presentes" },
  { id: "temas", label: "Temas" },
  { id: "molduras", label: "Molduras" },
  { id: "premium", label: "Premium" },
  { id: "novidades", label: "Novidades" },
];

export function inCategory(p: StoreProduct, c: StoreCategory) {
  switch (c) {
    case "adesivos":
      return p.kind === "sticker_pack";
    case "presentes":
      return p.kind === "gift";
    case "temas":
      return p.kind === "wallpaper";
    case "molduras":
      return p.kind === "frame";
    case "premium":
      return p.tier === "premium";
    case "novidades":
      return p.badge === "Novo";
  }
}

export const KIND_LABEL: Record<ProductKind, string> = {
  sticker_pack: "Pacote de adesivos",
  gift: "Presente",
  frame: "Moldura de perfil",
  wallpaper: "Papel de parede",
};

export const RARITY_LABEL: Record<string, string> = {
  rara: "Rara",
  epica: "Épica",
  fantasia: "Fantasia",
  mistica: "Mística",
  lendaria: "Lendária",
  heroica: "Heroica",
  magica: "Mágica",
};

/** Other parts of the app (sidebar card, gift dialog) listen to keep the balance in sync. */
export const COINS_EVENT = "orbitax:coins";

export function announceBalance(balance: number) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(COINS_EVENT, { detail: balance }));
}

export function storeErrorMessage(message: string | undefined) {
  if (!message) return "Não foi possível concluir agora. Tente de novo.";
  if (/insufficient_coins/.test(message)) return "Saldo de Órbita Coins insuficiente.";
  if (/not_found/.test(message)) return "Este item não está mais disponível.";
  if (/frame_not_owned/.test(message)) return "Você ainda não tem esta moldura.";
  return "Não foi possível concluir agora. Tente de novo.";
}
