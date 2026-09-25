"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COINS_EVENT } from "@/lib/store";

/** Current Órbita Coins balance, refreshed after purchases anywhere in the app. */
export function useCoinBalance(initial: number | null = null) {
  const [balance, setBalance] = useState<number | null>(initial);
  useEffect(() => {
    let alive = true;
    if (initial === null) {
      createClient()
        .rpc("my_coin_balance")
        .then(({ data }) => alive && setBalance(typeof data === "number" ? data : 0));
    }
    const on = (e: Event) => setBalance((e as CustomEvent<number>).detail);
    window.addEventListener(COINS_EVENT, on);
    return () => {
      alive = false;
      window.removeEventListener(COINS_EVENT, on);
    };
  }, [initial]);
  return balance;
}
