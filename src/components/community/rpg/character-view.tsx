"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, Loader2, Pencil, Trash2, UserRound, X } from "lucide-react";
import { communityError } from "@/lib/communities";
import { RPG_STATUS_LABEL, sanitizeRpgHtml, type RpgCharacter, type RpgConfig, type RpgField } from "@/lib/rpg";
import { useCommunity } from "../context";
import { CharacterEditor } from "./character-editor";
import { Confirm } from "../ui";

export function RpgCharacterView({ initial, config }: { initial: RpgCharacter; config: RpgConfig }) {
  const { supabase, community, toast } = useCommunity();
  const router = useRouter();
  const [character, setCharacter] = useState<RpgCharacter>(initial);
  const [fields, setFields] = useState<RpgField[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [safeHtml, setSafeHtml] = useState<string>("");

  useEffect(() => {
    supabase.rpc("rpg_fields", { p_community: community.id }).then(({ data }) => setFields((data ?? []) as RpgField[]));
  }, [supabase, community.id]);

  // Sanitiza o HTML no cliente (2ª camada) antes de renderizar.
  useEffect(() => {
    setSafeHtml(character.customHtml ? sanitizeRpgHtml(character.customHtml) : "");
  }, [character.customHtml]);

  const reload = useCallback(async () => {
    const { data } = await supabase.rpc("rpg_character_get", { p_community: community.id, p_user: character.userId });
    const ch = (Array.isArray(data) ? data[0] : null) as RpgCharacter | null;
    if (ch) setCharacter(ch);
  }, [supabase, community.id, character.userId]);

  async function moderate(approve: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("rpg_character_moderate", { p_character: character.id, p_approve: approve, p_reason: null });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    toast(approve ? "Ficha aprovada." : "Ficha recusada.");
    reload();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.rpc("rpg_character_delete", { p_character: character.id });
    setBusy(false);
    setConfirmDel(false);
    if (error) return toast(communityError(error.message), true);
    router.push(`/comunidades/${community.slug}/personagens`);
  }

  const st = RPG_STATUS_LABEL[character.status];
  const grouped = groupFields(fields.filter((f) => (character.values?.[f.id] ?? "").trim()));

  return (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/comunidades/${community.slug}/personagens`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
          ← Personagens
        </Link>
        <span className="min-w-0 flex-1" />
        {character.status !== "approved" && st && <span className={clsx("text-xs font-semibold", st.className)}>{st.label}</span>}
        {character.canManage && character.status === "pending" && (
          <>
            <button type="button" disabled={busy} onClick={() => moderate(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 text-xs font-semibold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Aprovar</button>
            <button type="button" disabled={busy} onClick={() => moderate(false)} className="flex h-9 items-center gap-1.5 rounded-full border border-red-400/40 px-3 text-xs font-semibold text-red-300 disabled:opacity-60"><X className="h-3.5 w-3.5" /> Recusar</button>
          </>
        )}
        {(character.isMine || character.canManage) && (
          <button type="button" onClick={() => setEditing(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow"><Pencil className="h-3.5 w-3.5" /> Editar ficha</button>
        )}
        {(character.isMine || character.canManage) && (
          <button type="button" onClick={() => setConfirmDel(true)} aria-label="Excluir ficha" className="flex h-9 w-9 items-center justify-center rounded-full text-red-300/80 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>

      {/* Cabeçalho da ficha */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-space-card/70">
        <div className="relative aspect-[16/5] w-full bg-space-bg">
          {character.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <span className="-mt-16 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-space-surface bg-space-card">
            {character.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-10 w-10 text-white/30" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-white">{character.name}</h1>
            {character.role && <p className="text-sm text-orbit-cyan">{character.role}</p>}
            <p className="mt-0.5 text-xs text-white/45">
              por{" "}
              <Link href={`/perfil/${character.ownerUsername}`} className="hover:underline">{character.ownerName}</Link> · {community.name}
            </p>
            {character.quote && <p className="mt-2 border-l-2 border-orbit-purple/60 pl-3 text-sm italic text-white/80">“{character.quote}”</p>}
          </div>
        </div>
      </div>

      {character.status === "rejected" && character.rejectReason && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-3 text-xs text-red-200">Recusada: {character.rejectReason}</p>
      )}

      {/* Campos da ficha */}
      {grouped.map(([section, list]) => (
        <section key={section || "geral"} className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
          {section && <h2 className="mb-3 text-sm font-semibold text-white">{section}</h2>}
          <dl className="space-y-2.5">
            {list.map((f) => (
              <div key={f.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="shrink-0 text-xs font-semibold text-white/45 sm:w-40">{f.label}</dt>
                <dd className="min-w-0 flex-1 text-sm text-white/85">
                  {f.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.values[f.id]} alt={f.label} className="max-h-64 rounded-xl object-cover" />
                  ) : f.type === "textarea" ? (
                    <span className="whitespace-pre-wrap">{character.values[f.id]}</span>
                  ) : (
                    character.values[f.id]
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* Galeria */}
      {character.gallery?.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Galeria</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {character.gallery.map((g) => (
              <a key={g} href={g} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* HTML personalizado (sanitizado) */}
      {safeHtml && (
        <section className="rounded-2xl border border-white/10 bg-space-card/70 p-4">
          <div className="rpg-html max-w-none text-sm text-white/85" dangerouslySetInnerHTML={{ __html: safeHtml }} />
        </section>
      )}

      {editing && (
        <CharacterEditor
          config={config}
          existing={character}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Ficha salva!");
            reload();
          }}
        />
      )}
      <Confirm open={confirmDel} title="Excluir ficha?" message="A ficha deste personagem será removida desta comunidade. Seu perfil principal não é afetado." confirmLabel="Excluir ficha" busy={busy} onConfirm={remove} onClose={() => setConfirmDel(false)} />
    </div>
  );
}

function groupFields(fields: RpgField[]): [string, RpgField[]][] {
  const map = new Map<string, RpgField[]>();
  for (const f of fields) {
    const k = f.section ?? "";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(f);
  }
  return Array.from(map.entries());
}
