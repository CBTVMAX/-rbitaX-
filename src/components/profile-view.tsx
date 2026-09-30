import Link from "next/link";
import { PostCard, type FeedPost } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { ProfileTabs } from "@/components/profile-tabs";
import { FollowButton } from "@/components/follow-button";
import { FriendButton, FriendRequestActions } from "@/components/friend-button";
import { ProfileGiftButton } from "@/components/profile-gift-button";
import { ProfileFamily, type FamilyMember, type FamilyRequest } from "@/components/profile-family";
import { ProfileTestimonials, type Testimonial, type PendingTestimonial } from "@/components/profile-testimonials";
import type { FriendState } from "@/lib/friends";
import {
  OrbitIcon,
  ProfileImageUpload,
  ProfileMoreMenu,
  ProfileRightRail,
  ShareProfileButton,
} from "@/components/profile-client";
import { presenceOf } from "@/lib/presence";
import { AvatarImage } from "@/components/avatar";
import { PersonalStories } from "@/components/personal-stories";
import { AvatarMenu } from "@/components/avatar-menu-button";
import { relationshipLabel } from "@/lib/profile-options";
import { CoinIcon, formatCoins } from "@/components/coins";
import { MyRpgsCard } from "@/components/my-rpgs-card";
import { ProfileStatus } from "@/components/profile-status";
import { ProfileMusic, type ProfileMusicData } from "@/components/profile-music";
import { AchievementsCard, AchievementsGrid } from "@/components/achievements";
import { computeAchievements } from "@/lib/achievements";
import type { LevelInfo } from "@/lib/level";
import { frameBackdropStyle, frameSrc, getFrame, type AvatarFrame } from "@/lib/avatar-frames";
import { hasCustomAccent, profileAccentStyle, profileColorHex, profileColorLabel } from "@/lib/profile-colors";
import { OnlineDot, PresenceDot, PresenceStatus } from "@/components/presence-picker";
import {
  Cake,
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
  Music2,
  Palette,
  PenLine,
  Play,
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
      <div className="h-full w-full rounded-full border-4 border-space-bg">{photo}</div>
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
      <OnlineDot userId={userId} initial={online ? "online" : "offline"} className="absolute right-[9%] top-[58%] z-10 h-3.5 w-3.5 rounded-full border-2 border-space-bg bg-emerald-400" />
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-space-bg/40 px-1 py-2.5 text-center md:py-3.5">
      <p className="text-base font-bold text-white md:text-lg">{value}</p>
      <p className="text-[10px] text-white/60 md:text-xs">{label}</p>
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
  stats: { posts: number; friends: number; followers: number; following: number; communities: number };
  level: LevelInfo;
  /** Saldo real de Diamantes (Órbita Coins); só chega quando é o próprio perfil. */
  coins?: number | null;
  feed: FeedPost[];
  pinnedPostId: string | null;
  communities: ProfileCommunity[];
  /** Cargos personalizados por comunidade (crachás), keyed pelo id da comunidade. */
  roleBadges?: Record<string, { name: string; color: string; icon: string }[]>;
  friends: ProfileFriend[];
  friendState?: FriendState;
  friendRequests?: ProfileFriend[];
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

function SideCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
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
  communities,
  roleBadges = {},
  friends,
  friendState = "none",
  friendRequests = [],
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

  const identity = (
    <>
      <div className="flex items-center gap-2">
        <h1 className="truncate font-display text-xl font-bold text-white md:text-2xl">{user.name}</h1>
        {user.isVerified && <VerifiedBadge className="h-5 w-5 md:h-6 md:w-6" />}
        {user.isPremium && (
          <span title="Órbita Premium" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orbit-purple text-space-bg md:h-6 md:w-6">
            <Crown className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-white/70">
        @{user.username}
      </p>
      <PresenceStatus userId={user.id} initial={user.presence} editable={isMe} className="mt-1.5" />
    </>
  );

  const bioAndMeta = (
    <>
      {user.bio ? (
        <p className="mt-3 max-w-xl text-sm text-white/80">{user.bio}</p>
      ) : (
        isMe && (
          <Link href="/configuracoes/conta" className="mt-3 block text-sm text-white/70 hover:text-white">
            Conte um pouco sobre você...
          </Link>
        )
      )}
      {(age !== null || sign || location || website) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/65 md:text-sm">
          {age !== null && (
            <span className="flex items-center gap-1.5">
              <Cake className="h-4 w-4" /> {age} anos
            </span>
          )}
          {sign && (
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> {sign}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {location}
            </span>
          )}
          {website && websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex max-w-[16rem] items-center gap-1.5 truncate text-orbit-blue hover:underline"
            >
              <Link2 className="h-4 w-4 shrink-0" /> <span className="truncate">{website.replace(/^https?:\/\//i, "")}</span>
            </a>
          )}
        </div>
      )}
      {(interests.length > 0 || isMe) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {interests.map((i) => (
            <span key={i} className="rounded-lg border border-pa/50 bg-pa/10 px-3 py-1 text-xs text-white/85">
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

  const customizeButton = (compact: boolean) => (
    <Link
      href="/configuracoes/personalizar"
      aria-label="Personalizar perfil"
      title="Personalizar perfil"
      className={`flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 text-sm font-medium text-white transition hover:bg-white/5 ${
        compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5"
      }`}
    >
      <Palette className={`h-4 w-4 ${accent ? "text-pa" : "text-orbit-purple"}`} />
      {!compact && "Personalizar"}
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
    current && (
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

  const soonButton =
    "mt-3 w-full cursor-default rounded-xl border border-white/15 bg-space-bg/40 py-2 text-xs font-medium text-white/60";

  const statusAside = (
    <>
      <SideCard title="Nível">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orbit-gradient text-snow shadow-glow">
            <span className="text-lg font-bold leading-none">{level.level}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Nível {level.level}</p>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-orbit-gradient" style={{ width: `${Math.round(level.progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-white/50">
              {level.xpIntoLevel.toLocaleString("pt-BR")} / {level.xpForNext.toLocaleString("pt-BR")} XP
            </p>
          </div>
        </div>
      </SideCard>

      {isMe && (
        <SideCard title="Órbita Coins">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CoinIcon className="h-7 w-7" />
              <div>
                <p className="text-lg font-bold leading-none text-amber-300">{formatCoins(coins ?? 0)}</p>
                <p className="mt-1 text-[11px] text-white/50">Diamantes</p>
              </div>
            </div>
            <Link
              href="/loja"
              aria-label="Obter mais Diamantes"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
        </SideCard>
      )}

      {isMe &&
        (user.isPremium ? (
          <SideCard title="Órbita Premium">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-orbit-purple/20 text-amber-300">
                <Crown className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Premium ativo</p>
                <p className="text-xs text-white/50">Perfil personalizado e vantagens.</p>
              </div>
            </div>
            <Link
              href="/configuracoes"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Gerenciar assinatura
            </Link>
          </SideCard>
        ) : (
          <SideCard title="Órbita Premium">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-orbit-purple/15 text-amber-300">
                <Crown className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Seja Premium</p>
                <p className="text-xs text-white/50">Personalize seu perfil e desbloqueie vantagens.</p>
              </div>
            </div>
            <Link
              href="/loja"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orbit-purple py-2 text-xs font-semibold text-space-bg shadow-glow transition hover:opacity-90"
            >
              <Crown className="h-3.5 w-3.5" /> Conhecer o Premium
            </Link>
          </SideCard>
        ))}
    </>
  );

  const restAside = (
    <>
      {isMe && <MyRpgsCard username={user.username} />}

      {isMe && (
        <SideCard title="Seu tema atual">
          <div className="flex items-center gap-3">
            {accent ? (
              <span
                className="h-12 w-12 shrink-0 rounded-xl border border-pa/60 shadow-[0_0_16px_rgb(var(--pa)/0.45)]"
                style={{ backgroundColor: profileColorHex(user.profileColor) }}
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-orbit-purple/40 bg-gradient-to-br from-orbit-blue/25 to-orbit-purple/25">
                <Gem className="h-6 w-6 text-orbit-cyan" />
              </span>
            )}
            <div>
              <p className="text-sm font-medium text-white">{accent ? "Órbita X" : "Padrão Órbita X"}</p>
              <p className="text-xs text-white/50">Cor: {profileColorLabel(user.profileColor)}</p>
            </div>
          </div>
          <Link
            href="/configuracoes/personalizar"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            <Palette className="h-3.5 w-3.5" /> Personalizar perfil
          </Link>
        </SideCard>
      )}
      {isMe && (
        <SideCard title="Moldura do avatar">
          <Link
            href="/configuracoes/personalizar"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3 transition hover:border-orbit-purple/50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              {frame ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={frameSrc(frame.id)} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="h-11 w-11 rounded-full border-2 border-orbit-blue/70 shadow-[0_0_14px_rgba(43,108,255,0.45)]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{frame ? frame.name : "Nenhuma moldura"}</p>
              <p className="text-xs text-white/50">{frame ? "Toque para trocar a moldura" : "Escolha uma moldura para o seu avatar"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        </SideCard>
      )}
      <SideCard title="Conquistas">
        <AchievementsCard achievements={achievements} isMe={isMe} name={user.name} />
      </SideCard>
      {(music || isMe) && (
        <SideCard title="Música do perfil">
          <ProfileMusic music={music} isMe={isMe} userId={user.id} />
        </SideCard>
      )}
      {aboutList && (
        <SideCard
          title="Sobre mim"
          action={
            isMe && (
              <Link href="/configuracoes/conta" className="text-xs text-orbit-blue hover:underline">
                Editar
              </Link>
            )
          }
        >
          {aboutList}
        </SideCard>
      )}
    </>
  );

  // Coluna direita (tablet/desktop): status + demais módulos.
  const aside = (
    <>
      {statusAside}
      {restAside}
    </>
  );

  const communitiesList = communities.length ? (
    <div className="space-y-2">
      {communities.map((c) => {
        const role = ROLE_LABEL[c.role] ?? ROLE_LABEL.member;
        const RoleIcon = role.icon;
        return (
          <Link
            key={c.id}
            href={`/comunidades/${c.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-surface/80 p-3 transition hover:border-pa/50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-space-card">
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <OrbitIcon className="h-6 w-8" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{c.name}</p>
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
      })}
    </div>
  ) : undefined;

  const media = feed.flatMap((p) => p.media.filter((m) => m.type === "image" || m.type === "video"));

  const mediaGrid = media.length ? (
    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
      {media.map((m) =>
        m.type === "image" ? (
          <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
          </a>
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video key={m.id} src={m.url} controls preload="metadata" className="aspect-square w-full rounded-xl bg-black object-cover" />
        )
      )}
    </div>
  ) : undefined;

  const friendsList = friends.length ? (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {friends.map((f) => (
        <Link
          key={f.id}
          href={`/perfil/${f.username}`}
          className="flex flex-col items-center rounded-2xl border border-white/10 bg-space-surface/80 px-3 py-4 text-center transition hover:border-pa/50"
        >
          <span className="relative">
            <span className="flex h-16 w-16 items-end justify-center overflow-hidden rounded-full border-2 border-pa/60 bg-space-card">
              {f.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
              )}
            </span>
            <PresenceDot value={f.presence} userId={f.id} className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 border-2 border-space-bg" />
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

  return (
    <div className="mx-auto flex max-w-[1240px] gap-5 px-3 pt-3 md:px-5 md:py-5" style={profileAccentStyle(user.profileColor)}>
      <div className="min-w-0 flex-1 space-y-3 md:space-y-4">
        <section
          className={`rounded-2xl border bg-space-surface/80 ${
            accent ? "border-pa/40 shadow-[0_0_40px_rgb(var(--pa)/0.14)]" : "border-white/10"
          }`}
        >
          <div
            className={`relative overflow-hidden rounded-t-2xl ${
              !user.coverUrl && isMe ? "h-60 md:aspect-[8/3] md:h-auto" : "aspect-[8/3]"
            }`}
          >
            {user.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : isMe ? (
              <div className={`flex h-full flex-col items-center justify-start border-b border-dashed border-white/15 bg-gradient-to-br ${accent ? "from-pa/20 via-space-card to-pa/5" : "from-orbit-blue/10 via-space-card to-orbit-purple/10"} px-6 pt-6 text-center md:justify-center md:pb-4 md:pt-0`}>
                <ImagePlus className={`mb-3 h-9 w-9 ${accent ? "text-pa" : "text-orbit-blue/80"}`} />
                <p className="text-sm font-semibold text-white">Adicione uma capa</p>
                <p className="mt-1 max-w-xs text-xs text-white/55 md:max-w-none">
                  A capa é totalmente livre e pode ser qualquer imagem que você quiser.
                </p>
              </div>
            ) : (
              <div
                className={`h-full bg-gradient-to-br ${
                  accent ? "from-pa/35 via-space-card to-pa/15" : "from-orbit-blue/25 via-space-card to-orbit-purple/25"
                }`}
              />
            )}
            {isMe && (
              <ProfileImageUpload
                userId={user.id}
                field="coverUrl"
                ariaLabel="Editar capa"
                className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/15 bg-space-bg/80 p-2 text-xs font-medium text-white backdrop-blur transition hover:bg-space-bg md:right-4 md:top-4 md:rounded-xl md:px-3.5 md:py-2 md:text-sm"
              >
                <Camera className="h-4 w-4" /> <span className="hidden md:inline">Editar capa</span>
              </ProfileImageUpload>
            )}
          </div>

          {/* Personal stories, above the identity so they are the first thing seen. */}
          {current?.authId && <PersonalStories viewerId={current.authId} highlight={user.id} />}

          {/* Desktop */}
          <div className="hidden gap-6 px-6 pb-5 md:flex">
            <ProfileAvatar name={user.name} url={user.avatarUrl} userId={user.id} username={user.username} isMe={isMe} online={online} accent={accent} frame={frame} className={`-mt-24 h-44 w-44 ${frame ? "mx-8 mb-8" : ""}`} />
            <div className="min-w-0 flex-1 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">{identity}</div>
                <div className="flex shrink-0 items-center gap-2">
                  {isMe ? (
                    <>
                      {editButton("px-6 py-2.5")}
                      {customizeButton(false)}
                      <ShareProfileButton username={user.username} />
                    </>
                  ) : (
                    visitorActions(false)
                  )}
                  <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} />
                </div>
              </div>
              {bioAndMeta}
            </div>
          </div>

          {/* Mobile */}
          <div className="px-4 pb-4 md:hidden">
            <ProfileAvatar name={user.name} url={user.avatarUrl} userId={user.id} username={user.username} isMe={isMe} online={online} accent={accent} frame={frame} className={`-mt-12 h-28 w-28 ${frame ? "mb-6 ml-5" : ""}`} />
            <div className="mt-3">{identity}</div>
            {bioAndMeta}
            <div className="mt-4 flex items-center gap-2">
              {isMe ? (
                <>
                  {editButton("h-11 flex-1")}
                  {customizeButton(true)}
                  <ShareProfileButton username={user.username} compact />
                </>
              ) : (
                visitorActions(true)
              )}
              <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} compact />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 px-3 pb-3 md:gap-2.5 md:px-5 md:pb-5">
            <StatBox value={stats.followers} label="Seguidores" />
            <StatBox value={stats.following} label="Seguindo" />
            <StatBox value={stats.posts} label="Publicações" />
            <StatBox value={stats.communities} label="Comunidades" />
          </div>
        </section>

        {/* Nível + Diamantes + Premium no topo do mobile (como a referência). */}
        <div className="md:hidden">
          <ProfileStatus
            level={level}
            coins={coins ?? null}
            isPremium={!!user.isPremium}
            isMe={isMe}
            stats={{ posts: stats.posts, followers: stats.followers, friends: stats.friends, communities: stats.communities }}
          />
        </div>

        {friendRequestsCard}
        {onboarding}

        <ProfileTabs
          accent={accent}
          aside={aside}
          slots={{
            posts: (
              <div className="space-y-3 md:space-y-4">
                {isMe && current && (
                  <PostComposer
                    userId={current.authId}
                    name={current.profile.name}
                    avatarUrl={current.profile.avatarUrl}
                    variant="profile"
                  />
                )}
                {feedList}
              </div>
            ),
            midia: mediaGrid,
            sobre: aboutList ? (
              <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-5">{aboutList}</div>
            ) : undefined,
            amigos: friendsList,
            familia: <ProfileFamily isMe={isMe} family={family} requests={familyRequests} />,
            comunidades: communitiesList,
            conquistas: <AchievementsGrid achievements={achievements} isMe={isMe} name={user.name} />,
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
          }}
        />

        {/* Módulos secundários empilhados só no celular (status já aparece no topo). */}
        <div className="space-y-3 md:hidden">{restAside}</div>
      </div>

      <ProfileRightRail />
    </div>
  );
}
