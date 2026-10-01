"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Crown, Eye, EyeOff, Loader2, Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type SettingsCommunity = { id: string; name: string; slug: string; avatarUrl: string | null; role: string };

const STAFF = new Set(["owner", "admin", "moderator"]);

export function ProfileCommunitiesSettings({
  userId,
  username,
  communities,
  initialHidden,
}: {
  userId: string;
  username: string;
  communities: SettingsCommunity[];
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: Set<string>) {
    const prev = hidden;
    setHidden(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error: err } = await createClient()
      .from("User")
      .update({ hiddenProfileCommunities: Array.from(next) })
      .eq("id", userId);
    setSaving(false);
    if (err) {
      setHidden(prev);
      setError("Não foi possível salvar. Tente novamente.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  function toggle(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }

  if (communities.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-8 text-center text-sm text-white/55">
        Você ainda não participa de nenhuma comunidade.{" "}
        <Link href="/comunidades" className="text-orbit-cyan hover:underline">
          Explorar comunidades
        </Link>
      </div>
    );
  }

  const groups = [
    { title: "Que você administra", items: communities.filter((c) => STAFF.has(c.role)) },
    { title: "Das quais você participa", items: communities.filter((c) => !STAFF.has(c.role)) },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 px-1 text-xs text-white/50">
        <span>
          {communities.length - hidden.size} de {communities.length} visíveis no perfil
        </span>
        <span className="flex items-center gap-1.5">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando
            </>
          ) : saved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Salvo
            </>
          ) : null}
        </span>
      </div>
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">{g.title}</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
            {g.items.map((c, i) => {
              const visible = !hidden.has(c.id);
              const RoleIcon = c.role === "owner" ? Crown : STAFF.has(c.role) ? Shield : Users;
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-white/10" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-space-card">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <RoleIcon className="h-4 w-4 text-white/40" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{c.name}</span>
                    <span className="block text-xs text-white/45">{visible ? "Aparece no seu perfil" : "Oculta no perfil"}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={`${visible ? "Ocultar" : "Mostrar"} ${c.name} no perfil`}
                    onClick={() => toggle(c.id)}
                    disabled={saving}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                      visible
                        ? "border-orbit-cyan/40 bg-orbit-cyan/10 text-orbit-cyan"
                        : "border-white/15 text-white/55 hover:text-white"
                    }`}
                  >
                    {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {visible ? "Visível" : "Oculta"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="px-1 text-xs text-white/45">
        Ocultar não tira você da comunidade: ela só deixa de aparecer para quem visita{" "}
        <Link href={`/perfil/${username}#tab-comunidades`} className="text-orbit-cyan hover:underline">
          seu perfil
        </Link>
        .
      </p>
    </div>
  );
}
