"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export function LandingAuthRow() {
  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <button
        onClick={handleGoogle}
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <GoogleIcon className="h-4 w-4" /> Google
      </button>
      <button
        type="button"
        disabled
        title="Em breve"
        className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/30"
      >
        <AppleIcon className="h-4 w-4" /> Apple
      </button>
      <Link
        href="/criar-conta"
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <Mail className="h-4 w-4" /> Email
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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.365 1.43c0 1.14-.462 2.24-1.213 3.04-.83.9-2.18 1.6-3.31 1.5-.13-1.11.44-2.28 1.19-3.02.82-.83 2.24-1.44 3.33-1.52zM20.4 17.24c-.55 1.27-.81 1.84-1.51 2.96-.98 1.57-2.36 3.53-4.08 3.55-1.53.02-1.92-.99-3.99-.98-2.07.01-2.5 1-4.03.98-1.72-.02-3.03-1.78-4.01-3.35-2.75-4.36-3.04-9.48-1.34-12.2 1.2-1.94 3.1-3.07 4.88-3.07 1.81 0 2.95 1 4.45 1 1.45 0 2.34-1 4.45-1 1.58 0 3.26.86 4.45 2.35-3.92 2.15-3.28 7.75.73 9.76z" />
    </svg>
  );
}
