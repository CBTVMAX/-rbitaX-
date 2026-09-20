import { clsx } from "clsx";

export function OrbitLogo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/orbit-mark.webp"
      alt="ÓrbitaX"
      className={clsx("shrink-0 object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}

export function OrbitWordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("font-display font-bold tracking-wide orbit-text-gradient", className)}>
      ÓRBITA<span className="text-white">X</span>
    </span>
  );
}

export function OrbitLockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/orbit-lockup.webp"
      alt="ÓrbitaX — Seu universo em conexão"
      className={clsx("object-contain", className)}
    />
  );
}
