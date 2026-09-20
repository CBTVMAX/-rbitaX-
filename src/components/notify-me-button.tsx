"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check } from "lucide-react";

export function NotifyMeButton({ source }: { source: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("Waitlist").insert({
      id: crypto.randomUUID(),
      email: email.trim(),
      source,
    });
    setBusy(false);
    if (insertError) {
      setError("Não deu pra salvar agora. Tenta de novo em instantes.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-orbit-cyan/40 bg-orbit-cyan/10 px-4 py-2 text-sm font-semibold text-orbit-cyan">
        <Check className="h-4 w-4" /> Você será avisado!
      </span>
    );
  }

  if (open) {
    return (
      <form onSubmit={submit} className="flex shrink-0 flex-wrap items-center gap-2">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-48 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-orbit-cyan"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "..." : "Avisar"}
        </button>
        {error && <span className="w-full text-xs text-red-400">{error}</span>}
      </form>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
    >
      <Bell className="h-4 w-4" /> Quero ser notificado
    </button>
  );
}
