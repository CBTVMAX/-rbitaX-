"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, Clock, Loader2, Search, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import { normalize } from "@/lib/music";

export type PartnerChoice = { id: string; name: string; username: string; avatarUrl: string | null; status?: "accepted" | "pending" | "new" };
type Friend = { id: string; name: string; username: string; avatarUrl: string | null };

function Face({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white/70" style={{ width: size, height: size }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Campo "Parceiro" do relacionamento: escolhido entre os amigos, como no VK. A pessoa confirma o vínculo. */
export function PartnerPicker({ userId, value, onChange }: { userId: string; value: PartnerChoice | null; onChange: (p: PartnerChoice | null) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || friends) return;
    (async () => {
      const { data: links } = await supabase
        .from("Friendship")
        .select("requesterId, addresseeId")
        .eq("status", "accepted")
        .or(`requesterId.eq.${userId},addresseeId.eq.${userId}`)
        .limit(1000);
      const ids = (links ?? []).map((l) => (l.requesterId === userId ? l.addresseeId : l.requesterId));
      if (!ids.length) return setFriends([]);
      const { data: users } = await supabase.from("User").select("id, name, username, avatarUrl").in("id", ids.slice(0, 1000));
      setFriends(((users ?? []) as Friend[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    })();
  }, [open, friends, supabase, userId]);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    return (friends ?? []).filter((f) => !q || normalize(`${f.name} ${f.username}`).includes(q));
  }, [friends, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-left transition hover:border-orbit-purple/50"
      >
        {value ? (
          <>
            <Face url={value.avatarUrl} name={value.name} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{value.name}</span>
              {value.status !== "accepted" && (
                <span className="flex items-center gap-1 text-[11px] text-amber-300/90">
                  <Clock className="h-3 w-3" /> {value.status === "pending" ? "Aguardando confirmação" : "Será enviado um pedido ao salvar"}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-white/40">Escolher parceiro</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Escolher parceiro">
        <div className="space-y-3 pb-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca"
              className="w-full rounded-xl border border-white/10 bg-space-bg/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-orbit-purple/70"
            />
          </label>
          <div className="max-h-[60vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => (onChange(null), setOpen(false))}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-orbit-blue">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="flex-1 text-sm font-medium text-orbit-blue">Nenhum selecionado</span>
              {!value && <Check className="h-4 w-4 text-orbit-cyan" />}
            </button>
            {friends === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : list.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-white/45">{friends.length ? "Ninguém encontrado." : "Você ainda não tem amigos no Órbita X."}</p>
            ) : (
              list.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => (onChange({ ...f, status: value?.id === f.id ? value.status : "new" }), setOpen(false))}
                  className={clsx("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]", value?.id === f.id && "bg-white/[0.04]")}
                >
                  <Face url={f.avatarUrl} name={f.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{f.name}</span>
                    <span className="block truncate text-xs text-white/45">@{f.username}</span>
                  </span>
                  {value?.id === f.id && <Check className="h-4 w-4 text-orbit-cyan" />}
                </button>
              ))
            )}
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-white/40">O parceiro recebe um pedido e aparece no seu perfil depois de confirmar.</p>
        </div>
      </Sheet>
    </>
  );
}
