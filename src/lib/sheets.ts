/**
 * Fichas da comunidade (Construtor de Ficha). O modelo é 100% definido pela administração de cada
 * comunidade: nada aqui é pergunta fixa — só os tipos de bloco que o construtor oferece.
 */

export type FieldType =
  | "short"
  | "long"
  | "number"
  | "date"
  | "image"
  | "gallery"
  | "single"
  | "multi"
  | "yesno"
  | "list"
  | "points"
  | "location";

export type CardRole = "" | "name" | "avatar" | "cover" | "badge" | "info";
export type ImageShape = "square" | "portrait" | "landscape" | "free";

export type PointsConfig = { total: number; min: number; max: number; allowLeftover: boolean; attrs: { id: string; name: string }[] };

export type SectionBlock = { id: string; kind: "section"; title: string; description?: string; icon?: string };
export type TextBlock = { id: string; kind: "text"; title?: string; body: string; tone: "plain" | "info" | "warning" | "quote" };
export type ImageBlock = { id: string; kind: "image"; url: string; caption?: string };
export type DividerBlock = { id: string; kind: "divider" };
export type FieldBlock = {
  id: string;
  kind: "field";
  label: string;
  help?: string;
  type: FieldType;
  required: boolean;
  editableAfterApproval: boolean;
  narratorOnly: boolean;
  options?: string[];
  listCount?: number;
  placeholder?: string;
  points?: PointsConfig;
  shape?: ImageShape;
  card?: CardRole;
  filter?: boolean;
  /** Ocupa meia largura no computador (dois campos lado a lado). */
  half?: boolean;
  /** Só na tela do membro: campo travado depois da aprovação (não vai para o modelo). */
  locked?: boolean;
};
export type Block = SectionBlock | TextBlock | ImageBlock | DividerBlock | FieldBlock;

export type SheetStyle = {
  titleFont: string;
  bodyFont: string;
  titleSize: "md" | "lg" | "xl";
  accent: string;
  titleColor: string;
  textColor: string;
  background: string;
  border: string;
  radius: "none" | "md" | "lg" | "xl";
  boxed: boolean;
  separators: boolean;
  spacing: "compact" | "normal" | "relaxed";
};

export type SheetSettings = { requireApproval: boolean; maxPerMember: number; buttonLabel: string };

export type SheetTemplate = {
  title: string;
  subtitle?: string;
  description?: string;
  coverUrl?: string;
  rulesUrl?: string;
  rulesText?: string;
  style: SheetStyle;
  settings: SheetSettings;
  blocks: Block[];
};

export type SheetStatus = "draft" | "pending" | "approved" | "rejected";
export type SheetAnswers = Record<string, unknown>;

