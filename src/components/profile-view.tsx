import Link from "next/link";
import { PostCard, type FeedPost } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { ProfileTabs } from "@/components/profile-tabs";
import { FollowButton } from "@/components/follow-button";
import { FriendButton, FriendRequestActions } from "@/components/friend-button";
import { BlockedProfileNotice } from "@/components/block-user";
import { ProfileGiftButton } from "@/components/profile-gift-button";
import { ProfileFamily, type FamilyMember, type FamilyRequest } from "@/components/profile-family";
import { ProfileTestimonials, type Testimonial, type PendingTestimonial } from "@/components/profile-testimonials";
import type { FriendState } from "@/lib/friends";
import {
  CoverMenu,
  OrbitIcon,
  ProfileImageUpload,
  ProfileMoreMenu,
  ShareProfileButton,
} from "@/components/profile-client";
import { presenceOf } from "@/lib/presence";
import { AvatarImage } from "@/components/avatar";
import { ProfileMoments } from "@/components/personal-stories";
import { AvatarMenu } from "@/components/avatar-menu-button";
import { NavBack } from "@/components/nav-back";
import { PublishButton } from "@/components/publish/publish-provider";
import { relationshipLabel } from "@/lib/profile-options";
import { MyRpgsCard } from "@/components/my-rpgs-card";
import { ProfileMusic, type ProfileMusicData } from "@/components/profile-music";
import { AchievementsGrid } from "@/components/achievements";
import { computeAchievements } from "@/lib/achievements";
import type { LevelInfo } from "@/lib/level";
import { frameBackdropStyle, frameSrc, getFrame, type AvatarFrame } from "@/lib/avatar-frames";
import { hasCustomAccent, profileAccentStyle } from "@/lib/profile-colors";
import { OnlineDot, PresenceDot, PresenceStatus } from "@/components/presence-picker";
import {
  Archive,
  Cake,
  Info,
  PlusCircle,
  Camera,
  Check,
  ChevronRight,
  Crown,
  Gem,
  Heart,
  ImagePlus,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
  PenLine,
  Plus,
  Shield,
  Sparkles,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export type ProfileInfo = {
  /** Already hidden (null) by the database when the owner chose not to show it. */
  age: number | null;
  location: string | null;
  zodiacSign: string | null;
  showAge: boolean;
  showLocation: boolean;
  showSign: boolean;
  interests: string | null;
  website: string | null;
  showInterests?: boolean;
  showRelationship?: boolean;
  relationshipStatus?: string | null;
};

export function parseInterests(raw: string | null | undefined) {
  return (raw ?? "")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
}

function Silhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="24" r="12" fill="currentColor" />
      <path d="M10 58c2-12 11-19 22-19s20 7 22 19" fill="currentColor" />
    </svg>
  );
}

function ProfileAvatar({
  name,
  url,
  userId,
  isMe,
  online,
  accent,
  frame,
  className,
  username,
}: {
  name: string;
  url: string | null;
  userId: string;
  isMe: boolean;
  online: boolean;
  accent: boolean;
  frame: AvatarFrame | null;
  className: string;
  username: string;
}) {
  const photo = <AvatarImage url={url} name={name} shape="auto" />;

  const picture = frame ? (
    <>
      <div aria-hidden className="pointer-events-none absolute -inset-[30%]" style={frameBackdropStyle(frame)} />
      <div className="relative h-full w-full">{photo}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameSrc(frame.id)}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -inset-[30%] h-[160%] w-[160%] max-w-none select-none"
      />
    </>
  ) : (
    <div
      className={`h-full w-full rounded-full p-[4px] ${
        accent
          ? "bg-pa shadow-[0_0_34px_rgb(var(--pa)/0.6)]"
          : "bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] shadow-[0_0_32px_rgba(139,92,246,0.45)]"
      }`}
    >
      <div className="h-full w-full rounded-full border-4 border-space-surface">{photo}</div>
    </div>
  );

  return (
    <div className={`relative shrink-0 ${className}`}>
      {isMe ? (
        // Tapping the picture itself opens the photo menu, as the spec asks.
        <AvatarMenu userId={userId} avatarUrl={url} username={username} hasFrame={!!frame}>
          <div className="h-full w-full">{picture}</div>
        </AvatarMenu>
      ) : (
        picture
      )}
      <OnlineDot userId={userId} initial={online ? "online" : "offline"} className="absolute bottom-[7%] right-[7%] z-10 h-4 w-4 rounded-full border-[3px] border-space-surface bg-emerald-400" />
    </div>
  );
}

