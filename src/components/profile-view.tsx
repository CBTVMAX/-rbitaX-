import Link from "next/link";
import { PostCard, type FeedPost } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { ProfileTabs } from "@/components/profile-tabs";
import { FollowButton } from "@/components/follow-button";
import {
  OrbitIcon,
  ProfileImageUpload,
  ProfileMoreMenu,
  ProfileRightRail,
  ShareProfileButton,
} from "@/components/profile-client";
import { presenceOf } from "@/lib/presence";
import { relationshipLabel } from "@/lib/profile-options";
import { PresenceStatus } from "@/components/presence-picker";
import {
  BadgeCheck,
  Cake,
  Camera,
  Check,
  ChevronRight,
  Crown,
  Gem,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  MessageCircle,
  Music2,
  PenLine,
  Play,
  Plus,
  Shield,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

export type ProfileInfo = {
  birthDate: string | null;
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

function ageFrom(birthDate: string) {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
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
  className,
}: {
  name: string;
  url: string | null;
  userId: string;
  isMe: boolean;
  online: boolean;
  className: string;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="h-full w-full rounded-full bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] p-[4px] shadow-[0_0_32px_rgba(139,92,246,0.45)]">
        <div className="flex h-full w-full items-end justify-center overflow-hidden rounded-full border-4 border-space-bg bg-space-card">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
          )}
        </div>
      </div>
      {online && (
        <span className="absolute right-[9%] top-[58%] h-3.5 w-3.5 rounded-full border-2 border-space-bg bg-emerald-400" />
      )}
      {isMe && (
        <ProfileImageUpload
          userId={userId}
          field="avatarUrl"
          ariaLabel="Alterar foto"
          className="absolute bottom-[3%] right-[3%] flex h-10 w-10 items-center justify-center rounded-full border-2 border-orbit-purple bg-space-bg/90 text-white shadow-glow transition hover:bg-space-card md:h-12 md:w-12"
        >
          <Camera className="h-5 w-5" />
        </ProfileImageUpload>
      )}
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
  };
  info: ProfileInfo | null | undefined;
  current: { authId: string; profile: { name: string; avatarUrl: string | null } } | null;
  isFollowing: boolean;
  stats: { posts: number; friends: number; followers: number; following: number; communities: number };
  feed: FeedPost[];
  pinnedPostId: string | null;
  communities: ProfileCommunity[];
};

export type ProfileCommunity = { id: string; name: string; slug: string; avatarUrl: string | null; role: string };

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

