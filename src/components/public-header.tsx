"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { OrbitWordmarkImage } from "@/components/orbit-logo";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/explorar", label: "Explorar" },
  { href: "/comunidades", label: "Comunidades" },
  { href: "/sobre", label: "Sobre" },
];

export function PublicHeader({ authed = false }: { authed?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
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
                className="hidden rounded-full bg-orbit-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:opacity-90 sm:inline-flex sm:px-5 sm:text-sm"
              >
                Criar uma conta
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-space-bg/60 text-white backdrop-blur-sm transition hover:bg-white/5 sm:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="relative z-20 mx-4 mb-4 rounded-2xl border border-white/10 bg-space-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:hidden">
          <nav className="flex flex-col gap-1 text-sm">
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "rounded-lg px-3 py-2.5 transition hover:bg-white/5 hover:text-white",
                    active ? "font-medium text-white" : "text-white/70"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {!authed && (
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link
                href="/entrar"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Entrar
              </Link>
              <Link
                href="/criar-conta"
                onClick={() => setOpen(false)}
                className="rounded-full bg-orbit-gradient px-5 py-2.5 text-center text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                Criar uma conta
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