export type ProfileViewProps = {
  user: {
    id: string;
    name: string;
    username: string;
    orbitId: string | null;
    bio: string | null;
    isVerified: boolean;
    lastSeenAt: string | null;
    presence: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    profileColor: string;
    avatarFrame: string | null;
    isPremium?: boolean;
    createdAt?: string | null;
    profileMusic?: unknown;
  };
  info: ProfileInfo | null | undefined;
  current: { authId: string; profile: { name: string; avatarUrl: string | null } } | null;
  isFollowing: boolean;
  stats: {
    posts: number;
    friends: number;
    followers: number;
    following: number;
    communities: number;
    /** Total real de fotos/vídeos das publicações (null = não deu para contar; usa as carregadas). */
    photos?: number | null;
    videos?: number | null;
  };
  /** Algumas pessoas que seguem o perfil, para a prévia ao lado de "seguidores". */
  followerPreview?: ProfileFriend[];
  level: LevelInfo;
  /** Saldo real de Diamantes (Órbita Coins); só chega quando é o próprio perfil. */
  coins?: number | null;
  feed: FeedPost[];
  pinnedPostId: string | null;
  /** Só o dono: o perfil está mostrando "Publicações arquivadas". */
  showArchive?: boolean;
  /** Publicações deste perfil que quem está vendo já salvou. */
  savedPostIds?: string[];
  communities: ProfileCommunity[];
  /** Só o dono: comunidades que ele escolheu esconder do perfil (aparecem marcadas para ele). */
  hiddenCommunityIds?: string[];
  /** Cargos personalizados por comunidade (crachás), keyed pelo id da comunidade. */
  roleBadges?: Record<string, { name: string; color: string; icon: string }[]>;
  friends: ProfileFriend[];
  friendState?: FriendState;
  friendRequests?: ProfileFriend[];
  /** Você bloqueou esta pessoa: o perfil mostra só o aviso com "Desbloquear". */
  blockedByMe?: boolean;
  family?: FamilyMember[];
  familyRequests?: FamilyRequest[];
  testimonials?: Testimonial[];
  testimonialsPending?: PendingTestimonial[];
  myTestimonial?: { body: string; status: string } | null;
};

export type ProfileCommunity = { id: string; name: string; slug: string; avatarUrl: string | null; role: string };

export type ProfileFriend = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  presence: string;
  isVerified: boolean;
};

const ROLE_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  owner: { label: "Proprietário", icon: Crown, className: "text-amber-400" },
  admin: { label: "Moderador", icon: Shield, className: "text-orbit-cyan" },
  moderator: { label: "Moderador", icon: Shield, className: "text-orbit-cyan" },
  member: { label: "Membro", icon: UserIcon, className: "text-white/60" },
};

