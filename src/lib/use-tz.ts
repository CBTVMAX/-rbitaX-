"use client";

import { useEffect, useState } from "react";

/** Brasília time is used for the server render (and hydration); then the viewer's own timezone takes over. */
export const DEFAULT_TZ = "America/Sao_Paulo";

export function useTimeZone() {
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local && local !== DEFAULT_TZ) setTz(local);
  }, []);
  return tz;
}

export const dayKey = (d: Date, tz: string) => d.toLocaleDateString("en-CA", { timeZone: tz });
export const hhmm = (d: Date, tz: string) => d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
