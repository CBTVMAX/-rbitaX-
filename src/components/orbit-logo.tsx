import { clsx } from "clsx";

export function OrbitLogo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/orbit-icon.webp"
      alt="ÓrbitaX"
      width={size}
      height={size}
      className={clsx("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
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