function SideCard({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ox-card rounded-2xl border border-white/10 bg-space-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          {title}
          {typeof count === "number" && <span className="ml-1.5 font-normal text-white/45">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProfileView({
  user,
  info,
  current,
  isFollowing,
  stats,
  level,
  coins,
  feed,
  pinnedPostId,
  showArchive = false,
  savedPostIds = [],
  communities,
  hiddenCommunityIds = [],
  roleBadges = {},
  friends,
  friendState = "none",
  friendRequests = [],
  blockedByMe = false,
  followerPreview = [],
  family = [],
  familyRequests = [],
  testimonials = [],
  testimonialsPending = [],
  myTestimonial = null,
}: ProfileViewProps) {
  const isMe = current?.authId === user.id;

  const presence = presenceOf(user.presence);
  const online = presence === "online";
  const accent = hasCustomAccent(user.profileColor);
  const frame = getFrame(user.avatarFrame);

  const accountAgeDays = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) : 0;
  const achievements = computeAchievements({
    posts: stats.posts,
    followers: stats.followers,
    friends: stats.friends,
    communities: stats.communities,
    level: level.level,
    accountAgeDays,
    isVerified: user.isVerified,
    isPremium: !!user.isPremium,
    hasAvatar: !!user.avatarUrl,
    hasCover: !!user.coverUrl,
    hasBio: !!user.bio,
  });
  const music = (user.profileMusic ?? null) as ProfileMusicData | null;

  const age = info?.age ?? null;
  const sign = info?.zodiacSign && (isMe || info.showSign) ? info.zodiacSign : null;
  const location = info?.location && (isMe || info.showLocation) ? info.location : null;
  const interests = isMe || info?.showInterests !== false ? parseInterests(info?.interests) : [];
  const relationship =
    isMe || info?.showRelationship !== false ? relationshipLabel(info?.relationshipStatus) : null;
  const website = info?.website?.trim() || null;
  const websiteHref = website && (/^https?:\/\//i.test(website) ? website : `https://${website}`);

  const identity = (center = false) => (
    <>
      <div className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}>
        <h1 className="min-w-0 break-words font-display text-[22px] font-bold leading-tight text-white md:text-2xl">{user.name}</h1>
        {user.isVerified && <VerifiedBadge className="h-5 w-5 md:h-6 md:w-6" />}
        {user.isPremium && (
          <span title="Órbita Premium" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orbit-purple text-snow md:h-6 md:w-6">
            <Crown className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </span>
        )}
      </div>
      <div className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/60 ${center ? "justify-center" : ""}`}>
        <span>@{user.username}</span>
        <span aria-hidden className="text-white/25">•</span>
        <PresenceStatus userId={user.id} initial={user.presence} editable={isMe} />
        <span
          title={`Nível ${level.level} · ${level.xpIntoLevel.toLocaleString("pt-BR")} / ${level.xpForNext.toLocaleString("pt-BR")} XP`}
          className="rounded-full border border-pa/30 bg-pa/10 px-2 py-0.5 text-[11px] font-semibold text-pa"
        >
          Nível {level.level}
        </span>
      </div>
    </>
  );

  const metaItems = (
    <>
      {location && (
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-white/45" /> {location}
        </span>
      )}
      {age !== null && (
        <span className="flex items-center gap-1.5">
          <Cake className="h-4 w-4 text-white/45" /> {age} anos
        </span>
      )}
      {sign && (
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-white/45" /> {sign}
        </span>
      )}
      {website && websiteHref && (
        <a href={websiteHref} target="_blank" rel="noopener noreferrer nofollow" className="flex max-w-[16rem] items-center gap-1.5 truncate text-orbit-blue hover:underline">
          <Link2 className="h-4 w-4 shrink-0" /> <span className="truncate">{website.replace(/^https?:\/\//i, "")}</span>
        </a>
      )}
    </>
  );

  // compact: só a bio (sem a linha de cidade/idade/signo e sem interesses), usado no celular.
  const bioAndMeta = (center = false, compact = center) => (
    <>
      {user.bio ? (
        <p className={`mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/85 md:max-w-xl md:text-sm ${center ? "mx-auto text-center" : ""}`}>{user.bio}</p>
      ) : (
        isMe && (
          <Link href="/configuracoes/conta" className={`mt-3 block text-sm text-white/55 hover:text-white ${center ? "text-center" : ""}`}>
            Conte um pouco sobre você...
          </Link>
        )
      )}
      {!compact && (age !== null || sign || location || website) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/65">{metaItems}</div>
      )}
      {!compact && (interests.length > 0 || isMe) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {interests.map((i) => (
            <span key={i} className="rounded-lg border border-pa/40 bg-pa/10 px-3 py-1 text-xs text-white/85">
              {i}
            </span>
          ))}
          {isMe && (
            <Link
              href="/configuracoes/conta"
              aria-label="Adicionar interesses"
              className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {interests.length === 0 && "Adicionar interesses"}
            </Link>
          )}
        </div>
      )}
    </>
  );

  const editButton = (extra: string) => (
    <Link
      href="/configuracoes/conta"
      className={`flex items-center justify-center rounded-xl text-sm font-semibold transition ${
        accent
          ? "border border-pa bg-pa/15 text-white shadow-[0_0_22px_rgb(var(--pa)/0.35)] hover:bg-pa/25"
          : "bg-orbit-gradient text-snow shadow-glow hover:opacity-90"
      } ${extra}`}
    >
      Editar perfil
    </Link>
  );

  const isFriend = friendState === "friends";
  const messageButton = (compact: boolean) =>
    isFriend ? (
      <Link
        href={`/mensagens?com=${encodeURIComponent(user.username)}`}
        aria-label="Mensagem"
        className={`flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 text-sm font-medium text-white transition hover:bg-white/5 ${
          compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5"
        }`}
      >
        <MessageCircle className="h-4 w-4" /> {!compact && "Mensagem"}
      </Link>
    ) : (
      <span
        title="O chat é liberado quando o pedido de amizade for aceito."
        aria-label="Mensagem disponível apenas para amigos"
        className={`flex cursor-default items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-white/40 ${
          compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5"
        }`}
      >
        <Lock className="h-4 w-4" /> {!compact && "Mensagem"}
      </span>
    );

  const visitorActions = (compact: boolean) =>
    current && !blockedByMe && (
      <>
        <FriendButton targetUserId={user.id} initialState={friendState} className={compact ? "min-w-0 flex-1" : ""} />
        <FollowButton targetUserId={user.id} initiallyFollowing={isFollowing} variant="outline" compact={compact} />
        {messageButton(compact)}
        <ProfileGiftButton
          recipient={{ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl }}
          compact={compact}
        />
      </>
    );

  const friendRequestsCard =
    isMe && friendRequests.length > 0 ? (
      <section className="rounded-2xl border border-orbit-purple/40 bg-space-surface/80 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <UserPlus className="h-4 w-4 text-orbit-purple" /> Pedidos de amizade
          <span className="rounded-full bg-orbit-purple/20 px-2 py-0.5 text-[11px] text-orbit-purple">{friendRequests.length}</span>
        </h2>
        <p className="mt-0.5 text-xs text-white/50">
          Ao aceitar, vocês viram amigos e o chat é liberado. Se recusar, a pessoa continua como seguidora.
        </p>
        <div className="mt-3 space-y-2">
          {friendRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-2.5">
              <Link href={`/perfil/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-space-card">
                  {r.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{r.name}</span>
                  <span className="block truncate text-xs text-white/50">@{r.username}</span>
                </span>
              </Link>
              <FriendRequestActions requesterId={r.id} />
            </div>
          ))}
        </div>
      </section>
    ) : null;

  const emptyFeed = isMe ? (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80 px-6 py-12 text-center md:py-16">
      <span className="pointer-events-none absolute left-[22%] top-1/3 text-orbit-blue/50">✦</span>
      <span className="pointer-events-none absolute right-[24%] top-1/2 text-orbit-purple/50">✦</span>
      <OrbitIcon className="mx-auto mb-5 h-16 w-24 drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]" />
      <h3 className="font-display text-lg font-semibold text-white md:text-xl">Seu universo está esperando.</h3>
      <p className="mt-2 text-sm text-white/65">Comece compartilhando sua primeira publicação.</p>
      <a
        href="#composer"
        className="mt-6 inline-block rounded-full bg-orbit-gradient px-12 py-3 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 md:px-14"
      >
        Criar publicação
      </a>
    </div>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-10 text-center text-sm text-white/50">
      {user.name} ainda não publicou nada.
    </div>
  );

  const pinnedPost = pinnedPostId ? feed.find((p) => p.id === pinnedPostId) : undefined;
  const orderedFeed = pinnedPost ? [pinnedPost, ...feed.filter((p) => p.id !== pinnedPostId)] : feed;

  const feedList = feed.length ? (
    <div className="space-y-4">
      {orderedFeed.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={current?.authId ?? ""}
          pinned={post.id === pinnedPostId}
          canPin={isMe}
          initiallySaved={savedPostIds.includes(post.id)}
        />
      ))}
    </div>
  ) : (
    emptyFeed
  );

  const aboutRows: { icon: React.ComponentType<{ className?: string }>; text: string | null; prompt: string }[] = [
    { icon: MapPin, text: location, prompt: "Adicionar cidade" },
    { icon: Cake, text: age !== null ? `${age} anos` : null, prompt: "Data de nascimento" },
    { icon: Sparkles, text: sign, prompt: "Seu signo" },
    { icon: Heart, text: relationship, prompt: "Relacionamento" },
    { icon: Gem, text: interests.length ? interests.join(", ") : null, prompt: "Seus interesses" },
    { icon: Link2, text: website, prompt: "Site ou link" },
  ];
  const visibleAbout = aboutRows.filter((r) => r.text || isMe);

  const aboutList =
    user.bio || visibleAbout.some((r) => r.text) || isMe ? (
      <div className="space-y-2.5 text-sm">
        {user.bio && <p className="text-white/80">{user.bio}</p>}
        {visibleAbout.map(({ icon: Icon, text, prompt }) =>
          text ? (
            <p key={prompt} className="flex items-start gap-2.5 text-white/80">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/45" /> <span className="min-w-0 break-words">{text}</span>
            </p>
          ) : (
            <Link key={prompt} href="/configuracoes/conta" className="flex items-center gap-2.5 text-white/45 hover:text-white/75">
              <Icon className="h-4 w-4 shrink-0" /> {prompt}
            </Link>
          )
        )}
      </div>
    ) : null;

  const onboardingSteps = [
    { done: !!user.avatarUrl, label: "Adicione uma foto de perfil", field: "avatarUrl" as const, icon: Camera },
    { done: !!user.coverUrl, label: "Adicione uma capa", field: "coverUrl" as const, icon: ImagePlus },
    { done: !!user.bio, label: "Escreva sua bio", field: null, icon: PenLine },
  ];
  const stepClass =
    "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 px-3.5 py-3 text-left text-sm transition";

  const onboarding =
    isMe && onboardingSteps.some((st) => !st.done) ? (
      <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
        <h2 className="text-sm font-semibold text-white">Personalize seu perfil</h2>
        <p className="mt-0.5 text-xs text-white/50">Complete estes passos para as pessoas conhecerem você.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {onboardingSteps.map(({ done, label, field, icon: Icon }) => {
            const content = (
              <>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    done ? "bg-emerald-500/15 text-emerald-400" : "bg-orbit-gradient text-snow"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={done ? "text-white/45 line-through" : "text-white/85"}>{label}</span>
              </>
            );
            if (done) return <div key={label} className={stepClass}>{content}</div>;
            return field ? (
              <ProfileImageUpload key={label} userId={user.id} field={field} ariaLabel={label} className={`${stepClass} hover:border-orbit-purple/50`}>
                {content}
              </ProfileImageUpload>
            ) : (
              <Link key={label} href="/configuracoes/conta" className={`${stepClass} hover:border-orbit-purple/50`}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    ) : null;

  const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
  const seeAll = (tab: string, label = "Ver todas") => (
    <a href={`#tab-${tab}`} className="text-xs font-medium text-pa hover:underline">
      {label}
    </a>
  );

  // Administradas primeiro, depois as que a pessoa só participa.
  const isStaff = (role: string) => role === "owner" || role === "admin" || role === "moderator";
  const sortedCommunities = [...communities].sort((a, b) => Number(isStaff(b.role)) - Number(isStaff(a.role)));
  const hiddenSet = new Set(hiddenCommunityIds);

  const allMedia = feed.flatMap((p) => p.media);
  const photos = allMedia.filter((m) => m.type === "image");
  const videos = allMedia.filter((m) => m.type === "video");
  const audioPosts = feed.filter((p) => p.media.some((m) => m.type === "audio"));
  const photoTotal = stats.photos ?? photos.length;
  const videoTotal = stats.videos ?? videos.length;

  const cardClass = "ox-card rounded-2xl border border-white/10 bg-space-surface";

  const avatarStack = (people: ProfileFriend[]) =>
    people.length > 0 && (
      <span className="flex -space-x-2.5">
        {people.slice(0, 3).map((f) => (
          <span key={f.id} className="flex h-8 w-8 items-end justify-center overflow-hidden rounded-full border-2 border-space-surface bg-space-card">
            {f.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
            )}
          </span>
        ))}
      </span>
    );

  // ---------- Coluna lateral (computador): informações complementares ----------
  const aboutFilled = visibleAbout.filter((r) => r.text);
  const aside = (
    <>
      {(user.bio || aboutFilled.length > 0 || isMe) && (
        <SideCard
          title="Sobre mim"
          action={
            isMe ? (
              <Link href="/configuracoes/conta" className="text-xs font-medium text-pa hover:underline">
                Editar
              </Link>
            ) : (
              seeAll("sobre", "Ver mais")
            )
          }
        >
          {user.bio && <p className="mb-3 whitespace-pre-line text-[13px] leading-relaxed text-white/75">{user.bio}</p>}
          {aboutFilled.length > 0 ? (
            <div className="space-y-2.5 text-[13px]">
              {aboutFilled.slice(0, 6).map(({ icon: Icon, text, prompt }) => (
                <p key={prompt} className="flex items-start gap-2.5 text-white/75">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                  <span className="min-w-0 break-words">{text}</span>
                </p>
              ))}
            </div>
          ) : (
            !user.bio && <p className="text-[13px] text-white/45">Nenhuma informação ainda.</p>
          )}
          {isMe && (
            <Link
              href="/configuracoes/conta"
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] py-2 text-[13px] font-medium text-white/85 transition hover:bg-white/[0.06]"
            >
              Editar informações
            </Link>
          )}
        </SideCard>
      )}

      {photos.length > 0 && (
        <SideCard title="Fotos" count={photoTotal} action={seeAll("fotos")}>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.slice(0, 6).map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        </SideCard>
      )}

      {friends.length > 0 && (
        <SideCard title="Amigos" count={stats.friends} action={seeAll("amigos")}>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {friends.slice(0, 8).map((f) => (
              <Link key={f.id} href={`/perfil/${f.username}`} className="group flex min-w-0 flex-col items-center gap-1.5 text-center">
                <span className="relative">
                  <span className="flex h-[52px] w-[52px] items-end justify-center overflow-hidden rounded-full border-2 border-pa/50 bg-space-card p-[2px] transition group-hover:border-pa">
                    <span className="flex h-full w-full items-end justify-center overflow-hidden rounded-full bg-space-card">
                      {f.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
                      )}
                    </span>
                  </span>
                  <PresenceDot value={f.presence} userId={f.id} className="absolute bottom-0 right-0 h-3 w-3 border-2 border-space-surface" />
                </span>
                <span className="max-w-full truncate text-[11px] text-white/75">{f.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        </SideCard>
      )}

      {sortedCommunities.length > 0 && (
        <SideCard title="Comunidades" count={sortedCommunities.length} action={seeAll("comunidades")}>
          <ul className="space-y-1">
            {sortedCommunities.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/comunidades/${c.slug}`} className="-mx-1.5 flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition hover:bg-white/5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <OrbitIcon className="h-5 w-7" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-white">{c.name}</span>
                    <span className="block text-[11px] text-white/45">
                      {(ROLE_LABEL[c.role] ?? ROLE_LABEL.member).label}
                      {isMe && hiddenSet.has(c.id) && " · oculta"}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </Link>
              </li>
            ))}
          </ul>
        </SideCard>
      )}

      {testimonials.length > 0 && (
        <SideCard title="Depoimentos" count={testimonials.length} action={seeAll("depoimentos", "Ver todos")}>
          <ul className="space-y-3">
            {testimonials.slice(0, 2).map((t) => (
              <li key={t.id} className="flex gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-end justify-center overflow-hidden rounded-full bg-space-card">
                  {t.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-white">{t.name}</span>
                  <span className="line-clamp-3 text-[12px] leading-snug text-white/65">“{t.body}”</span>
                </span>
              </li>
            ))}
          </ul>
        </SideCard>
      )}
    </>
  );

  // ---------- Conteúdo das abas ----------
  const communityRow = (c: ProfileCommunity) => {
    const role = ROLE_LABEL[c.role] ?? ROLE_LABEL.member;
    const RoleIcon = role.icon;
    return (
      <Link key={c.id} href={`/comunidades/${c.slug}`} className={`${cardClass} flex items-center gap-3 p-3 transition hover:border-pa/50`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-space-card">
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <OrbitIcon className="h-6 w-8" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
            <span className="truncate">{c.name}</span>
            {isMe && hiddenSet.has(c.id) && (
              <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-0.5 text-[10px] font-normal text-white/50">Oculta no perfil</span>
            )}
          </p>
          {roleBadges[c.id]?.length ? (
            <span className="mt-1 flex flex-wrap gap-1">
              {roleBadges[c.id].map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: b.color, borderColor: `${b.color}55`, background: `${b.color}1a` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} /> {b.name}
                </span>
              ))}
            </span>
          ) : (
            <p className={`flex items-center gap-1 text-xs ${role.className}`}>
              <RoleIcon className="h-3.5 w-3.5" /> {role.label}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 self-center text-white/40" />
      </Link>
    );
  };

  const staffCommunities = sortedCommunities.filter((c) => isStaff(c.role));
  const memberCommunities = sortedCommunities.filter((c) => !isStaff(c.role));
  const communitiesTab =
    sortedCommunities.length || isMe ? (
      <div className="space-y-4">
        {isMe && (
          <div className={`${cardClass} flex items-center justify-between gap-3 px-4 py-3 text-xs text-white/55`}>
            <span>Você escolhe quais comunidades aparecem para quem visita seu perfil.</span>
            <Link href="/configuracoes/comunidades" className="shrink-0 font-medium text-pa hover:underline">
              Gerenciar
            </Link>
          </div>
        )}
        {isMe && <MyRpgsCard username={user.username} />}
        {staffCommunities.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Administra</h3>
            <div className="space-y-2">{staffCommunities.map(communityRow)}</div>
          </section>
        )}
        {memberCommunities.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Participa</h3>
            <div className="space-y-2">{memberCommunities.map(communityRow)}</div>
          </section>
        )}
        {sortedCommunities.length === 0 && (
          <div className={`${cardClass} p-10 text-center text-sm text-white/50`}>
            Você ainda não participa de comunidades.{" "}
            <Link href="/comunidades" className="text-pa hover:underline">
              Explorar
            </Link>
          </div>
        )}
      </div>
    ) : undefined;

  const photosTab = photos.length ? (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {photos.map((m) => (
        <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg md:rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
        </a>
      ))}
    </div>
  ) : undefined;

  const videosTab = videos.length ? (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 md:gap-2">
      {videos.map((m) => (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video key={m.id} src={m.url} controls preload="metadata" className="aspect-[9/12] w-full rounded-xl bg-black object-cover" />
      ))}
    </div>
  ) : undefined;

  const musicTab =
    music || isMe || audioPosts.length ? (
      <div className="space-y-3 md:space-y-4">
        {(music || isMe) && (
          <section className={`${cardClass} p-4`}>
            <h3 className="mb-3 text-sm font-semibold text-white">Música do perfil</h3>
            <ProfileMusic music={music} isMe={isMe} userId={user.id} />
          </section>
        )}
        {audioPosts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={current?.authId ?? ""} pinned={post.id === pinnedPostId} canPin={isMe} initiallySaved={savedPostIds.includes(post.id)} />
        ))}
      </div>
    ) : undefined;

  const friendsList = friends.length ? (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {friends.map((f) => (
        <Link key={f.id} href={`/perfil/${f.username}`} className={`${cardClass} flex flex-col items-center px-2 py-4 text-center transition hover:border-pa/50`}>
          <span className="relative">
            <span className="flex h-16 w-16 items-end justify-center overflow-hidden rounded-full border-2 border-pa/60 bg-space-card">
              {f.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
              )}
            </span>
            <PresenceDot value={f.presence} userId={f.id} className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 border-2 border-space-surface" />
          </span>
          <span className="mt-2.5 flex max-w-full items-center gap-1">
            <span className="truncate text-sm font-medium text-white">{f.name}</span>
            {f.isVerified && <VerifiedBadge />}
          </span>
          <span className="max-w-full truncate text-xs text-white/55">@{f.username}</span>
        </Link>
      ))}
    </div>
  ) : undefined;

  const archiveBanner = showArchive ? (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-orbit-purple/30 bg-orbit-purple/[0.06] px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-white/80">
        <Archive className="h-4 w-4 text-orbit-purple" /> Publicações arquivadas · só você vê
      </p>
      <Link href={`/perfil/${user.username}`} className="shrink-0 text-xs font-medium text-pa hover:underline">
        Voltar ao perfil
      </Link>
    </div>
  ) : null;

  // ---------- Números (computador): faixa com 6 caixas, como no mockup ----------
  const statItems: { value: number; label: string; tab?: string }[] = [
    { value: stats.friends, label: "Amigos", tab: "amigos" },
    { value: stats.followers, label: "Seguidores" },
    { value: stats.following, label: "Seguindo" },
    { value: photoTotal, label: "Fotos", tab: "fotos" },
    { value: videoTotal, label: "Vídeos", tab: "videos" },
    { value: stats.communities, label: "Comunidades", tab: "comunidades" },
  ];
  const statsStrip = (
    <div className="grid grid-cols-6 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {statItems.map(({ value, label, tab }) => {
        const content = (
          <>
            <span className="block text-lg font-bold leading-tight text-white">{compact.format(value)}</span>
            <span className="mt-0.5 block text-xs text-white/55">{label}</span>
          </>
        );
        return tab ? (
          <a key={label} href={`#tab-${tab}`} className="px-2 py-3 text-center transition hover:bg-white/[0.04]">
            {content}
          </a>
        ) : (
          <span key={label} className="px-2 py-3 text-center">
            {content}
          </span>
        );
      })}
    </div>
  );

  const coverImage = user.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <div
      className={`flex h-full items-center justify-center bg-gradient-to-br ${
        accent ? "from-pa/45 via-[#0b0e1c] to-pa/15" : "from-[#1b2a6b] via-[#0b0e1c] to-[#3b1d5e]"
      }`}
    >
      {isMe && (
        <p className="flex items-center gap-2 text-xs text-snow/60">
          <ImagePlus className="h-4 w-4" /> Adicione uma capa
        </p>
      )}
    </div>
  );
  // Botões por cima da capa: sempre claros (a capa é uma imagem, em qualquer tema).
  const glassButton = "flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-snow backdrop-blur-md transition hover:bg-black/50";

  const moments = current?.authId ? <ProfileMoments viewerId={current.authId} userId={user.id} isMe={isMe} /> : null;

  return (
    <div
      className="mx-auto max-w-[1220px] md:px-5 md:py-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-5"
      style={profileAccentStyle(user.profileColor)}
    >
      <div className="min-w-0 space-y-3 md:space-y-4">
        {/* ================= COMPUTADOR ================= */}
        <section className={`${cardClass} hidden overflow-hidden md:block ${accent ? "border-pa/35 shadow-[0_0_40px_rgb(var(--pa)/0.12)]" : ""}`}>
          <div className="relative aspect-[7/2] max-h-[240px] w-full overflow-hidden">
            {coverImage}
            {isMe && (
              <CoverMenu
                userId={user.id}
                coverUrl={user.coverUrl}
                className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1.5 text-xs font-medium text-snow backdrop-blur-md transition hover:bg-black/55"
              />
            )}
          </div>

          <div className="flex gap-5 px-6 pb-5">
            <ProfileAvatar
              name={user.name}
              url={user.avatarUrl}
              userId={user.id}
              username={user.username}
              isMe={isMe}
              online={online}
              accent={accent}
              frame={frame}
              className={`-mt-16 h-[136px] w-[136px] ${frame ? "mx-6 mb-6" : ""}`}
            />
            <div className="min-w-0 flex-1 pt-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-[280px]">{identity()}</div>
                <div className="flex shrink-0 items-center gap-2">
                  {isMe ? (
                    <>
                      {editButton("px-5 py-2.5")}
                      <ShareProfileButton username={user.username} compact />
                    </>
                  ) : (
                    visitorActions(false)
                  )}
                  <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} name={user.name} friendState={friendState} blockedByMe={blockedByMe} />
                </div>
              </div>
              {bioAndMeta()}
            </div>
          </div>
          <div className="px-6 pb-5">{statsStrip}</div>
          {moments}
        </section>

        {/* ================= CELULAR ================= */}
        <section className="md:hidden">
          <div className="relative aspect-[9/4] w-full overflow-hidden">
            {coverImage}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
            <NavBack fallback="/feed" className={`${glassButton} absolute left-3 top-3`} />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              {isMe && (
                <CoverMenu
                  userId={user.id}
                  coverUrl={user.coverUrl}
                  inline
                  className={glassButton}
                />
              )}
              <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} name={user.name} friendState={friendState} blockedByMe={blockedByMe} variant="glass" />
            </div>
          </div>

          <div className="ox-card relative -mt-7 rounded-t-[28px] bg-space-surface px-4 pb-5">
            {/* Avatar à esquerda, sobrepondo só o canto da capa (no centro ele cobria a capa). */}
            <div className="flex justify-start">
              <ProfileAvatar
                name={user.name}
                url={user.avatarUrl}
                userId={user.id}
                username={user.username}
                isMe={isMe}
                online={online}
                accent={accent}
                frame={frame}
                className={`-mt-12 h-[104px] w-[104px] ${frame ? "mb-5 ml-5" : ""}`}
              />
            </div>
            <div className="mt-3">{identity()}</div>
            {bioAndMeta(false, true)}
            {(location || aboutFilled.length > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/55">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {location}
                  </span>
                )}
                <a href="#tab-sobre" className="flex items-center gap-1 text-white/70 hover:text-white">
                  <Info className="h-3.5 w-3.5" /> Saber mais
                </a>
              </div>
            )}
          </div>

          <div className="space-y-2.5 bg-space-bg px-3 pt-2.5">
            {current?.authId && (
              <ProfileMoments viewerId={current.authId} userId={user.id} isMe={isMe} frameClassName={`${cardClass} px-4 py-2.5`} />
            )}

            <div className={`${cardClass} grid grid-cols-2 divide-x divide-white/10`}>
              <a href="#tab-amigos" className="flex items-center justify-between gap-2 px-4 py-3.5 text-left">
                <span>
                  <span className="block text-xl font-bold leading-none text-white">{compact.format(stats.friends)}</span>
                  <span className="mt-1 block text-[13px] text-white/55">amigos</span>
                </span>
                {avatarStack(friends)}
              </a>
              <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                <span>
                  <span className="block text-xl font-bold leading-none text-white">{compact.format(stats.followers)}</span>
                  <span className="mt-1 block text-[13px] text-white/55">seguidores</span>
                </span>
                {avatarStack(followerPreview)}
              </div>
            </div>

            {(isMe || !blockedByMe) && (
            <div className={`${cardClass} flex items-center gap-2 p-2.5`}>
              {isMe ? (
                <>
                  <PublishButton
                    className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition active:scale-[0.99] ${
                      accent ? "bg-pa text-snow shadow-[0_0_24px_rgb(var(--pa)/0.35)]" : "bg-orbit-gradient text-snow shadow-glow"
                    }`}
                  >
                    <PlusCircle className="h-5 w-5" /> Publicar
                  </PublishButton>
                  <Link
                    href="/configuracoes/conta"
                    aria-label="Editar perfil"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 text-white/80"
                  >
                    <PenLine className="h-5 w-5" />
                  </Link>
                  <ShareProfileButton username={user.username} compact square />
                </>
              ) : (
                visitorActions(true)
              )}
            </div>
            )}
          </div>
        </section>

        <div className="space-y-3 px-3 md:space-y-4 md:px-0">
          {friendRequestsCard}
          {onboarding}
          {archiveBanner}

          {blockedByMe ? (
            <BlockedProfileNotice userId={user.id} name={user.name} />
          ) : (
          <ProfileTabs
            accent={accent}
            slots={{
              posts: (
                <div className="space-y-3 md:space-y-4">
                  {isMe && current && !showArchive && (
                    <PostComposer userId={current.authId} name={current.profile.name} avatarUrl={current.profile.avatarUrl} variant="profile" />
                  )}
                  {showArchive && feed.length === 0 ? (
                    <div className={`${cardClass} p-10 text-center text-sm text-white/50`}>Nenhuma publicação arquivada.</div>
                  ) : (
                    feedList
                  )}
                </div>
              ),
              sobre: aboutList ? <div className={`${cardClass} p-5`}>{aboutList}</div> : undefined,
              fotos: photosTab,
              videos: videosTab,
              musica: musicTab,
              momentos: current?.authId ? (
                <div className={`${cardClass} p-4`}>
                  <ProfileMoments viewerId={current.authId} userId={user.id} isMe={isMe} variant="grid" />
                </div>
              ) : undefined,
              comunidades: communitiesTab,
              amigos: friendsList,
              depoimentos: (
                <ProfileTestimonials
                  isMe={isMe}
                  canWrite={!!current}
                  profileName={user.name}
                  profileUserId={user.id}
                  approved={testimonials}
                  pending={testimonialsPending}
                  myExisting={myTestimonial}
                />
              ),
              familia: <ProfileFamily isMe={isMe} family={family} requests={familyRequests} />,
              conquistas: <AchievementsGrid achievements={achievements} isMe={isMe} name={user.name} />,
            }}
          />
          )}
        </div>
      </div>

      <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block">{aside}</aside>
    </div>
  );
}
