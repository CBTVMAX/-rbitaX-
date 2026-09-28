import { clsx } from "clsx";
import { Award, BadgeCheck, Calendar, Compass, Crown, Heart, Lock, PenLine, Rocket, TrendingUp, User as UserIcon, UserCheck, Users, UsersRound, Zap } from "lucide-react";
import type { Achievement } from "@/lib/achievements";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-check": UserCheck,
  rocket: Rocket,
  pen: PenLine,
  compass: Compass,
  "users-round": UsersRound,
  users: Users,
  heart: Heart,
  "trending-up": TrendingUp,
  zap: Zap,
  award: Award,
  calendar: Calendar,
  "badge-check": BadgeCheck,
  crown: Crown,
};

function Medal({ ach, size = "md" }: { ach: Achievement; size?: "sm" | "md" }) {
  const Icon = ICONS[ach.icon] ?? UserIcon;
  const dim = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]",
        dim
      )}
      style={ach.earned ? { background: `linear-gradient(160deg, ${ach.color}, ${ach.color}55)`, boxShadow: `0 0 14px ${ach.color}55` } : { background: "rgba(255,255,255,0.06)" }}
    >
      <Icon className={clsx(size === "sm" ? "h-4 w-4" : "h-5 w-5", ach.earned ? "text-white" : "text-white/30")} />
    </span>
  );
}

/** Card compacto para a coluna lateral. */
export function AchievementsCard({ achievements, isMe, name }: { achievements: Achievement[]; isMe: boolean; name: string }) {
  const earned = achievements.filter((a) => a.earned);
  return (
    <div>
      <p className="mb-3 text-xs text-white/55">
        {earned.length} de {achievements.length} conquistas
      </p>
      {earned.length === 0 ? (
        <p className="text-sm text-white/70">
          {isMe ? "Explore a plataforma e conquiste seus emblemas!" : `${name} ainda não conquistou emblemas.`}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {earned.slice(0, 8).map((a) => (
            <span key={a.id} title={`${a.name} — ${a.desc}`}>
              <Medal ach={a} size="sm" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grade completa (aba Conquistas): conquistadas e bloqueadas com o critério. */
export function AchievementsGrid({ achievements, isMe, name }: { achievements: Achievement[]; isMe: boolean; name: string }) {
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);
  const Row = ({ list, muted }: { list: Achievement[]; muted?: boolean }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((a) => (
        <div key={a.id} className={clsx("flex items-center gap-3 rounded-2xl border p-3", muted ? "border-white/[0.06] bg-space-surface/40" : "border-white/10 bg-space-surface/80")}>
          <Medal ach={a} />
          <div className="min-w-0 flex-1">
            <p className={clsx("truncate text-sm font-semibold", muted ? "text-white/60" : "text-white")}>{a.name}</p>
            <p className="truncate text-[11px] text-white/45">{a.earned ? a.desc : a.hint ?? a.desc}</p>
          </div>
          {muted && <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" />}
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-space-surface/60 p-4 text-center">
        <p className="text-2xl font-bold text-white">
          {earned.length}
          <span className="text-white/40">/{achievements.length}</span>
        </p>
        <p className="text-xs text-white/50">
          {isMe ? "conquistas desbloqueadas" : `conquistas de ${name}`}
        </p>
      </div>
      {earned.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">Conquistadas</h3>
          <Row list={earned} />
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/70">A conquistar</h3>
          <Row list={locked} muted />
        </div>
      )}
    </div>
  );
}
