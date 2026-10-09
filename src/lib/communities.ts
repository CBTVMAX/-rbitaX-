import type { SupabaseClient } from "@supabase/supabase-js";
import { sniffFile } from "@/lib/upload-guard";
import { timeAgo } from "@/lib/format";
import type { Database } from "@/lib/database.types";

/**
 * Communities: every permission is decided in the database (community_can / community_staff and the
 * community_* RPCs). The client only uses these helpers to decide what to *show*.
 */

export type Role = "owner" | "admin" | "moderator" | "editor" | "member";
export type PermissionKey = "post" | "comment" | "discussion" | "photo" | "video" | "poll" | "invite" | "link" | "mention" | "story" | "event" | "suggest";
export type PermissionLevel = "all" | "members" | "admins" | "owner";
/** `suggest` (Sugerir posts) só existe depois que o dono decide; sem ela, ninguém sugere. */
export type Permissions = Record<Exclude<PermissionKey, "suggest">, PermissionLevel> & { suggest?: PermissionLevel };
export type Moderation = { wordFilter: string[]; approvePosts: boolean; approveComments: boolean; blockLinks: boolean; blockMedia: boolean };
export type NotifyPrefs = { newPost: boolean; newDiscussion: boolean; announcements: boolean; joinRequests: boolean; events: boolean; newMembers: boolean };
/** `image`: capa do quadro clicável no topo da comunidade (como os links do VK). */
export type CommunityLink = { label: string; url: string; image?: string | null };

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
  ownerId: string | null;
  status: "active" | "disabled";
  /** Sufixo curto (1–4 letras/números) no fim das hashtags de assunto, ex.: "OX". */
  hashtagSuffix: string | null;
  /** Comunidade marcada como RPG (habilita Personagens/Fichas). */
  isRpg: boolean;
  /** Botão de ação no topo da comunidade (Mensagem, Evento ou Discussão — sempre dentro do Órbita X). */
  cta?: CommunityCta | null;
  /** Restrição por idade: 0 (sem limite), 16 ou 18. */
  ageLimit?: number;
};

export type CommunityCtaType = "message" | "event" | "discussion";
export type CommunityCta = { enabled: boolean; type?: CommunityCtaType; target?: string; label?: string };

/** Página interna do botão de ação (null = "Enviar mensagem", que abre o chat da comunidade). */
export function ctaHref(cta: CommunityCta | null | undefined, base: string): string | null {
  if (!cta?.enabled || !cta.type || !cta.target) return null;
  if (cta.type === "event") return `${base}/eventos/${encodeURIComponent(cta.target)}`;
  if (cta.type === "discussion") return `${base}/discussoes/${encodeURIComponent(cta.target)}`;
  return null;
}

export const COMMUNITY_COLUMNS =
  "id, name, slug, username, description, category, avatarUrl, coverUrl, isPrivate, isOfficial, accentColor, rules, links, permissions, moderation, notifyPrefs, memberCount, createdAt, ownerId, status, hashtagSuffix, isRpg, cta, ageLimit";

/** Um assunto (ator/personagem) do catálogo da comunidade e sua hashtag final. */
export type CommunitySubject = { id: string; label: string; slug: string; tag: string; sortOrder: number; count: number };

/** Miolo da hashtag: minúsculas, alfanumérico (mantém acentos), sem espaços. Espelha o banco. */
export function subjectSlug(label: string): string {
  return (label || "").toLowerCase().replace(/[^a-z0-9à-ÿ]/gi, "");
}

/** Hashtag de exibição do assunto + sufixo da comunidade, ex.: #IanSomerhalderOX. */
export function subjectHashtag(label: string, suffix: string | null | undefined): string {
  const words = (label || "").trim().split(/[^A-Za-z0-9À-ÿ]+/).filter(Boolean);
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return `#${name}${(suffix || "").toUpperCase()}`;
}

export type Viewer = { id: string; name: string; username: string; avatarUrl: string | null } | null;

export type Membership = {
  role: Role | null;
  notify: boolean;
  request: "pending" | "rejected" | null;
  banned: boolean;
  /** Silenced by the moderation: can read and react, but not publish (null = not muted). */
  muted?: { until: string | null; reason: string } | null;
  favorite?: boolean;
};

