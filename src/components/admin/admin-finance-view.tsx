"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Search, TrendingUp, Wallet, Gift, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DiamondIcon, formatDiamonds, orderStatusInfo } from "@/components/diamonds";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Overview = {
  revenueBRL: number; revenue30d: number; ordersApproved: number; ordersPending: number; ordersRejected: number;
  diamondsSold: number; refundsBRL: number; giftsCount: number; giftsCoins: number; walletsTotal: number; adjustments: number;
};
type Order = { id: string; userId: string; username: string; name: string; diamonds: number; amountBRL: number; status: string; provider: string; providerPaymentId: string | null; createdAt: string; paidAt: string | null };

export function AdminFinanceView() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"overview" | "orders" | "wallet">("overview");
  const [ov, setOv] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    const { data } = await supabase.rpc("admin_finance_overview");
    setOv((data ?? null) as Overview | null);
  }
  async function loadOrders() {
    const { data } = await supabase.rpc("admin_diamond_orders", { p_status: statusFilter || null, p_limit: 100 });
    setOrders((data ?? []) as Order[]);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadOverview(), loadOrders()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["overview", "orders", "wallet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx("rounded-full px-4 py-2 text-sm font-medium transition", tab === t ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/70 hover:bg-white/5")}
          >
            {t === "overview" ? "Visão geral" : t === "orders" ? "Pedidos" : "Carteira do usuário"}
          </button>
        ))}
      </div>

      {loading && tab !== "wallet" ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : tab === "overview" ? (
        <OverviewGrid ov={ov} />
      ) : tab === "orders" ? (
        <OrdersTable orders={orders} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onReload={loadOrders} />
      ) : (
        <WalletLookup />
      )}
    </div>
  );
}

