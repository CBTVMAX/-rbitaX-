/**
 * Sistema de RPG / Fichas por comunidade.
 * A ficha (personagem) fica separada do perfil principal do usuário e vinculada
 * a UMA comunidade. Campos são definidos pelo admin da comunidade.
 */

export type RpgFieldType = "text" | "textarea" | "number" | "select" | "image";

export type RpgField = {
  id: string;
  fkey: string;
  label: string;
  type: RpgFieldType;
  options: string[];
  required: boolean;
  section: string | null;
  sortOrder: number;
};

export type RpgConfig = {
  isRpg: boolean;
  requireApproval: boolean;
  whoCanCreate: "member" | "editor" | "admin";
  allowHtml: boolean;
  intro: string | null;
  canManage: boolean;
  canCreate: boolean;
  myCharacterId: string | null;
};

export type RpgCharacterListItem = {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  status: string;
  ownerName: string;
  ownerUsername: string;
};

export type RpgCharacter = {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  quote: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  theme: string;
  customHtml: string | null;
  status: string;
  rejectReason: string | null;
  values: Record<string, string>;
  gallery: string[];
  ownerName: string;
  ownerUsername: string;
  ownerAvatar: string | null;
  isMine: boolean;
  canManage: boolean;
};

export const RPG_FIELD_TYPES: { value: RpgFieldType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "select", label: "Escolha (lista)" },
  { value: "image", label: "Imagem (URL)" },
];

export const RPG_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  approved: { label: "Aprovada", className: "text-emerald-400" },
  pending: { label: "Aguardando aprovação", className: "text-amber-400" },
  rejected: { label: "Recusada", className: "text-red-400" },
  draft: { label: "Rascunho", className: "text-white/50" },
};

/**
 * Sanitiza HTML de personalização no cliente com uma allowlist estrita.
 * Remove qualquer tag fora da lista e todos os atributos perigosos (on*, style com
 * expressões, href/src com javascript:). É a segunda camada — o banco também sanitiza.
 */
const ALLOWED_TAGS = new Set([
  "b", "strong", "i", "em", "u", "s", "p", "br", "hr", "span", "div", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "td", "th", "center", "small", "mark", "code", "pre",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
  "*": new Set(["class"]),
};

function safeUrl(value: string): string | null {
  const v = value.trim();
  if (/^\s*javascript:/i.test(v) || /^\s*data:(?!image\/)/i.test(v) || /^\s*vbscript:/i.test(v)) return null;
  return v;
}

export function sanitizeRpgHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // desembrulha: mantém o texto, remove a tag proibida
        const text = doc.createTextNode(child.textContent ?? "");
        child.replaceWith(text);
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
      const globalAttrs = ALLOWED_ATTRS["*"];
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const ok = allowed.has(name) || globalAttrs.has(name);
        if (!ok || name.startsWith("on")) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (name === "href" || name === "src") {
          const clean = safeUrl(attr.value);
          if (clean === null) child.removeAttribute(attr.name);
          else child.setAttribute(attr.name, clean);
        }
      }
      if (tag === "a") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer nofollow");
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
