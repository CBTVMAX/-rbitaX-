import type { MetadataRoute } from "next";

/** Órbita X é só para quem tem conta: buscadores veem apenas a página inicial e as páginas institucionais. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/sobre", "/termos", "/privacidade", "/contato", "/entrar", "/criar-conta"],
      disallow: "/",
    },
  };
}