export type Author = { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean };
export type MediaItem = { id: string; type: string; url: string; thumbnailUrl: string | null; width: number | null; height: number | null; mimeType: string | null; position: number; sizeBytes?: number | null; name?: string | null };
export type PostMeta = {
  /** Sugerido por um membro ("Sugerir post") e esperando a administração. */
  suggested?: boolean;
  poll?: { question: string; options: string[]; multiple: boolean };
  music?: { title: string; artist: string };
  tag?: PostTag;
  article?: { title: string };
  video?: { title: string };
  /** Marcado pelo autor/admin como conteúdo original da comunidade (§8). */
  original?: boolean;
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
  /** "community" = a publicação pertence à comunidade (autor público = comunidade); "user" = perfil pessoal. */
  authorType: "user" | "community";
  author: Author;
  media: MediaItem[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  /** The viewer's reaction ("like" = ❤️) and the most used reactions on the post. */
  myReaction: ReactionKey | null;
  topReactions: ReactionKey[];
  poll?: { counts: number[]; mine: number[]; voters: number };
};

export const POST_COLUMNS =
  "id, content, kind, linkUrl, createdAt, editedAt, isPinned, commentsEnabled, moderationStatus, viewCount, albumId, meta, authorType, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url, thumbnailUrl, width, height, mimeType, position, sizeBytes, name)";

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
  category: DiscussionCategory;
  likeCount: number;
  authorType: "user" | "community";
  author: Author;
};

export const DISCUSSION_COLUMNS =
  "id, title, body, imageUrl, isPinned, isClosed, status, replyCount, createdAt, lastActivityAt, category, likeCount, authorType, author:User!CommunityDiscussion_authorId_fkey(id, name, username, avatarUrl, isVerified)";

/** Column lists shared by server pages and client components (kept here, outside any "use client" module). */
export const EVENT_COLUMNS =
  "id, communityId, createdById, title, description, startsAt, endsAt, location, locationUrl, imageUrl, maxParticipants, status, goingCount, interestedCount, createdAt";
export const STORY_COLUMNS =
  "id, userId, asCommunity, type, mediaUrl, thumbnailUrl, text, meta, expiresAt, createdAt, viewCount, user:User!Moment_userId_fkey(id, name, username, avatarUrl)";
export const MEMBER_COLUMNS = "role, createdAt, user:User!CommunityMember_userId_fkey(id, name, username, avatarUrl, isVerified)";
export const CONTENT_TAB_IDS = ["tudo", "posts", "fotos", "videos", "clipes", "musica", "gifs", "arquivos"] as const;
export type ContentTabId = (typeof CONTENT_TAB_IDS)[number];

export type Album = { id: string; title: string; description: string; coverUrl: string | null; createdAt: string; count?: number };

export const ROLE_LABEL: Record<Role, string> = { owner: "Proprietário", admin: "Administrador", moderator: "Moderador", editor: "Editor", member: "Membro" };
export const ROLE_DESC: Record<Role, string> = {
  owner: "Controle total, inclusive privacidade, @ e transferência.",
  admin: "Gerencia informações, membros, cargos, eventos e avisos.",
  moderator: "Aprova conteúdo, remove, silencia e bane membros.",
  editor: "Publica avisos, artigos, eventos e histórias pela comunidade; fixa e organiza conteúdo.",
  member: "Participa conforme as permissões da comunidade.",
};
/** Editors are members with publishing powers; the hierarchy (who can manage whom) ignores them. */
export const ROLE_RANK: Record<Role, number> = { owner: 4, admin: 3, moderator: 2, editor: 1, member: 1 };
export const rank = (r: Role | null | undefined) => (r ? ROLE_RANK[r] : 0);
/** Publishes as the community: announcements, articles, events, stories, pins. */
export const isEditorOrAdmin = (r: Role | null | undefined) => rank(r) >= 3 || r === "editor";

