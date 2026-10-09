"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_PREFS, type UserPrefs } from "@/lib/user-prefs";

const Ctx = createContext<{ prefs: UserPrefs; setPrefs: (p: UserPrefs) => void }>({ prefs: DEFAULT_PREFS, setPrefs: () => {} });

/** Preferências de conteúdo da conta, disponíveis em todo o app (sem buscar de novo em cada tela). */
export function UserPrefsProvider({ initial, children }: { initial: UserPrefs; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(initial);
  return <Ctx.Provider value={{ prefs, setPrefs }}>{children}</Ctx.Provider>;
}

export function useUserPrefs() {
  return useContext(Ctx);
}
