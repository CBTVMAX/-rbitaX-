"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { OrbitWordmarkImage } from "@/components/orbit-logo";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/explorar", label: "Explorar" },
  { href: "/comunidades", label: "Comunidades" },
  { href: "/sobre", label: "Sobre" },
];

export function PublicHeader({ authed = false }: { authed?: boolean }) {
  const pathname = usePathname();

  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
      <Link href="/" className="flex min-w-0 shrink-0 items-center">
        <OrbitWordmarkImage className="h-10 w-auto sm:h-14" />
      </Link>

      <nav className="hidden items-center gap-8 text-sm text-white/70 lg:flex">
        {NAV.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx("transition hover:text-white", active && "font-medium text-white")}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {authed ? (
          <Link
            href="/feed"
            className="rounded-full bg-orbit-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90 sm:px-5 sm:text-sm"
          >
            Ir para o Feed
          </Link>
        ) : (
          <>
            <Link
              href="/entrar"
              className="hidden rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/criar-conta"
              className="rounded-full bg-orbit-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90 sm:px-5 sm:text-sm"
            >
              Criar uma conta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