export type SheetRow = {
  id: string;
  communityId: string;
  userId: string;
  version: number;
  answers: SheetAnswers;
  narrator: SheetAnswers;
  status: SheetStatus;
  rejectReason: string | null;
  title: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type TemplateBundle = {
  published: SheetTemplate | null;
  draft: SheetTemplate | null;
  version: number;
  publishedAt: string | null;
  canManage: boolean;
  canNarrate: boolean;
  isMember: boolean;
};

export const SHEET_COLUMNS = "id, communityId, userId, version, answers, narrator, status, rejectReason, title, avatarUrl, coverUrl, createdAt, updatedAt, submittedAt";

export const FIELD_TYPES: { id: FieldType; label: string; hint: string }[] = [
  { id: "short", label: "Texto curto", hint: "Uma linha (ex.: nome)" },
  { id: "long", label: "Texto longo", hint: "Parágrafos (ex.: história)" },
  { id: "number", label: "Número", hint: "Só números (ex.: idade)" },
  { id: "date", label: "Data", hint: "Dia, mês e ano" },
  { id: "image", label: "Imagem", hint: "Uma foto com recorte" },
  { id: "gallery", label: "Galeria", hint: "Várias imagens" },
  { id: "single", label: "Seleção única", hint: "Escolher uma opção" },
  { id: "multi", label: "Seleção múltipla", hint: "Escolher várias opções" },
  { id: "yesno", label: "Sim/Não", hint: "Duas opções" },
  { id: "list", label: "Lista", hint: "Vários itens curtos (ex.: 4 palavras)" },
  { id: "points", label: "Pontos/Atributos", hint: "Distribuir pontos" },
  { id: "location", label: "Localização", hint: "Lugar/cidade" },
];

export const CARD_ROLES: { id: CardRole; label: string }[] = [
  { id: "", label: "Não mostrar no cartão" },
  { id: "name", label: "Nome do personagem" },
  { id: "avatar", label: "Foto do cartão" },
  { id: "cover", label: "Capa da ficha" },
  { id: "badge", label: "Etiqueta em destaque" },
  { id: "info", label: "Linha de informação" },
];

export const FONTS: { id: string; label: string; css: string }[] = [
  { id: "sans", label: "Padrão (Inter)", css: "var(--font-inter), system-ui, sans-serif" },
  { id: "display", label: "Moderna (Space Grotesk)", css: "var(--font-space-grotesk), system-ui, sans-serif" },
  { id: "serif", label: "Clássica (serifa)", css: "Georgia, 'Times New Roman', serif" },
  { id: "hand", label: "Manuscrita (Caveat)", css: "var(--font-caveat), cursive" },
  { id: "mono", label: "Máquina de escrever", css: "ui-monospace, 'Courier New', monospace" },
];
export const fontCss = (id: string) => FONTS.find((f) => f.id === id)?.css ?? FONTS[0].css;

export const DEFAULT_STYLE: SheetStyle = {
  titleFont: "serif",
  bodyFont: "sans",
  titleSize: "lg",
  accent: "#8b5cf6",
  titleColor: "#ffffff",
  textColor: "#e5e7f0",
  background: "#0b0e1c",
  border: "#2a2f4a",
  radius: "lg",
  boxed: true,
  separators: true,
  spacing: "normal",
};

export const DEFAULT_SETTINGS: SheetSettings = { requireApproval: true, maxPerMember: 1, buttonLabel: "Criar minha ficha" };

/** Modelo vazio: só título — a administração adiciona o resto. */
export function emptyTemplate(communityName: string): SheetTemplate {
  return { title: "Ficha do personagem", subtitle: communityName, description: "", style: { ...DEFAULT_STYLE }, settings: { ...DEFAULT_SETTINGS }, blocks: [] };
}

export function normalizeTemplate(t: Partial<SheetTemplate> | null | undefined, communityName = ""): SheetTemplate {
  const base = emptyTemplate(communityName);
  if (!t || typeof t !== "object") return base;
  return {
    ...base,
    ...t,
    style: { ...DEFAULT_STYLE, ...(t.style ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(t.settings ?? {}) },
    blocks: Array.isArray(t.blocks) ? t.blocks : [],
  };
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

export function newField(type: FieldType = "short"): FieldBlock {
  const f: FieldBlock = { id: uid(), kind: "field", label: "", help: "", type, required: false, editableAfterApproval: false, narratorOnly: false };
  if (type === "single" || type === "multi") f.options = ["Opção 1", "Opção 2"];
  if (type === "list") f.listCount = 3;
  if (type === "image") f.shape = "square";
  if (type === "points") f.points = { total: 12, min: 0, max: 5, allowLeftover: false, attrs: [{ id: uid(), name: "Atributo 1" }] };
  return f;
}

/** Cópia com ids novos (duplicar campo/seção). */
export function cloneBlock<T extends Block>(b: T): T {
  const copy = JSON.parse(JSON.stringify(b)) as T;
  copy.id = uid();
  if (copy.kind === "field" && copy.points) copy.points.attrs = copy.points.attrs.map((a) => ({ ...a, id: uid() }));
  return copy;
}

export const fields = (t: SheetTemplate) => t.blocks.filter((b): b is FieldBlock => b.kind === "field");

export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => typeof x === "string" && x.trim() === "");
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

export function pointsUsed(v: unknown): number {
  if (!v || typeof v !== "object") return 0;
  return Object.values(v as Record<string, unknown>).reduce<number>((s, n) => s + (Number(n) || 0), 0);
}

/** Validação no aparelho (o banco valida de novo). Devolve o id do campo com problema e a mensagem. */
export function validateAnswers(t: SheetTemplate, answers: SheetAnswers, submit: boolean): { id: string; message: string } | null {
  for (const f of fields(t)) {
    if (f.narratorOnly) continue;
    const v = answers[f.id];
    if (submit && f.required && isBlank(v)) return { id: f.id, message: `Preencha "${f.label || "campo obrigatório"}".` };
    if (f.type === "number" && !isBlank(v) && !/^-?\d+([.,]\d+)?$/.test(String(v))) return { id: f.id, message: `"${f.label}" aceita só números.` };
    if (f.type === "points" && f.points && !isBlank(v)) {
      const used = pointsUsed(v);
      if (used > f.points.total) return { id: f.id, message: `"${f.label}": você usou ${used} de ${f.points.total} pontos.` };
      if (submit && !f.points.allowLeftover && used !== f.points.total) return { id: f.id, message: `"${f.label}": distribua todos os ${f.points.total} pontos (faltam ${f.points.total - used}).` };
    }
  }
  return null;
}

/** Mensagens dos erros do banco. */
export function sheetError(message?: string, detail?: string): string {
  if (!message) return "Não foi possível concluir agora. Tente de novo.";
  if (/sheet_save|sheet_template|function .* does not exist|Could not find the function/i.test(message)) return "O sistema de fichas ainda não foi ativado no banco de dados desta comunidade.";
  if (/no_template/.test(message)) return "A ficha ainda não foi publicada pela administração.";
  if (/required_missing/.test(message)) return detail ? `Preencha "${detail}".` : "Preencha os campos obrigatórios.";
  if (/points_left/.test(message)) return "Distribua todos os pontos antes de enviar.";
  if (/invalid_points/.test(message)) return "Confira os pontos: algum valor está fora do limite.";
  if (/invalid_number/.test(message)) return "Algum campo de número tem letras.";
  if (/invalid_option/.test(message)) return "Alguma opção escolhida não existe mais na ficha. Escolha de novo.";
  if (/invalid_media/.test(message)) return "Envie as imagens de novo.";
  if (/sheet_limit/.test(message)) return "Você já atingiu o número de fichas permitido nesta comunidade.";
  if (/rate_limited/.test(message)) return "Muitas alterações seguidas. Espere um minuto.";
  if (/community_forbidden|not_authenticated/.test(message)) return "Você precisa participar da comunidade para isso.";
  if (/invalid_template/.test(message)) return "O modelo da ficha está grande demais ou inválido.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export const STATUS_LABEL: Record<SheetStatus, string> = { draft: "Rascunho", pending: "Pendente", approved: "Aprovada", rejected: "Recusada" };

export const SAFE_MEDIA = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//;
export const safeMedia = (u: unknown) => (typeof u === "string" && SAFE_MEDIA.test(u) ? u : null);

export const SHAPE_RATIO: Record<ImageShape, number | null> = { square: 1, portrait: 3 / 4, landscape: 16 / 9, free: null };

export const radiusCls = (r: SheetStyle["radius"]) => ({ none: "rounded-none", md: "rounded-lg", lg: "rounded-2xl", xl: "rounded-3xl" })[r];
export const spacingCls = (s: SheetStyle["spacing"]) => ({ compact: "space-y-2", normal: "space-y-4", relaxed: "space-y-6" })[s];
export const titleSizeCls = (s: SheetStyle["titleSize"]) => ({ md: "text-2xl md:text-3xl", lg: "text-3xl md:text-4xl", xl: "text-4xl md:text-5xl" })[s];

/** Texto para mostrar a resposta (cartões e visualização). */
export function answerText(f: FieldBlock, v: unknown): string {
  if (isBlank(v)) return "";
  if (f.type === "yesno") return v === "sim" ? "Sim" : "Não";
  if (f.type === "date" && typeof v === "string") {
    const d = new Date(`${v}T12:00:00`);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim()).join(", ");
  return String(v);
}