// ── Cargos personalizados (Equipe e cargos) ─────────────────────────────────
/** Todas as permissões que um cargo/override pode conceder, agrupadas para a UI. */
export const COMMUNITY_PERMISSIONS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Conteúdo",
    items: [
      { key: "post", label: "Criar publicações" },
      { key: "publish_as_community", label: "Publicar como comunidade" },
      { key: "discussion", label: "Criar discussões" },
      { key: "poll", label: "Criar enquetes" },
      { key: "event", label: "Criar eventos" },
      { key: "announcement", label: "Criar avisos" },
      { key: "photo", label: "Adicionar fotos" },
      { key: "video", label: "Adicionar vídeos" },
      { key: "story", label: "Publicar histórias" },
      { key: "comment", label: "Comentar" },
    ],
  },
  {
    group: "Membros",
    items: [
      { key: "manage_members", label: "Gerenciar membros" },
      { key: "approve_members", label: "Aprovar membros" },
      { key: "remove_members", label: "Remover membros" },
      { key: "ban_members", label: "Bloquear membros" },
      { key: "invite", label: "Convidar membros" },
    ],
  },
  {
    group: "Moderação",
    items: [
      { key: "moderate", label: "Moderar comentários" },
      { key: "delete_content", label: "Excluir conteúdo" },
    ],
  },
  {
    group: "Comunidade",
    items: [
      { key: "edit_community", label: "Editar comunidade" },
      { key: "manage_shortcuts", label: "Gerenciar atalhos" },
      { key: "manage_events", label: "Gerenciar eventos" },
      { key: "manage_media", label: "Gerenciar mídias" },
      { key: "manage_roles", label: "Gerenciar cargos" },
      { key: "view_stats", label: "Ver estatísticas" },
      { key: "view_downloads", label: "Ver downloads e auditoria" },
    ],
  },
];
export const PERMISSION_KEYS = COMMUNITY_PERMISSIONS.flatMap((g) => g.items.map((i) => i.key));
export const PERM_LABEL: Record<string, string> = Object.fromEntries(COMMUNITY_PERMISSIONS.flatMap((g) => g.items.map((i) => [i.key, i.label])));
export const ROLE_ICON_KEYS = ["star", "crown", "shield", "hammer", "key", "flag", "rocket", "heart", "zap", "gem"] as const;
export const ROLE_COLORS = ["#ec4899", "#8b5cf6", "#6366f1", "#3b82f6", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#f43f5e", "#a3a3a3"];

export type CommunityCustomRole = { id: string; name: string; description: string | null; color: string; icon: string; rank: number; permissions: Record<string, boolean>; sortOrder: number };
export type CommunityRoleBadge = { id: string; name: string; color: string; icon: string; rank: number };

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
  story: "Publicar histórias",
  event: "Criar eventos",
  suggest: "Sugerir posts",
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
  { id: "indigo", label: "Índigo", rgb: "99 102 241", from: "#6366f1", to: "#22d3ee" },
  { id: "rosa", label: "Rosa", rgb: "244 63 94", from: "#f43f5e", to: "#8b5cf6" },
  { id: "limao", label: "Limão", rgb: "132 204 22", from: "#84cc16", to: "#22d3ee" },
  { id: "ouro", label: "Ouro", rgb: "234 179 8", from: "#eab308", to: "#f97316" },
  { id: "gelo", label: "Gelo", rgb: "56 189 248", from: "#94a3b8", to: "#38bdf8" },
  { id: "rubi", label: "Rubi", rgb: "244 63 94", from: "#e11d48", to: "#f59e0b" },
];
export const accentOf = (id: string | null) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

/** Can (probably) do this — mirrors community_can() for the UI. The database decides for real. */
export function can(c: Pick<Community, "permissions" | "isPrivate">, role: Role | null, key: PermissionKey) {
  // "Sugerir posts" vem desligado: só vale quando o dono libera (Gerenciar → Permissões).
  const need = c.permissions?.[key] ?? (key === "story" || key === "event" || key === "suggest" ? "admins" : "members");
  const r = rank(role);
  if (need === "all") return !c.isPrivate || r >= 1;
  if (need === "members") return r >= 1;
  if (need === "admins") return r >= 3 || role === "editor";
  return r >= 4;
}

export type DiscussionCategory = "geral" | "apresentacoes" | "sugestoes" | "suporte" | "offtopic" | "eventos" | "noticias";
export const DISCUSSION_CATEGORIES: { id: DiscussionCategory; label: string; emoji: string }[] = [
  { id: "geral", label: "Geral", emoji: "💬" },
  { id: "apresentacoes", label: "Apresentações", emoji: "👋" },
  { id: "sugestoes", label: "Sugestões", emoji: "💡" },
  { id: "suporte", label: "Suporte", emoji: "🛟" },
  { id: "offtopic", label: "Off Topic", emoji: "🎲" },
  { id: "eventos", label: "Eventos", emoji: "📅" },
  { id: "noticias", label: "Notícias", emoji: "📰" },
];
export const categoryOf = (id: string | null | undefined) => DISCUSSION_CATEGORIES.find((c) => c.id === id) ?? DISCUSSION_CATEGORIES[0];

