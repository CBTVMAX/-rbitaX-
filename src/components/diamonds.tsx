import { useId } from "react";
import { clsx } from "clsx";

/** Diamantes 💎: mesma carteira do Órbita X, exibida com a identidade da referência. */
export function formatDiamonds(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.max(0, Math.round(n)));
}

/** Diamante azul/ciano — legível no dark mode futurista do Órbita X. */
export function DiamondIcon({ className }: { className?: string }) {
  const id = `dia-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={clsx("inline-block shrink-0", className ?? "h-4 w-4")}>
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7DD3FC" />
          <stop offset="0.5" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path d="M6 3h12l3.2 5.2L12 21.5 2.8 8.2 6 3Z" fill={`url(#${id})`} />
      <path d="M6 3h12l3.2 5.2H2.8L6 3Z" fill="#fff" fillOpacity="0.22" />
      <path d="M2.8 8.2h18.4L12 21.5 2.8 8.2Z" fill="#000" fillOpacity="0.06" />
      <path d="M9.2 8.2 12 3.4l2.8 4.8M12 21.5 9.2 8.2M12 21.5l2.8-13.3" fill="none" stroke="#EFF9FF" strokeOpacity="0.5" strokeWidth="0.7" />
    </svg>
  );
}

export function DiamondAmount({ value, className, iconClassName }: { value: number; className?: string; iconClassName?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 font-semibold tabular-nums", className)}>
      <DiamondIcon className={iconClassName} />
      {formatDiamonds(value)}
    </span>
  );
}

/** Rótulo/estilo do status de um pedido, no padrão da referência ("Concluído"). */
export function orderStatusInfo(status: string): { label: string; className: string } {
  switch (status) {
    case "approved":
      return { label: "Concluído", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    case "pending":
    case "in_process":
      return { label: "Pendente", className: "text-amber-300 bg-amber-500/10 border-amber-500/20" };
    case "refunded":
      return { label: "Estornado", className: "text-sky-300 bg-sky-500/10 border-sky-500/20" };
    case "rejected":
    case "cancelled":
      return { label: "Não aprovado", className: "text-red-300 bg-red-500/10 border-red-500/20" };
    default:
      return { label: status, className: "text-white/60 bg-white/5 border-white/10" };
  }
}

/** Rótulo amigável para cada movimento do ledger. */
export function movementLabel(kind: string): string {
  switch (kind) {
    case "topup":
      return "Compra de Diamantes";
    case "purchase":
      return "Compra na loja";
    case "gift":
      return "Presente enviado";
    case "grant":
      return "Diamantes recebidos";
    case "refund":
      return "Estorno / ajuste";
    default:
      return "Movimentação";
  }
}
