"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { Phone } from "lucide-react";

export function LandingAuthRow({ pill = false }: { pill?: boolean }) {
  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const shape = pill ? "rounded-full" : "rounded-xl";

  return (
    <div className="mb-6 grid w-full grid-cols-2 gap-3">
      <button
        onClick={handleGoogle}
        type="button"
        className={clsx(
          "flex items-center justify-center gap-2 border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10",
          shape
        )}
      >
        <GoogleIcon className="h-4 w-4" /> Google
      </button>
      <Link
        href="/criar-conta"
        className={clsx(
          "flex items-center justify-center gap-2 border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10",
          shape
        )}
      >
        <Phone className="h-4 w-4" /> Telefone
      </Link>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
