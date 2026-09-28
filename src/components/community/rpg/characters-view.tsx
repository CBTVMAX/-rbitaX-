"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Loader2, Plus, UserRound } from "lucide-react";
import { RPG_STATUS_LABEL, type RpgCharacter, type RpgCharacterListItem, type RpgConfig } from "@/lib/rpg";
import { useCommunity } from "../context";
import { CharacterEditor } from "./character-editor";
import { EmptyState } from "../ui";

export function RpgCharactersView({ canSee }: { canSee: boolean }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const [config, setConfig] = useState<RpgConfig | null>(null);
  const [chars, setChars] = useState<RpgCharacterListItem[] | null>(null);
  const [editing, setEditing] = useState<RpgCharacter | null | false>(false);
  const [loadingMine, setLoadingMine] = useState(false);

  const load = useCallback(async () => {
    const [{ data: cfg }, { data: list }] = await Promise.all([
      supabase.rpc("rpg_config", { p_community: community.id }),
      supabase.rpc("rpg_characters", { p_community: community.id, p_limit: 60, p_offset: 0 }),
    ]);
    setConfig((Array.isArray(cfg) ? cfg[0] : null) as RpgConfig | null);
    setChars((list ?? []) as RpgCharacterListItem[]);
  }, [supabase, community.id]);

  useEffect(() => {
    if (canSee) load();
  }, [canSee, load]);

  async function openMine() {
    if (!config) return;
    if (!config.myCharacterId) return setEditing(null);
    setLoadingMine(true);
    const { data } = await supabase.rpc("rpg_character_get", { p_community: community.id, p_user: viewer?.id ?? "" });
    setLoadingMine(false);
    const ch = (Array.isArray(data) ? data[0] : null) as RpgCharacter | null;
    setEditing(ch);
  }

  if (!canSee) return null;
  if (!config || !chars) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  }

  return (
    <div className="space-y-4">
      {config.intro && <p className="rounded-2xl border border-white/10 bg-space-card/60 p-4 text-sm text-white/70">{config.intro}</p>}

      {config.canCreate && (
        <button
          type="button"
          onClick={openMine}
          disabled={loadingMine}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {loadingMine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {config.myCharacterId ? "Editar meu personagem" : "Criar meu personagem"}
        </button>
      )}

      {chars.length === 0 ? (
        <EmptyState icon={<UserRound className="h-6 w-6" />} title="Nenhum personagem ainda" text="Seja o primeiro a criar uma ficha neste RPG." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {chars.map((c) => {
            const st = RPG_STATUS_LABEL[c.status];
            return (
              <Link
                key={c.id}
                href={`/comunidades/${community.slug}/personagens/${c.ownerUsername}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-space-card/70 transition hover:border-orbit-purple/50"
              >
                <span className="block aspect-[3/4] w-full overflow-hidden bg-space-bg">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center"><UserRound className="h-10 w-10 text-white/20" /></span>
                  )}
                </span>
                <span className="block p-2.5">
                  <span className="block truncate text-sm font-semibold text-white">{c.name}</span>
                  {c.role && <span className="block truncate text-[11px] text-white/50">{c.role}</span>}
                  {c.status !== "approved" && st && <span className={clsx("mt-0.5 block text-[10px] font-semibold", st.className)}>{st.label}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {editing !== false && config && (
        <CharacterEditor
          config={config}
          existing={editing}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast(config.requireApproval && !config.canManage ? "Ficha enviada para aprovação." : "Ficha salva!");
            load();
          }}
        />
      )}
    </div>
  );
}