function OverviewGrid({ ov }: { ov: Overview | null }) {
  if (!ov) return <p className="text-sm text-white/50">Sem dados.</p>;
  const cards = [
    { label: "Receita total", value: BRL.format(ov.revenueBRL), icon: TrendingUp, color: "text-emerald-400" },
    { label: "Receita (30 dias)", value: BRL.format(ov.revenue30d), icon: TrendingUp, color: "text-emerald-300" },
    { label: "Diamantes vendidos", value: formatDiamonds(ov.diamondsSold), icon: null, color: "text-sky-300" },
    { label: "Saldo total em carteiras", value: formatDiamonds(ov.walletsTotal), icon: Wallet, color: "text-white" },
    { label: "Pedidos aprovados", value: String(ov.ordersApproved), icon: null, color: "text-white" },
    { label: "Pedidos pendentes", value: String(ov.ordersPending), icon: null, color: "text-amber-300" },
    { label: "Pedidos não aprovados", value: String(ov.ordersRejected), icon: null, color: "text-red-300" },
    { label: "Estornos", value: BRL.format(ov.refundsBRL), icon: RefreshCw, color: "text-sky-300" },
    { label: "Presentes enviados", value: String(ov.giftsCount), icon: Gift, color: "text-pink-400" },
    { label: "Diamantes em presentes", value: formatDiamonds(ov.giftsCoins), icon: null, color: "text-pink-300" },
    { label: "Ajustes manuais (líquido)", value: formatDiamonds(ov.adjustments), icon: null, color: "text-white/80" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-white/10 bg-space-surface/70 p-4">
          <p className="text-xs text-white/50">{c.label}</p>
          <p className={clsx("mt-1 flex items-center gap-1.5 text-xl font-bold", c.color)}>
            {c.icon ? <c.icon className="h-4 w-4" /> : null}
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function OrdersTable({ orders, statusFilter, setStatusFilter, onReload }: { orders: Order[]; statusFilter: string; setStatusFilter: (s: string) => void; onReload: () => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none">
          <option value="">Todos os status</option>
          <option value="approved">Aprovados</option>
          <option value="pending">Pendentes</option>
          <option value="in_process">Em processamento</option>
          <option value="rejected">Rejeitados</option>
          <option value="cancelled">Cancelados</option>
          <option value="refunded">Estornados</option>
        </select>
        <button type="button" onClick={onReload} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-space-surface/80 text-left text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Diamantes</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-white/40">Nenhum pedido.</td></tr>
            )}
            {orders.map((o) => {
              const st = orderStatusInfo(o.status);
              return (
                <tr key={o.id} className="text-white/85">
                  <td className="px-4 py-3"><span className="font-medium text-white">{o.name}</span> <span className="text-white/40">@{o.username}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><DiamondIcon className="h-3.5 w-3.5" />{formatDiamonds(o.diamonds)}</span></td>
                  <td className="px-4 py-3 tabular-nums">{BRL.format(o.amountBRL)}</td>
                  <td className="px-4 py-3"><span className={clsx("rounded-full border px-2 py-0.5 text-[11px]", st.className)}>{st.label}</span></td>
                  <td className="px-4 py-3 text-white/50">{new Date(o.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type WalletData = {
  found: boolean;
  user?: { id: string; username: string; name: string; avatarUrl: string | null };
  balance?: number;
  ledger?: { id: string; kind: string; amount: number; balanceAfter: number; description: string; createdAt: string }[];
  orders?: { id: string; diamonds: number; amountBRL: number; status: string; createdAt: string; paidAt: string | null }[];
};

function WalletLookup() {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function lookup() {
    if (!query.trim()) return;
    setLoading(true);
    setMsg(null);
    const { data: d } = await supabase.rpc("admin_user_wallet", { p_query: query.trim() });
    setData((d ?? null) as WalletData | null);
    setLoading(false);
  }

  async function adjust() {
    if (!data?.user) return;
    const amt = parseInt(amount, 10);
    if (!amt || !reason.trim()) {
      setMsg("Informe um valor (≠ 0) e o motivo obrigatório.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { data: r, error } = await supabase.rpc("admin_adjust_diamonds", { p_user: data.user.id, p_amount: amt, p_reason: reason.trim() });
    setBusy(false);
    if (error) {
      setMsg(/admin_mfa/.test(error.message) ? "É necessário verificação em duas etapas (MFA) para ajustar carteiras." : "Não foi possível ajustar.");
      return;
    }
    const res = r as { previous: number; new: number };
    setMsg(`Ajuste registrado: ${res.previous} → ${res.new} Diamantes.`);
    setAmount("");
    setReason("");
    await lookup();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="relative flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-space-card px-3 py-2.5 focus-within:border-orbit-purple/60">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="ID do usuário ou @usuário"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </label>
        <button type="button" onClick={lookup} className="rounded-xl bg-orbit-gradient px-5 text-sm font-semibold text-snow">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {data && !data.found && <p className="text-sm text-white/50">Usuário não encontrado.</p>}

      {data?.found && data.user && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-space-surface/70 p-4">
            <div>
              <p className="text-sm font-semibold text-white">{data.user.name} <span className="text-white/40">@{data.user.username}</span></p>
              <p className="text-xs text-white/40">{data.user.id}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xl font-bold text-sky-300"><DiamondIcon className="h-5 w-5" />{formatDiamonds(data.balance ?? 0)}</p>
          </div>

          <div className="rounded-2xl border border-orbit-purple/25 bg-orbit-purple/5 p-4">
            <p className="mb-2 text-sm font-semibold text-white">Ajuste manual (gera auditoria obrigatória)</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^-0-9]/g, ""))} placeholder="+100 ou -50" className="w-full rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none sm:w-40" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Motivo (obrigatório)" className="w-full flex-1 rounded-xl border border-white/10 bg-space-card px-3 py-2.5 text-sm text-white outline-none" />
              <button type="button" onClick={adjust} disabled={busy} className="rounded-xl bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow disabled:opacity-60">
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Aplicar"}
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-white/70">{msg}</p>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Movimentações recentes</p>
              <div className="divide-y divide-white/5 rounded-2xl border border-white/10">
                {(data.ledger ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-white/40">Sem movimentações.</p>}
                {(data.ledger ?? []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-white/80">{t.description || t.kind}</span>
                    <span className={clsx("ml-2 shrink-0 tabular-nums", t.amount >= 0 ? "text-emerald-400" : "text-white/70")}>{t.amount >= 0 ? "+" : "−"}{formatDiamonds(Math.abs(t.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Compras</p>
              <div className="divide-y divide-white/5 rounded-2xl border border-white/10">
                {(data.orders ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-white/40">Sem compras.</p>}
                {(data.orders ?? []).map((o) => {
                  const st = orderStatusInfo(o.status);
                  return (
                    <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="inline-flex items-center gap-1 text-white/80"><DiamondIcon className="h-3.5 w-3.5" />{formatDiamonds(o.diamonds)}</span>
                      <span className="text-white/50">{BRL.format(o.amountBRL)}</span>
                      <span className={clsx("rounded-full border px-2 py-0.5 text-[10px]", st.className)}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
