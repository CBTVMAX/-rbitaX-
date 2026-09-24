import { OrbitLogo } from "@/components/orbit-logo";

export function DocHeroPlanet() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 hidden items-center justify-center sm:flex">
      <div
        className="absolute h-48 w-48 rounded-full opacity-50 blur-3xl lg:h-64 lg:w-64"
        style={{ background: "radial-gradient(circle, rgba(79,139,255,0.5) 0%, rgba(168,85,247,0.35) 45%, transparent 70%)" }}
      />
      <OrbitLogo size={110} className="relative drop-shadow-[0_0_40px_rgba(139,92,246,0.5)] lg:hidden" />
      <OrbitLogo size={150} className="relative hidden drop-shadow-[0_0_40px_rgba(139,92,246,0.5)] lg:block" />
    </div>
  );
}
