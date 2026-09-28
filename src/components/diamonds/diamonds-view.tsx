"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, Crown, Gift, Loader2, Sparkles, Star, Sticker } from "lucide-react";
import { DiamondIcon, formatDiamonds, movementLabel, orderStatusInfo } from "@/components/diamonds";
import { GiftDialog, type GiftProduct } from "@/components/gift-dialog";
import { useCoinBalance } from "@/components/store/coin-balance";

export type DiamondPackage = { id: string; diamonds: number; priceBRL: number; label: string | null; badge: string | null; sortOrder: number };
export type DiamondMovement = { id: string; kind: string; amount: number; balanceAfter: number; description: string; createdAt: string; amountBRL: number | null; status: string | null };
export type GiftItem = { id: string; name: string; image: string; priceCoins: number };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function DiamondsView({
  packages,
  balance: initialBalance,
  history,
  gifts,
  paymentEnabled,
  returnStatus,
}: {
  packages: DiamondPackage[];
  balance: number;
  history: DiamondMovement[];
  gifts: GiftItem[];
  paymentEnabled: boolean;
  returnStatus: string | null;
}) {
  const liveBalance = useCoinBalance(initialBalance);
  const balance = liveBalance ?? initialBalance;
  const [buying, setBuying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(bannerFor(returnStatus));
  const [giftFor, setGiftFor] = useState<GiftProduct | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const giftProducts: GiftProduct[] = useMemo(() => gifts.map((g) => ({ id: g.id, name: g.name, image: g.image, priceCoins: g.priceCoins })), [gifts]);

  async function buy(pkg: DiamondPackage) {
    setNotice(null);
    setBuying(pkg.id);
    try {
      const res = await fetch("/api/diamonds/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { initPoint?: string; configured?: boolean; error?: string };
      if (data.configured === false) {
        setNotice("O pagamento está sendo configurado. Em breve você poderá comprar Diamantes por aqui.");
        return;
      }
      if (data.initPoint) {
        window.location.href = data.initPoint;
        return;
      }
      setNotice(data.error === "rate_limited" ? "Muitas tentativas seguidas. Aguarde um instante." : "Não foi possível iniciar o pagamento. Tente novamente.");
    } catch {
      setNotice("Falha de conexão. Tente novamente.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
      {/* Cabeçalho + saldo */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 ring-1 ring-sky-400/30">
            <DiamondIcon className="h-9 w-9 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Diamantes</h1>
            <p className="max-w-md text-sm text-white/60">Compre Diamantes e use para enviar presentes, comprar stickers e itens exclusivos.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-space-surface/70 px-5 py-4 lg:min-w-[280px]">
          <div>
            <p className="text-xs text-white/50">Meu saldo</p>
            <p className="flex items-center gap-1.5 text-2xl font-bold text-white">
              <DiamondIcon className="h-6 w-6" /> {formatDiamonds(balance)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex items-center gap-1 rounded-full border border-white/15 px-3.5 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
          >
            Ver extrato <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-orbit-purple/30 bg-orbit-purple/10 px-4 py-3 text-sm text-white/90">{notice}</div>
      )}

      {/* Pacotes */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Escolha um pacote</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {packages.map((pkg) => {
            const popular = (pkg.badge ?? "").toLowerCase().includes("popular");
            return (
              <div
                key={pkg.id}
                className={clsx(
                  "relative flex flex-col items-center rounded-2xl border p-4 text-center transition",
                  popular ? "border-orbit-purple/60 bg-orbit-purple/10 shadow-glow" : "border-white/10 bg-space-surface/60"
                )}
              >
                {pkg.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-orbit-gradient px-2.5 py-0.5 text-[11px] font-semibold text-snow">
                    {pkg.badge}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xl font-bold text-white">
                  <DiamondIcon className="h-6 w-6" /> {formatDiamonds(pkg.diamonds)}
                </span>
                <PackArt count={pkg.diamonds} />
                <span className="mb-3 text-lg font-semibold text-white">{BRL.format(pkg.priceBRL)}</span>
                <button
                  type="button"
                  onClick={() => buy(pkg)}
                  disabled={buying === pkg.id}
                  className={clsx(
                    "flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition disabled:opacity-60",
                    popular ? "bg-orbit-gradient text-snow shadow-glow" : "border border-white/15 text-white hover:bg-white/5"
                  )}
                >
                  {buying === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Comprar
                </button>
              </div>
            );
          })}
        </div>
        {!paymentEnabled && (
          <p className="mt-3 text-xs text-white/45">
            Pagamento via Mercado Pago em configuração. As compras ficam disponíveis assim que as credenciais forem ativadas.
          </p>
        )}
      </section>

      {/* Para que servem */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Para que servem os Diamantes?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <UseCard icon={Gift} color="text-pink-400" title="Enviar presentes" desc="Surpreenda outros usuários com presentes virtuais." />
          <UseCard icon={Sticker} color="text-orbit-purple" title="Comprar stickers" desc="Desbloqueie packs exclusivos." />
          <UseCard icon={Star} color="text-sky-400" title="Itens do perfil" desc="Personalize seu perfil com itens especiais." />
          <UseCard icon={Crown} color="text-amber-400" title="Recursos premium" desc="Tenha acesso a funções exclusivas no Órbita X." />
        </div>
      </section>

      {/* Loja de presentes + histórico */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Loja de Presentes</h2>
            <Link href="/loja?categoria=presentes" className="flex items-center gap-1 text-sm font-medium text-orbit-cyan hover:underline">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {gifts.slice(0, 8).map((g) => (
              <div key={g.id} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-space-surface/60 p-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt={g.name} className="h-12 w-12 object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                <p className="truncate text-sm font-medium text-white">{g.name}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-white/75">
                  <DiamondIcon className="h-3.5 w-3.5" /> {g.priceCoins > 0 ? formatDiamonds(g.priceCoins) : "Grátis"}
                </p>
                <button
                  type="button"
                  onClick={() => setGiftFor({ id: g.id, name: g.name, image: g.image, priceCoins: g.priceCoins })}
                  className="w-full rounded-full border border-white/15 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
                >
                  Enviar
                </button>
              </div>
            ))}
            {gifts.length === 0 && <p className="col-span-full text-sm text-white/50">Nenhum presente disponível.</p>}
          </div>
        </section>

        <section ref={historyRef}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Histórico de Diamantes</h2>
          </div>
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-space-surface/60">
            {history.length === 0 && <p className="px-4 py-8 text-center text-sm text-white/50">Sem movimentações ainda.</p>}
            {history.map((m) => {
              const positive = m.amount >= 0;
              const st = m.status ? orderStatusInfo(m.status) : null;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", positive ? "bg-emerald-500/10" : "bg-white/5")}>
                    {m.kind === "topup" ? <DiamondIcon className="h-4 w-4" /> : m.kind === "gift" ? <Gift className="h-4 w-4 text-pink-400" /> : <Sparkles className="h-4 w-4 text-white/60" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{movementLabel(m.kind)}</p>
                    <p className="truncate text-xs text-white/45">{new Date(m.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className={clsx("flex items-center justify-end gap-1 text-sm font-semibold tabular-nums", positive ? "text-emerald-400" : "text-white/80")}>
                      {positive ? "+" : "−"}
                      {formatDiamonds(Math.abs(m.amount))} <DiamondIcon className="h-3.5 w-3.5" />
                    </p>
                    {m.amountBRL != null && st ? (
                      <span className={clsx("mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", st.className)}>{st.label}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {giftFor && (
        <GiftDialog gifts={giftProducts.length ? giftProducts : [giftFor]} balance={balance} onClose={() => setGiftFor(null)} />
      )}
    </div>
  );
}

function bannerFor(status: string | null): string | null {
  if (status === "sucesso") return "Pagamento recebido! Assim que o Mercado Pago confirmar, seus Diamantes aparecem no saldo.";
  if (status === "pendente") return "Seu pagamento está pendente. Os Diamantes são creditados assim que for aprovado.";
  if (status === "falha") return "O pagamento não foi concluído. Você pode tentar novamente quando quiser.";
  return null;
}

function UseCard({ icon: Icon, color, title, desc }: { icon: React.ComponentType<{ className?: string }>; color: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-space-surface/60 p-4">
      <Icon className={clsx("mb-2 h-6 w-6", color)} />
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/50">{desc}</p>
    </div>
  );
}

function PackArt({ count }: { count: number }) {
  const n = count >= 5000 ? 5 : count >= 1000 ? 4 : count >= 500 ? 3 : 2;
  return (
    <div className="my-3 flex items-end justify-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <DiamondIcon key={i} className={clsx(i === Math.floor(n / 2) ? "h-8 w-8" : "h-5 w-5", "drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]")} />
      ))}
    </div>
  );
}