export function ProfileView({ user, info, current, isFollowing, stats, feed, pinnedPostId, communities }: ProfileViewProps) {
  const isMe = current?.authId === user.id;

  const presence = presenceOf(user.presence);
  const online = presence === "online";

  const age = info?.birthDate && (isMe || info.showAge) ? ageFrom(info.birthDate) : null;
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
        {user.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-orbit-blue" />}
      </div>
      <p className="mt-0.5 text-sm text-white/70">
        @{user.username}
        {user.orbitId && <span className="text-white/60"> &nbsp;·&nbsp; Orbit ID #{user.orbitId}</span>}
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
            <span key={i} className="rounded-lg border border-orbit-purple/50 bg-orbit-purple/10 px-3 py-1 text-xs text-white/85">
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
      className={`flex items-center justify-center rounded-xl bg-orbit-gradient text-sm font-semibold text-white shadow-glow transition hover:opacity-90 ${extra}`}
    >
      Editar perfil
    </Link>
  );

  const visitorActions = current && (
    <>
      <FollowButton targetUserId={user.id} initiallyFollowing={isFollowing} />
      <Link
        href="/mensagens"
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
      >
        <MessageCircle className="h-4 w-4" /> Mensagem
      </Link>
    </>
  );

  const emptyFeed = isMe ? (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80 px-6 py-12 text-center md:py-16">
      <span className="pointer-events-none absolute left-[22%] top-1/3 text-orbit-blue/50">✦</span>
      <span className="pointer-events-none absolute right-[24%] top-1/2 text-orbit-purple/50">✦</span>
      <OrbitIcon className="mx-auto mb-5 h-16 w-24 drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]" />
      <h3 className="font-display text-lg font-semibold text-white md:text-xl">Seu universo está esperando.</h3>
      <p className="mt-2 text-sm text-white/65">Comece compartilhando sua primeira publicação.</p>
      <a
        href="#composer"
        className="mt-6 inline-block rounded-full bg-orbit-gradient px-12 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 md:px-14"
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
                    done ? "bg-emerald-500/15 text-emerald-400" : "bg-orbit-gradient text-white"
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

  const aside = (
    <>
      {isMe && (
        <SideCard title="Seu tema atual">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-orbit-purple/40 bg-gradient-to-br from-orbit-blue/25 to-orbit-purple/25">
              <Gem className="h-6 w-6 text-orbit-cyan" />
            </span>
            <div>
              <p className="text-sm font-medium text-white">Padrão Órbita X</p>
              <p className="text-xs text-white/50">Tema escuro</p>
            </div>
          </div>
          <button type="button" disabled title="Em breve" className={soonButton}>
            Alterar tema
          </button>
        </SideCard>
      )}
      {isMe && (
        <SideCard title="Moldura do avatar">
          <div title="Em breve" className="flex cursor-default items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
            <span className="h-11 w-11 shrink-0 rounded-full border-2 border-orbit-blue/70 shadow-[0_0_14px_rgba(43,108,255,0.45)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Nenhuma moldura</p>
              <p className="text-xs text-white/50">Adicione uma moldura ao seu avatar</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </div>
        </SideCard>
      )}
      <SideCard title="Conquistas">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 -space-x-2">
            <span className="h-10 w-9 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)] bg-white/10" />
            <span className="h-10 w-9 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)] bg-white/5" />
          </div>
          <div>
            <p className="text-sm text-white/80">Ainda não há conquistas</p>
            {isMe && <p className="text-xs text-white/50">Explore a plataforma e conquiste seus emblemas!</p>}
          </div>
        </div>
      </SideCard>
      {isMe && (
        <SideCard title="Música do perfil">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10">
              <Music2 className="h-5 w-5 text-white/60" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/80">Nenhuma música adicionada</p>
              <p className="text-xs text-white/50">Adicione uma música ao seu perfil</p>
            </div>
            <span title="Em breve" className="flex h-8 w-8 items-center justify-center rounded-full border border-orbit-purple/50 text-white/60">
              <Play className="h-3.5 w-3.5" />
            </span>
          </div>
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

  const communitiesList = communities.length ? (
    <div className="space-y-2">
      {communities.map((c) => {
        const role = ROLE_LABEL[c.role] ?? ROLE_LABEL.member;
        const RoleIcon = role.icon;
        return (
          <Link
            key={c.id}
            href={`/comunidades/${c.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-surface/80 p-3 transition hover:border-orbit-purple/50"
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
              <p className={`flex items-center gap-1 text-xs ${role.className}`}>
                <RoleIcon className="h-3.5 w-3.5" /> {role.label}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        );
      })}
    </div>
  ) : undefined;

  const photos = feed.flatMap((p) => p.media.filter((m) => m.type === "image"));
  const videos = feed.flatMap((p) => p.media.filter((m) => m.type === "video"));

  return (
    <div className="mx-auto flex max-w-[1240px] gap-5 px-3 pt-3 md:px-5 md:py-5">
      <div className="min-w-0 flex-1 space-y-3 md:space-y-4">
        <section className="rounded-2xl border border-white/10 bg-space-surface/80">
          <div className="relative h-60 overflow-hidden rounded-t-2xl md:h-56">
            {user.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : isMe ? (
              <div className="flex h-full flex-col items-center justify-start border-b border-dashed border-white/15 bg-gradient-to-br from-orbit-blue/10 via-space-card to-orbit-purple/10 px-6 pt-6 text-center md:justify-center md:pb-4 md:pt-0">
                <ImagePlus className="mb-3 h-9 w-9 text-orbit-blue/80" />
                <p className="text-sm font-semibold text-white">Adicione uma capa</p>
                <p className="mt-1 max-w-xs text-xs text-white/55 md:max-w-none">
                  A capa é totalmente livre e pode ser qualquer imagem que você quiser.
                </p>
              </div>
            ) : (
              <div className="h-full bg-gradient-to-br from-orbit-blue/25 via-space-card to-orbit-purple/25" />
            )}
            {isMe && (
              <ProfileImageUpload
                userId={user.id}
                field="coverUrl"
                ariaLabel="Editar capa"
                className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-white/15 bg-space-bg/80 px-3.5 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-space-bg md:bottom-auto md:right-4 md:top-4 md:text-sm"
              >
                <Camera className="h-4 w-4" /> Editar capa
              </ProfileImageUpload>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden gap-6 px-6 pb-5 md:flex">
            <ProfileAvatar name={user.name} url={user.avatarUrl} userId={user.id} isMe={isMe} online={online} className="-mt-24 h-44 w-44" />
            <div className="min-w-0 flex-1 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">{identity}</div>
                <div className="flex shrink-0 items-center gap-2">
                  {isMe ? (
                    <>
                      {editButton("px-6 py-2.5")}
                      <ShareProfileButton username={user.username} />
                    </>
                  ) : (
                    visitorActions
                  )}
                  <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} />
                </div>
              </div>
              {bioAndMeta}
            </div>
          </div>

          {/* Mobile */}
          <div className="px-4 pb-4 md:hidden">
            <ProfileAvatar name={user.name} url={user.avatarUrl} userId={user.id} isMe={isMe} online={online} className="-mt-20 h-36 w-36" />
            <div className="mt-3">{identity}</div>
            {bioAndMeta}
            <div className="mt-4 flex items-center gap-2">
              {isMe ? (
                <>
                  {editButton("h-11 flex-1")}
                  <ShareProfileButton username={user.username} compact />
                </>
              ) : (
                visitorActions
              )}
              <ProfileMoreMenu username={user.username} userId={user.id} isMe={isMe} compact />
            </div>
          </div>

          <div className="hidden grid-cols-5 gap-2.5 px-5 pb-5 md:grid">
            <StatBox value={stats.posts} label="Publicações" />
            <StatBox value={stats.friends} label="Amigos" />
            <StatBox value={stats.followers} label="Seguidores" />
            <StatBox value={stats.following} label="Seguindo" />
            <StatBox value={stats.communities} label="Comunidades" />
          </div>
          <div className="grid grid-cols-4 gap-1.5 px-3 pb-3 md:hidden">
            <StatBox value={stats.posts} label="Posts" />
            <StatBox value={stats.followers} label="Seguidores" />
            <StatBox value={stats.following} label="Seguindo" />
            <StatBox value={stats.communities} label="Comunidades" />
          </div>
        </section>

        {onboarding}

        <ProfileTabs
          aside={aside}
          slots={{
            inicio: (
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
            posts: feed.length ? feedList : undefined,
            fotos: photos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            ) : undefined,
            videos: videos.length ? (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((m) => (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video key={m.id} src={m.url} controls className="aspect-video w-full rounded-xl bg-black object-cover" />
                ))}
              </div>
            ) : undefined,
            sobre: aboutList ? (
              <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-5">{aboutList}</div>
            ) : undefined,
            comunidades: communitiesList,
          }}
        />
      </div>

      <ProfileRightRail />
    </div>
  );
}
