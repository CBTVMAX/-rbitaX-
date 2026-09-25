import type { MetadataRoute } from "next";

// Makes ÓrbitaX installable (Android/desktop "Instalar app", iPhone "Adicionar à Tela de Início")
// and is the base of the Android app (TWA) published as APK.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ÓrbitaX",
    short_name: "ÓrbitaX",
    description: "Seu universo em conexão: feed, comunidades, amigos e mensagens.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/feed?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060f",
    theme_color: "#05060f",
    categories: ["social", "communication"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mensagens", url: "/mensagens", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Amigos", url: "/amigos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Notificações", url: "/notificacoes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
