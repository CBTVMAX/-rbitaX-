"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PAGES_CACHE = "orbitax-pages-v1"; // mesmo nome usado em public/sw.js
const OWNER_KEY = "orbitax.offlineOwner";

/** Apaga as telas guardadas para uso sem internet (ao sair ou trocar de conta). */
function clearSavedPages() {
  if (typeof caches === "undefined") return;
  caches.delete(PAGES_CACHE).catch(() => {});
}

/**
 * Sem internet o app continua aberto com o que já carregou (o service worker serve as telas
 * guardadas); aqui só aparece um aviso discreto no topo. Quando a conexão volta, os dados
 * são atualizados sozinhos.
 */
export function OfflineStatus() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [back, setBack] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => {
      clearTimeout(timer.current);
      setBack(false);
      setOffline(true);
    };
    const goOnline = () => {
      setOffline(false);
      setBack(true);
      router.refresh();
      timer.current = setTimeout(() => setBack(false), 2500);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearTimeout(timer.current);
    };
  }, [router]);

  // As telas guardadas pertencem a uma conta: se a conta deste aparelho mudar, somem.
  useEffect(() => {
    const supabase = createClient();
    const sync = (uid: string | null) => {
      try {
        const owner = localStorage.getItem(OWNER_KEY);
        if (owner !== (uid ?? "")) {
          clearSavedPages();
          localStorage.setItem(OWNER_KEY, uid ?? "");
        }
      } catch {
        if (!uid) clearSavedPages();
      }
    };
    supabase.auth.getSession().then(({ data }) => sync(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") sync(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!offline && !back) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+10px)]"
    >
      <div
        className={
          "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium text-snow shadow-2xl backdrop-blur-md transition " +
          (offline ? "border-white/15 bg-[#11131f]/90" : "border-emerald-400/30 bg-emerald-600/90")
        }
      >
        {offline ? <WifiOff className="h-3.5 w-3.5 text-amber-300" /> : <Wifi className="h-3.5 w-3.5" />}
        {offline ? "Sem conexão · mostrando o que já foi carregado" : "Conexão restabelecida"}
      </div>
    </div>
  );
}
