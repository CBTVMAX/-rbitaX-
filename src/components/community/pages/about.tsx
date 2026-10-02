"use client";

import Link from "next/link";
import { BadgeCheck, CalendarDays, FileText, Globe, Hash, Link2, Lock, MessagesSquare, ScrollText, Shield, Tag, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { CommunityJoinButton } from "@/components/community-join-button";
import { categoryLabel } from "@/lib/community-categories";
import { compactNumber, rank, ROLE_DESC, ROLE_LABEL, type Role } from "@/lib/communities";
import { useCommunity } from "../context";
import { useTimeZone } from "@/lib/use-tz";
import { SubpageFrame } from "../subpage";
import { RoleBadge } from "../ui";

const PLURAL: Record<Role, string> = { owner: "Proprietários", admin: "Administradores", moderator: "Moderadores", editor: "Editores", member: "Membros" };

export type StaffMember = { role: Role; user: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean } };

export function AboutView({ staff, stats }: { staff: StaffMember[]; stats: { posts: number; discussions: number; events: number } | null }) {
  const { community, viewer, role, setRole, membership } = useCommunity();
  const tz = useTimeZone();
  const created = new Date(community.createdAt);
  const rules = (community.rules ?? "")
    .split(/\n+/)
    .map((r) => r.replace(/^\s*(\d+[.)-]|[-•*])\s*/, "").trim())
    .filter(Boolean);
  const groups: Role[] = ["owner", "admin", "moderator", "editor"];

  const info: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }[] = [
    { icon: Hash, label: "Endereço", value: `@${community.username}` },
    { icon: community.isPrivate ? Lock : Globe, label: "Privacidade", value: community.isPrivate ? "Privada: só membros aprovados veem o conteúdo" : "Pública: qualquer pessoa vê e participa" },
    { icon: Tag, label: "Categoria", value: community.category ? categoryLabel(community.category) : "Sem categoria" },
    { icon: CalendarDays, label: "Criada em", value: created.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: tz }) },
    { icon: Users, label: "Membros", value: `${compactNumber(community.memberCount)} ${community.memberCount === 1 ? "membro" : "membros"}` },
  ];
  if (community.isOfficial) info.push({ icon: BadgeCheck, label: "Selo", value: "Comunidade oficial do Órbita X" });

  return (
    <SubpageFrame title="Sobre" icon="🪐">
      <div className="space-y-4">
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/80 p-4 md:p-6">
          <h2 className="font-display text-lg font-bold text-white">{community.name}</h2>
          {community.description ? (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-white/75">{community.description}</p>
          ) : (
            <p className="mt-2 text-sm text-white/45">Esta comunidade ainda não tem descrição.</p>
          )}
          {viewer && (
            <div className="mt-4 flex flex-wrap gap-2">
              <CommunityJoinButton
                communityId={community.id}
                initiallyMember={!!membership?.role}
                isPrivate={community.isPrivate}
                role={role}
                request={membership?.request ?? null}
                banned={membership?.banned ?? false}
                notify={membership?.notify ?? true}
                size="lg"
                onChange={(s) => setRole?.(s === "member" ? role ?? "member" : null)}
              />
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80">
          <h2 className="px-4 pt-4 text-sm font-semibold text-white md:px-6">Informações</h2>
          <dl className="mt-2 divide-y divide-white/[0.05]">
            {info.map((i) => {
              const Icon = i.icon;
              return (
                <div key={i.label} className="flex items-start gap-3 px-4 py-3 md:px-6">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-orbit-cyan" />
                  <dt className="w-28 shrink-0 text-sm text-white/50">{i.label}</dt>
                  <dd className="min-w-0 flex-1 text-sm text-white/85">{i.value}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        {stats && (
          <section className="grid grid-cols-3 gap-2">
            {[
              { icon: ScrollText, label: "publicações", n: stats.posts, href: `/comunidades/${community.slug}` },
              { icon: MessagesSquare, label: "discussões", n: stats.discussions, href: `/comunidades/${community.slug}/discussoes` },
              { icon: CalendarDays, label: "eventos", n: stats.events, href: `/comunidades/${community.slug}/eventos` },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.label} href={s.href} className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-3 text-center transition hover:border-orbit-purple/40">
                  <Icon className="mx-auto h-5 w-5 text-orbit-purple" />
                  <span className="mt-1 block font-display text-xl font-bold text-white">{compactNumber(s.n)}</span>
                  <span className="block text-[11px] text-white/50">{s.label}</span>
                </Link>
              );
            })}
          </section>
        )}

        <section className="rounded-3xl border border-white/[0.08] bg-space-card/80 p-4 md:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-orbit-cyan" /> Regras
          </h2>
          {rules.length ? (
            <ol className="mt-3 space-y-2">
              {rules.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/80">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orbit-purple/15 text-xs font-bold text-orbit-purple">{i + 1}</span>
                  <span className="pt-0.5">{r}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-white/45">Siga as diretrizes do Órbita X: respeito, sem spam e sem conteúdo proibido.</p>
          )}
        </section>

        {community.links.length > 0 && (
          <section className="rounded-3xl border border-white/[0.08] bg-space-card/80 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-white">Links</h2>
            <ul className="mt-2 space-y-1">
              {community.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-[44px] items-center gap-2.5 rounded-2xl px-2 text-sm text-white/85 hover:bg-white/[0.04]">
                    <Link2 className="h-4 w-4 shrink-0 text-orbit-cyan" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.label}</span>
                      <span className="block truncate text-xs text-white/40">{l.url.replace(/^https?:\/\//, "")}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl border border-white/[0.08] bg-space-card/80 p-4 md:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Shield className="h-4 w-4 text-orbit-purple" /> Equipe
          </h2>
          <div className="mt-3 space-y-4">
            {groups.map((g) => {
              const list = staff.filter((s) => s.role === g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {list.length > 1 ? PLURAL[g] : ROLE_LABEL[g]} · <span className="normal-case tracking-normal">{ROLE_DESC[g]}</span>
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {list.map((s) => (
                      <Link key={s.user.id} href={`/perfil/${s.user.username}`} className="flex min-h-[46px] items-center gap-3 rounded-2xl px-1 hover:bg-white/[0.03]">
                        <Avatar name={s.user.name} url={s.user.avatarUrl} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                            {s.user.name} {s.user.isVerified && <VerifiedBadge />}
                          </span>
                          <span className="block truncate text-xs text-white/45">@{s.user.username}</span>
                        </span>
                        <RoleBadge role={s.role} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
            {!staff.length && <p className="text-sm text-white/45">A equipe desta comunidade não está visível.</p>}
          </div>
          {rank(role) >= 1 && (
            <p className="mt-4 rounded-2xl bg-white/[0.03] p-3 text-xs text-white/55">
              Precisa falar com a equipe? Use <strong className="text-white/80">⋯ → Escrever para a comunidade</strong> na página principal.
            </p>
          )}
        </section>
      </div>
    </SubpageFrame>
  );
}
