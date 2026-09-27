"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Voltar respeitando o histórico do app (§5). Se não houver histórico dentro do
 * Órbita X (entrou direto na URL), cai para `fallback` em vez de sair do app.
 */
export function NavBack({ fallback = "/feed", label = "Voltar", className }: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter();
  const back = () => {
    // history.length > 1 e um referrer do próprio app => usar o voltar nativo
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button
      type="button"
      onClick={back}
      aria-label={label}
      className={className ?? "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:bg-white/5 hover:text-white"}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
