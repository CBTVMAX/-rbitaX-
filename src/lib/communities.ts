import type { SupabaseClient } from "@supabase/supabase-js";
import { timeAgo } from "@/lib/format";
import type { Database } from "@/lib/database.types";

/**
 * Communities: every permission is decided in the database (community_can / community_staff and the
 * community_* RPCs). The client only uses these helpers to decide what to *show*.
 */

export type Role = "owner" | "admin" | "moderator" | "member";
export type PermissionKey = "post" | "comment" | "discussion" | "photo" | "video" | "poll" | "invite" | "link" | "mention";
export type PermissionLevel = "all" | "members" | "admins" | "owner";
export type Permissions = Record<PermissionKey, PermissionLevel>;
export type Moderation = { wordFilter: string[]; approvePosts: boolean; approveComments: boolean; blockLinks: boolean; blockMedia: boolean };
export type NotifyPrefs = { newPost: boolean; newDiscussion: boolean; announcements: boolean; joinRequests: boolean };
export type CommunityLink = { label: string; url: string };

export type Community = {
  id: string;
  name: string;
  slug: string;
  username: string;
  description: string | null;
  category: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  isOfficial: boolean;
  accentColor: string | null;
  rules: string | null;
  links: CommunityLink[];
  permissions: Permissions;
  moderation: Moderation;
  notifyPrefs: NotifyPrefs;
  memberCount: number;
  createdAt: string;
};

export const COMMUNITY_COLUMNS =
  "id, name, slug, username, description, category, avatarUrl, coverUrl, isPrivate, isOfficial, accentColor, rules, links, permissions, moderation, notifyPrefs, memberCount, createdAt";

export type Viewer = { id: string; name: string; username: string; avatarUrl: string | null } | null;

export type Membership = {
  role: Role | null;
  notify: boolean;
  request: "pending" | "rejected" | null;
  banned: boolean;
};

export type Author = { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean };
export type MediaItem = { id: string; type: string; url: string; thumbnailUrl: string | null; width: number | null; height: number | null; mimeType: string | null; position: number };
export type PostMeta = {
  poll?: { question: string; options: string[]; multiple: boolean };
  music?: { title: string; artist: string };
  tag?: PostTag;
};
export type PostTag = "anuncio" | "atualizacao" | "evento" | "manutencao" | "novidade" | "recurso";

export type CommunityPost = {
  id: string;
  content: string;
  kind: string;
  linkUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  isPinned: boolean;
  commentsEnabled: boolean;
  moderationStatus: "visible" | "pending" | "removed";
  viewCount: number;
  albumId: string | null;
  meta: PostMeta;
  author: Author;
  media: MediaItem[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  poll?: { counts: number[]; mine: number[]; voters: number };
};

export const POST_COLUMNS =
  "id, content, kind, linkUrl, createdAt, editedAt, isPinned, commentsEnabled, moderationStatus, viewCount, albumId, meta, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url, thumbnailUrl, width, height, mimeType, position)";

export type Discussion = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isPinned: boolean;
  isClosed: boolean;
  status: "visible" | "pending" | "removed";
  replyCount: number;
  createdAt: string;
  lastActivityAt: string;
  author: Author;
};

export const DISCUSSION_COLUMNS =
  "id, title, body, imageUrl, isPinned, isClosed, status, replyCount, createdAt, lastActivityAt, author:User!CommunityDiscussion_authorId_fkey(id, name, username, avatarUrl, isVerified)";

export type Album = { id: string; title: string; description: string; coverUrl: string | null; createdAt: string; count?: number };

export const ROLE_LABEL: Record<Role, string> = { owner: "Proprietário", admin: "Administrador", moderator: "Moderador", member: "Membro" };
export const ROLE_RANK: Record<Role, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
export const rank = (r: Role | null | undefined) => (r ? ROLE_RANK[r] : 0);

export const PERMISSION_LABEL: Record<PermissionKey, string> = {
  post: "Publicar",
  comment: "Comentar",
  discussion: "Criar discussões",
  photo: "Enviar fotos",
  video: "Enviar vídeos e clipes",
  poll: "Criar enquetes",
  invite: "Convidar membros",
  link: "Adicionar links",
  mention: "Marcar usuários",
};
export const LEVEL_LABEL: Record<PermissionLevel, string> = { all: "Todos", members: "Membros", admins: "Administradores", owner: "Somente proprietário" };

export const TAG_LABEL: Record<PostTag, { label: string; emoji: string }> = {
  anuncio: { label: "Anúncio", emoji: "📣" },
  atualizacao: { label: "Atualização", emoji: "🛰️" },
  evento: { label: "Evento", emoji: "📅" },
  manutencao: { label: "Manutenção", emoji: "🛠️" },
  novidade: { label: "Novidade", emoji: "✨" },
  recurso: { label: "Novo recurso", emoji: "🚀" },
};

/** Accent palettes a community can pick (same family as the app's profile colors). */
export const ACCENTS: { id: string; label: string; rgb: string; from: string; to: string }[] = [
  { id: "orbita", label: "Órbita", rgb: "139 92 246", from: "#3b82f6", to: "#ec4899" },
  { id: "ciano", label: "Ciano", rgb: "34 211 238", from: "#06b6d4", to: "#3b82f6" },
  { id: "neon", label: "Azul neon", rgb: "59 130 246", from: "#2563eb", to: "#22d3ee" },
  { id: "magenta", label: "Magenta", rgb: "236 72 153", from: "#db2777", to: "#8b5cf6" },
  { id: "aurora", label: "Aurora", rgb: "16 185 129", from: "#10b981", to: "#22d3ee" },
  { id: "solar", label: "Solar", rgb: "245 158 11", from: "#f59e0b", to: "#ef4444" },
];
export const accentOf = (id: string | null) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

