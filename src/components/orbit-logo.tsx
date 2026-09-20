import { clsx } from "clsx";

export function OrbitLogo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={clsx("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="orbitax-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f8bff" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="32" r="17" fill="none" stroke="url(#orbitax-ring)" strokeWidth="3.5" />
      <ellipse
        cx="30"
        cy="32"
        rx="27"
        ry="10"
        fill="none"
        stroke="url(#orbitax-ring)"
        strokeWidth="3"
        transform="rotate(-18 30 32)"
      />
      <circle cx="49" cy="19" r="4.5" fill="url(#orbitax-ring)" />
    </svg>
  );
}

export function OrbitWordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("font-display font-bold tracking-wide orbit-text-gradient", className)}>
      ÓRBITA<span className="text-white">X</span>
    </span>
  );
}
