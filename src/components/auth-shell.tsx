import Link from "next/link";
import { OrbitLogo, OrbitWordmark } from "@/components/orbit-logo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-space-bg bg-stars px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-space-surface/80 shadow-2xl backdrop-blur md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-orbit-blue/20 via-orbit-purple/20 to-orbit-pink/20 p-10 md:flex">
          <Link href="/" className="flex items-center gap-2">
            <OrbitLogo size={36} />
            <OrbitWordmark className="text-lg" />
          </Link>
          <div>
            <h2 className="mb-3 font-display text-2xl font-semibold text-white">
              Um lugar para pessoas reais, interesses verdadeiros e conteúdos que fazem sentido
              para você.
            </h2>
            <ul className="space-y-2 text-sm text-white/60">
              <li>• Conecte pessoas reais</li>
              <li>• Explore novos interesses</li>
              <li>• Compartilhe seus momentos</li>
              <li>• Participe de comunidades</li>
            </ul>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} ÓrbitaX</p>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <OrbitLogo size={28} />
            <OrbitWordmark className="text-base" />
          </div>
          <h1 className="mb-1 font-display text-2xl font-bold text-white">{title}</h1>
          <p className="mb-6 text-sm text-white/50">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
