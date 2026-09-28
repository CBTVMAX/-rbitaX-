"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, Gift, Loader2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DiamondAmount, DiamondIcon } from "@/components/diamonds";
import { announceBalance } from "@/lib/store";

export type GiftProduct = { id: string; name: string; image: string; priceCoins: number };
export type GiftRecipient = { id: string; name: string; username: string; avatarUrl: string | null };

/**
 * Envio de presente com Diamantes (perfil, publicação ou página de Diamantes).
 * O preço e a dedução vêm sempre do banco (send_gift_to_user) — nunca do cliente.
 */
export function GiftDialog({
  gifts,
  balance,
  recipient,
  onClose,
  onSent,
}: {
  gifts: GiftProduct[];
  balance: number;
  recipient?: GiftRecipient | null;
  onClose: () => void;
  onSent?: (newBalance: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [to, setTo] = useState<GiftRecipient | null>(recipient ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiftRecipient[]>([]);
  const [selected, setSelected] = useState<string | null>(gifts[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (to || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("User")
        .select("id, name, username, avatarUrl")
        .ilike("username", `%${query.trim()}%`)
        .limit(6);
      setResults((data ?? []) as GiftRecipient[]);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, to, supabase]);

  const gift = gifts.find((g) => g.id === selected) ?? null;
  const canAfford = gift ? balance >= gift.priceCoins : false;

  async function send() {
    if (!to || !gift) return;
    if (!canAfford) {
      setError("Saldo de Diamantes insuficiente.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("send_gift_to_user", {
      p_recipient_id: to.id,
      p_product_id: gift.id,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (e) {
      setError(/insufficient/.test(e.message) ? "Saldo de Diamantes insuficiente." : "Não foi possível enviar agora.");
      return;
    }
    const res = data as { balance?: number } | null;
    if (typeof res?.balance === "number") {
      announceBalance(res.balance);
      onSent?.(res.balance);
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="animate-sheet-up relative flex w-full max-w-md flex-col rounded-t-3xl border border-white/10 bg-space-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-base font-semibold text-white">
            <Gift className="h-5 w-5 text-orbit-cyan" /> Enviar presente
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-space-bg/60 px-2.5 py-1 text-xs text-white/80">
              <DiamondIcon className="h-3.5 w-3.5" /> {new Intl.NumberFormat("pt-BR").format(balance)}
            </span>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/55 hover:bg-white/5 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-8 w-8" />
            </span>
            <p className="text-lg font-semibold text-white">Presente enviado!</p>
            <p className="text-sm text-white/60">
              {gift?.name} para <span className="text-white/80">{to?.name}</span>.
            </p>
            <button type="button" onClick={onClose} className="mt-2 rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-snow shadow-glow">
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Destinatário */}
            {to ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-space-bg/40 p-2.5">
                <Avatar name={to.name} url={to.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{to.name}</p>
                  <p className="truncate text-xs text-white/50">@{to.username}</p>
                </div>
                {!recipient && (
                  <button type="button" onClick={() => setTo(null)} className="text-xs font-semibold text-orbit-cyan hover:underline">
                    Trocar
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-space-bg/50 px-3 py-2.5 focus-within:border-orbit-purple/60">
                  <Search className="h-4 w-4 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por @usuário"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </label>
                {results.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setTo(r);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5"
                      >
                        <Avatar name={r.name} url={r.avatarUrl} />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{r.name}</p>
                          <p className="truncate text-xs text-white/50">@{r.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Presentes */}
            <div className="grid grid-cols-4 gap-2">
              {gifts.map((g) => {
                const on = g.id === selected;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelected(g.id)}
                    className={clsx(
                      "flex flex-col items-center gap-1 rounded-2xl border p-2 transition",
                      on ? "border-orbit-purple/60 bg-orbit-purple/10" : "border-white/10 bg-space-bg/40 hover:border-white/20"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image} alt={g.name} className="h-10 w-10 object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white/85">
                      <DiamondIcon className="h-3 w-3" /> {g.priceCoins > 0 ? new Intl.NumberFormat("pt-BR").format(g.priceCoins) : "Grátis"}
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder="Mensagem (opcional)"
              className="w-full rounded-2xl border border-white/10 bg-space-bg/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
            />

            {error && <p className="text-xs text-red-300">{error}</p>}

            <button
              type="button"
              onClick={send}
              disabled={busy || !to || !gift}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {gift ? (
                <>
                  Enviar {gift.name} · <DiamondAmount value={gift.priceCoins} iconClassName="h-3.5 w-3.5" />
                </>
              ) : (
                "Escolha um presente"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-xs text-white/70">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
