import type { Metadata } from "next";
import { Inter, Space_Grotesk, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "ÓrbitaX — Seu universo em conexão",
  description:
    "ÓrbitaX é a rede social onde pessoas, ideias e conteúdos entram em órbita: feed, comunidades, mensagens, música e vídeo em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-space-bg font-sans antialiased">{children}</body>
    </html>
  );
}