/** Can (probably) do this — mirrors community_can() for the UI. The database decides for real. */
export function can(c: Pick<Community, "permissions" | "isPrivate">, role: Role | null, key: PermissionKey) {
  const need = c.permissions?.[key] ?? "members";
  const r = rank(role);
  if (need === "all") return !c.isPrivate || r >= 1;
  if (need === "members") return r >= 1;
  if (need === "admins") return r >= 3;
  return r >= 4;
}

const ERRORS: [RegExp, string][] = [
  [/community_forbidden|forbidden|insufficient_privilege/, "Você não tem permissão para isso nesta comunidade."],
  [/owner_only/, "Somente o proprietário pode alterar isso."],
  [/banned/, "Você está bloqueado nesta comunidade."],
  [/links_blocked/, "Links não são permitidos aqui."],
  [/media_blocked/, "Mídia não é permitida aqui."],
  [/comments_disabled/, "Os comentários estão desativados nesta publicação."],
  [/discussion_closed/, "Esta discussão foi fechada."],
  [/rate_limited/, "Muitas ações em pouco tempo. Aguarde um pouco."],
  [/too_many_pinned/, "Você já tem 3 publicações fixadas. Desafixe uma antes."],
  [/owner_cannot_leave/, "O proprietário não pode sair. Transfira a comunidade antes."],
  [/username_taken/, "Esse @ já está em uso."],
  [/invalid_username/, "Use de 3 a 30 letras minúsculas, números, ponto ou _."],
  [/invalid_name/, "O nome precisa ter entre 3 e 60 caracteres."],
  [/invalid_poll/, "A enquete precisa de uma pergunta e de 2 a 10 opções."],
  [/invalid_link/, "Link inválido."],
  [/recently_rejected/, "Seu pedido foi recusado há pouco. Tente de novo amanhã."],
  [/empty_post/, "Escreva algo ou adicione uma mídia."],
  [/invalid_media|missing_media/, "Arquivo inválido. Envie de novo."],
  [/too_long/, "Texto longo demais."],
  [/cannot_change_self/, "Você não pode mudar o próprio cargo."],
  [/not_member/, "Essa pessoa não é mais membro."],
];
export function communityError(message?: string) {
  if (!message) return "Não foi possível concluir agora. Tente de novo.";
  return ERRORS.find(([re]) => re.test(message))?.[1] ?? "Não foi possível concluir agora. Tente de novo.";
}

// ── Uploads ─────────────────────────────────────────────────────────────────
export type UploadKind = "image" | "video" | "audio" | "file";
const LIMITS: Record<UploadKind, { max: number; types: string[]; label: string }> = {
  image: { max: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/gif"], label: "Imagens até 10 MB (JPG, PNG, WebP ou GIF)" },
  video: { max: 50 * 1024 * 1024, types: ["video/mp4", "video/webm", "video/quicktime"], label: "Vídeos até 50 MB (MP4, WebM ou MOV)" },
  audio: { max: 20 * 1024 * 1024, types: ["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/webm", "audio/wav", "audio/x-m4a"], label: "Áudio até 20 MB (MP3, M4A, OGG, WAV)" },
  file: { max: 25 * 1024 * 1024, types: ["application/pdf", "text/plain", "application/zip"], label: "Arquivos até 25 MB (PDF, TXT ou ZIP)" },
};
export const ACCEPT: Record<UploadKind, string> = {
  image: LIMITS.image.types.join(","),
  video: LIMITS.video.types.join(","),
  audio: LIMITS.audio.types.join(","),
  file: LIMITS.file.types.join(","),
};

export function checkFile(file: File, kind: UploadKind) {
  const l = LIMITS[kind];
  if (!l.types.includes(file.type)) return `Formato não suportado. ${l.label}.`;
  if (file.size > l.max) return `Arquivo grande demais. ${l.label}.`;
  return null;
}

async function dimensions(file: File, kind: UploadKind): Promise<{ width: number | null; height: number | null }> {
  try {
    if (kind === "image") {
      const bmp = await createImageBitmap(file);
      const d = { width: bmp.width, height: bmp.height };
      bmp.close();
      return d;
    }
    if (kind === "video") {
      return await new Promise((ok) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          ok({ width: v.videoWidth || null, height: v.videoHeight || null });
          URL.revokeObjectURL(v.src);
        };
        v.onerror = () => ok({ width: null, height: null });
        v.src = URL.createObjectURL(file);
      });
    }
  } catch {
    /* unknown size is fine */
  }
  return { width: null, height: null };
}

/** Uploads to media/<me>/communities/<community>/… — the database only accepts files under the sender's folder. */
export async function uploadCommunityFile(supabase: SupabaseClient<Database>, userId: string, communityId: string, file: File, kind: UploadKind) {
  const problem = checkFile(file, kind);
  if (problem) throw new Error(problem);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${userId}/communities/${communityId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Falha no envio do arquivo. Tente de novo.");
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  const dims = await dimensions(file, kind);
  return { type: kind, url: data.publicUrl, mimeType: file.type, sizeBytes: file.size, name: file.name, ...dims };
}

export function communityHref(slug: string, extra = "") {
  return `/comunidades/${slug}${extra}`;
}

export function compactNumber(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".0", "").replace(".", ",")} mil`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")} mi`;
}

/** "agora" for the first minute, then "há 5 minutos", "há 2 dias"… */
export function ago(iso: string) {
  return Date.now() - new Date(iso).getTime() < 60_000 ? "agora" : timeAgo(iso);
}
