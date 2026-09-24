import { OrbitLogo } from "@/components/orbit-logo";

function Sparkle({ className, size = 3 }: { className: string; size?: number }) {
  return (
    <span
      className={`absolute rounded-full bg-white ${className}`}
      style={{ width: size, height: size, boxShadow: `0 0 ${size * 3}px ${size}px rgba(255,255,255,0.7)` }}
    />
  );
}

export function DocHeroPlanet() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 hidden items-center justify-center sm:flex">
      <div
        className="absolute h-56 w-56 rounded-full opacity-70 blur-3xl lg:h-72 lg:w-72"
        style={{ background: "radial-gradient(circle, rgba(79,139,255,0.55) 0%, rgba(168,85,247,0.4) 45%, transparent 70%)" }}
      />
      <Sparkle className="left-4 top-2" size={3} />
      <Sparkle className="right-10 top-10 lg:right-14" size={4} />
      <Sparkle className="bottom-6 left-10" size={2} />
      <Sparkle className="bottom-2 right-2" size={3} />
      <OrbitLogo size={110} className="relative drop-shadow-[0_0_44px_rgba(139,92,246,0.6)] lg:hidden" />
      <OrbitLogo size={160} className="relative hidden drop-shadow-[0_0_44px_rgba(139,92,246,0.6)] lg:block" />
    </div>
  );
}
