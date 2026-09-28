"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Drama } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RPG_STATUS_LABEL } from "@/lib/rpg";

type MyRpg = {
  communityId: string;
  communityName: string;
  communitySlug: string;
  communityAvatar: string | null;
  id: string;
  name: string;
  role: string | null;
  status: string;
  avatarUrl: string | null;
};

/** "Meus RPGs": personagens do usuário atual em cada comunidade de RPG. */
export function MyRpgsCard({ username }: { username: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<MyRpg[] | null>(null);

  useEffect(() => {
    supabase.rpc("my_rpg_characters").then(({ data }) => setRows((data ?? []) as MyRpg[]));
  }, [supabase]);

  if (!rows || rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Drama className="h-4 w-4 text-orbit-cyan" /> Meus RPGs
      </h2>
      <div className="space-y-2">
        {rows.map((r) => {
          const st = RPG_STATUS_LABEL[r.status];
          return (
            <Link
              key={r.id}
              href={`/comunidades/${r.communitySlug}/personagens/${username}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 p-2.5 transition hover:border-orbit-purple/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-space-card">
                {r.communityAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.communityAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Drama className="h-5 w-5 text-white/40" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{r.communityName}</span>
                <span className="block truncate text-[11px] text-white/50">
                  {r.name}
                  {r.role ? ` · ${r.role}` : ""}
                </span>
              </span>
              {r.status !== "approved" && st && <span className={clsx("shrink-0 text-[10px] font-semibold", st.className)}>{st.label}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
