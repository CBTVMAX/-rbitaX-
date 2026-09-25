import { useId } from "react";
import { clsx } from "clsx";

/** Órbita Coins: amounts always read the same way everywhere ("1.250"). */
export function formatCoins(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.max(0, Math.round(n)));
}

/** The Órbita Coin: gold disc with an orbit ring (currentColor-free, readable on light and dark). */
export function CoinIcon({ className }: { className?: string }) {
  const id = `coin-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={clsx("inline-block shrink-0", className ?? "h-4 w-4")}>
      <defs>
        <linearGradient id={id} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.55" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${id})`} />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1" />
      <ellipse cx="12" cy="12" rx="8.6" ry="3.2" fill="none" stroke="#FFFBEB" strokeWidth="1.3" transform="rotate(-24 12 12)" />
      <circle cx="12" cy="12" r="2.4" fill="#FFFBEB" />
    </svg>
  );
}

export function CoinAmount({ value, className, iconClassName }: { value: number; className?: string; iconClassName?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 font-semibold tabular-nums", className)}>
      <CoinIcon className={iconClassName} />
      {formatCoins(value)}
    </span>
  );
}
