import { OrbitLogo } from "@/components/orbit-logo";

export function DocHeroPlanet() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 hidden sm:block">
      <OrbitLogo size={72} className="drop-shadow-[0_0_36px_rgba(139,92,246,0.4)] lg:hidden" />
      <OrbitLogo size={92} className="hidden drop-shadow-[0_0_36px_rgba(139,92,246,0.4)] lg:block" />
    </div>
  );
}
