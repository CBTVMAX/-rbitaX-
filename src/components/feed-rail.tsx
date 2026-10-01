import Link from "next/link";
import { Cake, Link2, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { FollowButton } from "@/components/follow-button";
import { CommunityJoinButton } from "@/components/community-join-button";
import { ProfileMoreMenu, OrbitIcon } from "@/components/profile-client";

export type RailCommunity = { id: string; name: string; slug: string; avatarUrl: string | null; memberCount: number; isPrivate: boolean };
export type RailPerson = { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean; mutual: number };

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function Card({ title, href, children }: { title?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="ox-card overflow-hidden rounded-2xl border border-white/10 bg-space-surface">
      {title && (
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          {href && (
            <Link href={href} className="text-xs font-medium text-orbit-blue hover:underline">
              Ver todas
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function Face({ url, name, size }: { url: string | null; name: string; size: number }) {
  return (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card text-sm font-semibold text-white/60">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

/** Coluna direita do feed (computador): seu perfil, comunidades e pessoas sugeridas. */
export function FeedRail({
  me,
  stats,
  communities,
  people,
}: {
  me: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    bio: string | null;
    isVerified: boolean;
    age: number | null;
    location: string | null;
    website: string | null;
  };
  stats: { friends: number; followers: number; communities: number };
  communities: RailCommunity[];
  people: RailPerson[];
}) {
  return (
    <>
      <Card>
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-gradient-to-br from-[#1b2a6b] via-[#0b0e1c] to-[#3b1d5e]">
          {me.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end gap-3">
            <Link href={`/perfil/${me.username}`} className="relative z-10 -mt-9 shrink-0 rounded-full bg-orbit-gradient p-[3px] shadow-glow">
              <span className="block rounded-full border-[3px] border-space-surface">
                <Face url={me.avatarUrl} name={me.name} size={76} />
              </span>
            </Link>
            <div className="min-w-0 pb-1">
              <Link href={`/perfil/${me.username}`} className="flex items-center gap-1.5 text-[15px] font-semibold text-white hover:underline">
                <span className="truncate">{me.name}</span>
                {me.isVerified && <VerifiedBadge />}
              </Link>
              <p className="truncate text-xs text-white/50">@{me.username}</p>
            </div>
          </div>
          {me.bio && <p className="mt-3 line-clamp-2 whitespace-pre-line text-[13px] text-white/75">{me.bio}</p>}
          {(me.age !== null || me.location || me.website) && (
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
              {me.age !== null && (
                <span className="flex items-center gap-1">
                  <Cake className="h-3.5 w-3.5" /> {me.age} anos
                </span>
              )}
              {me.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {me.location}
                </span>
              )}
              {me.website && (
                <span className="flex min-w-0 items-center gap-1 text-orbit-blue">
                  <Link2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{me.website.replace(/^https?:\/\//i, "")}</span>
                </span>
              )}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 text-center">
            {[
              [stats.friends, "Amigos"],
              [stats.followers, "Seguidores"],
              [stats.communities, "Comunidades"],
            ].map(([v, l]) => (
              <div key={l as string}>
                <p className="text-lg font-bold text-white">{compact.format(v as number)}</p>
                <p className="text-[11px] text-white/50">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/configuracoes/conta" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-sm font-semibold text-white transition hover:bg-white/[0.08]">
              Editar perfil
            </Link>
            <ProfileMoreMenu username={me.username} userId={me.id} isMe />
          </div>
        </div>
      </Card>

      {communities.length > 0 && (
        <Card title="Comunidades para você" href="/comunidades">
          <ul className="space-y-1 px-2 pb-3 pt-1">
            {communities.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <Link href={`/comunidades/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <OrbitIcon className="h-5 w-7" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-white">{c.name}</span>
                    <span className="block text-[11px] text-white/45">
                      {compact.format(c.memberCount)} {c.memberCount === 1 ? "membro" : "membros"}
                    </span>
                  </span>
                </Link>
                <CommunityJoinButton communityId={c.id} initiallyMember={false} isPrivate={c.isPrivate} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {people.length > 0 && (
        <Card title="Pessoas que você talvez conheça" href="/amigos">
          <ul className="space-y-1 px-2 pb-3 pt-1">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <Link href={`/perfil/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Face url={p.avatarUrl} name={p.name} size={40} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-[13px] font-medium text-white">
                      <span className="truncate">{p.name}</span>
                      {p.isVerified && <VerifiedBadge />}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {p.mutual > 0 ? `${p.mutual} ${p.mutual === 1 ? "amigo" : "amigos"} em comum` : `@${p.username}`}
                    </span>
                  </span>
                </Link>
                <FollowButton targetUserId={p.id} currentUserId={me.id} className="shrink-0 px-4 py-1.5 text-xs shadow-none" />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
