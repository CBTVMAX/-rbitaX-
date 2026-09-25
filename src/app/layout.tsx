import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa";
import { Inter, Space_Grotesk, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "ÓrbitaX — Seu universo em conexão",
  description:
    "ÓrbitaX é a rede social onde pessoas, ideias e conteúdos entram em órbita: feed, comunidades, mensagens, música e vídeo em um só lugar.",
  applicationName: "ÓrbitaX",
  appleWebApp: { capable: true, title: "ÓrbitaX", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-space-bg font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
