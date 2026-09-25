import Link from "next/link";
import { BadgeCheck, Lock, Users } from "lucide-react";
import { Avatar } from "@/components/post-card";

export type PersonResult = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  isFollowing: boolean;
};

/** People found by the global search (search_profiles), in the Explorar card style. */
export function PeopleResults({ query, people, signedIn }: { query: string; people: PersonResult[]; signedIn: boolean }) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span>🔎</span> Pessoas
          </h2>
          <p className="text-xs text-white/40">
            {signedIn
              ? people.length
                ? `${people.length}${people.length === 30 ? "+" : ""} ${people.length === 1 ? "resultado" : "resultados"} para “${query}”`
                : `Nenhum resultado para “${query}”`
              : `Resultados para “${query}”`}
          </p>
        </div>
      </div>

      {!signedIn ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-space-card p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-orbit-cyan">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Entre para encontrar pessoas</p>
              <p className="text-xs text-white/50">A busca de perfis é exclusiva para quem faz parte do ÓrbitaX.</p>
            </div>
          </div>
          <Link href="/entrar" className="rounded-full bg-orbit-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow">
            Entrar
          </Link>
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
          Não encontramos ninguém com esse nome ou @. Confira a grafia e tente novamente.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/perfil/${p.username}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-card p-4 transition hover:border-white/20"
            >
              <Avatar name={p.name} url={p.avatarUrl} size={48} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <span className="truncate">{p.name}</span>
                  {p.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
                  {p.isPrivate && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                </p>
                <p className="truncate text-xs text-white/40">@{p.username}</p>
                {p.bio && <p className="mt-1 line-clamp-1 text-xs text-white/60">{p.bio}</p>}
              </div>
              {p.isFollowing && (
                <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/60">Seguindo</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