export type ReactionKey = "like" | "haha" | "wow" | "sad" | "angry" | "fire" | "clap";
export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "like", emoji: "❤️", label: "Curtir" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Uau" },
  { key: "sad", emoji: "😢", label: "Triste" },
  { key: "angry", emoji: "😡", label: "Grr" },
  { key: "fire", emoji: "🔥", label: "Fogo" },
  { key: "clap", emoji: "👏", label: "Palmas" },
];
export const reactionOf = (k: string | null | undefined) => REACTIONS.find((r) => r.key === k) ?? REACTIONS[0];

const ERRORS: [RegExp, string][] = [
  [/community_forbidden|forbidden|insufficient_privilege/, "Você não tem permissão para isso nesta comunidade."],
  [/owner_only/, "Somente o proprietário pode alterar isso."],
  [/banned/, "Você está bloqueado nesta comunidade."],
  [/links_blocked/, "Links não são permitidos aqui."],
  [/suggestions_off/, "Esta comunidade não está recebendo sugestões de posts."],
  [/too_many_suggestions/, "Você já tem 10 sugestões esperando a administração. Aguarde a análise."],
  [/not_member/, "Entre na comunidade para sugerir um post."],
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
  [/muted/, "Você está silenciado nesta comunidade no momento."],
  [/event_full/, "As vagas deste evento acabaram."],
  [/event_closed/, "Este evento já terminou ou foi cancelado."],
  [/invalid_date/, "Confira a data e o horário (o início não pode estar no passado)."],
  [/invalid_event/, "Confira o nome (3 a 120 letras) e os demais campos do evento."],
  [/invalid_category/, "Escolha uma categoria válida."],
  [/invalid_article/, "O artigo precisa de um título (3 a 140 letras) e de pelo menos 20 caracteres de texto."],
  [/invalid_discussion/, "O título precisa ter entre 3 e 140 caracteres."],
  [/blocked_words/, "O texto tem palavras bloqueadas por esta comunidade."],
  [/private_community/, "Publicações de comunidades privadas não podem ser repostadas."],
  [/invalid_option/, "Opção inválida."],
  [/invalid_members/, "Escolha de 1 a 50 amigos."],
  [/is_staff/, "Você faz parte da administração: as mensagens dos membros chegam para você no Messenger."],
  [/invalid_kind/, "Tipo de conteúdo não suportado."],
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
  // Confirm the real bytes match the declared kind; store the verified type (documents keep their declared type).
  const found = await sniffFile(file);
  const sniffKind = kind === "file" ? "document" : kind;
  if (!found || found.kind !== sniffKind) throw new Error("Este arquivo não é permitido ou está corrompido.");
  const contentType = found.kind === "document" ? file.type : found.mime;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${userId}/communities/${communityId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Falha no envio do arquivo. Tente de novo.");
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  const dims = await dimensions(file, kind);
  return { type: kind, url: data.publicUrl, mimeType: file.type, sizeBytes: file.size, name: file.name, ...dims };
}

export function communityHref(slug: string, extra = "") {
  return `/comunidades/${slug}${extra}`;
}

/** Registra o download no Órbita X (privado, para a auditoria) e entrega o arquivo ao usuário. */
export async function downloadCommunityMedia(
  supabase: SupabaseClient<Database>,
  postId: string,
  mediaId: string | null,
  url: string,
  name?: string | null
) {
  try {
    await supabase.rpc("community_register_download", { p_post: postId, p_media: mediaId });
  } catch {
    /* o registro é best-effort; o download continua */
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name || url.split("/").pop() || "arquivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    // CORS ou rede: abre em nova aba como alternativa
    window.open(url, "_blank", "noopener");
  }
}

export function compactNumber(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".0", "").replace(".", ",")} mil`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")} mi`;
}

/** "agora" for the first minute, then "há 5 minutos", "há 2 dias"… */
export function ago(iso: string) {
  const d = parseDbDate(iso);
  return Date.now() - d.getTime() < 60_000 ? "agora" : timeAgo(d.toISOString());
}

/** Some columns are "timestamp without time zone" (stored in UTC): read them as UTC, not local time. */
export function parseDbDate(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "sáb., 12 de out. · 19:30" in the viewer's timezone. */
export function eventDate(iso: string, withYear = false) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
  return `${day} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
