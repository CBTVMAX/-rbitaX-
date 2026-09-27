"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, Lock } from "lucide-react";
import { accentOf } from "@/lib/communities";
import { useTimeZone } from "@/lib/use-tz";
import { useCommunity } from "./context";
import { EmptyState, OfficialBadge } from "./ui";

/** Inner community page: back to the hub, community identity, page title and an optional action. */
export function SubpageFrame({
  title,
  icon,
  action,
  wide = false,
  canSee = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  wide?: boolean;
  canSee?: boolean;
  children: React.ReactNode;
}) {
  const { community, membership } = useCommunity();
  const accent = accentOf(community.accentColor);
  return (
    <div className={clsx("mx-auto px-4 pb-16 pt-3 md:px-6 md:pt-5", wide ? "max-w-6xl lg:px-10" : "max-w-3xl")}>
      <header className="sticky top-14 z-20 -mx-4 flex items-center gap-3 border-b border-white/[0.06] bg-space-bg/85 px-4 py-2.5 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <Link
          href={`/comunidades/${community.slug}`}
          aria-label={`Voltar para ${community.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span
          className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-space-card text-base font-bold text-white sm:flex"
          style={{ boxShadow: `0 0 0 2px rgb(${accent.rgb} / 0.55)` }}
        >
          {community.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            community.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/comunidades/${community.slug}`} className="flex items-center gap-1.5 truncate text-xs text-white/50 hover:text-white/80">
            <span className="truncate">{community.name}</span> {community.isOfficial && <OfficialBadge className="hidden sm:inline-flex" />}
          </Link>
          <h1 className="flex items-center gap-2 truncate font-display text-lg font-bold text-white md:text-2xl">
            {icon && <span aria-hidden className="shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h1>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-4 md:mt-6">
        {canSee ? (
          children
        ) : (
          <EmptyState
            icon={<Lock className="h-6 w-6" />}
            title={membership?.banned ? "Você não tem acesso a esta comunidade" : "Comunidade privada"}
            text={membership?.banned ? "A moderação bloqueou sua participação." : "Somente membros aprovados veem este conteúdo. Peça para entrar na página da comunidade."}
          />
        )}
      </div>
    </div>
  );
}

/** Banner shown to a muted member instead of the create buttons. */
export function MutedNotice({ className }: { className?: string }) {
  const { membership } = useCommunity();
  const tz = useTimeZone();
  if (!membership?.muted) return null;
  const until = membership.muted.until ? new Date(membership.muted.until) : null;
  return (
    <p className={clsx("rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200", className)}>
      Você está silenciado nesta comunidade{until ? ` até ${until.toLocaleDateString("pt-BR", { timeZone: tz })} às ${until.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz })}` : ""}. Você pode ler e reagir, mas não publicar.
      {membership.muted.reason && <span className="mt-1 block text-amber-200/70">Motivo: {membership.muted.reason}</span>}
    </p>
  );
}
