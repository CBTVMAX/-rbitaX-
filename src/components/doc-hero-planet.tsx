export function DocHeroPlanet() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 hidden h-40 w-40 sm:block sm:h-48 sm:w-48 lg:h-56 lg:w-56">
      <div className="absolute inset-8 rounded-full bg-orbit-gradient opacity-90 shadow-glow sm:inset-10 lg:inset-12" />
      <div className="absolute left-1/2 top-1/2 h-8 w-full -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border-2 border-orbit-cyan/50" />
      <div className="absolute left-1/2 top-1/2 h-14 w-full -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-orbit-purple/25" />
    </div>
  );
}
