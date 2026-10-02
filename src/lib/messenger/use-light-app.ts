"use client";

import { useEffect, useState } from "react";

/** O app está no tema claro? (Configurações → Aparência: claro, ou automático com o aparelho claro.) */
export function useLightApp() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const read = () => {
      const theme = document.querySelector<HTMLElement>("[data-app-theme]")?.dataset.appTheme ?? document.documentElement.dataset.appTheme;
      setLight(theme === "light" || (theme === "auto" && mq.matches));
    };
    read();
    const obs = new MutationObserver(read);
    document.querySelectorAll("[data-app-theme]").forEach((el) => obs.observe(el, { attributes: true, attributeFilter: ["data-app-theme"] }));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-app-theme"] });
    mq.addEventListener("change", read);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", read);
    };
  }, []);
  return light;
}
