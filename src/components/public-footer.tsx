import Link from "next/link";
import { Instagram, Twitter, Youtube } from "lucide-react";
import { OrbitWordmarkImage } from "@/components/orbit-logo";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82c-.93-.9-1.44-2.13-1.44-3.42h-3.15v13.44c0 1.55-1.26 2.81-2.81 2.81a2.81 2.81 0 0 1 0-5.62c.29 0 .57.04.83.13v-3.2a5.96 5.96 0 0 0-.83-.06 5.96 5.96 0 1 0 5.96 5.96V9.4a7.13 7.13 0 0 0 4.19 1.34V7.6a3.95 3.95 0 0 1-2.75-1.78Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.3 5.3A17.6 17.6 0 0 0 15.9 4c-.2.4-.4.9-.6 1.3a16.3 16.3 0 0 0-4.9 0A9 9 0 0 0 9.8 4a17.5 17.5 0 0 0-4.4 1.3C2.6 9 1.9 12.6 2.2 16.2a17.7 17.7 0 0 0 5.3 2.6c.4-.6.8-1.2 1.1-1.9-.6-.2-1.2-.5-1.7-.9l.4-.3c3.3 1.5 6.9 1.5 10.2 0l.4.3c-.6.4-1.1.6-1.7.9.3.7.7 1.3 1.1 1.9a17.6 17.6 0 0 0 5.3-2.6c.4-4.2-.7-7.7-2.3-10.9ZM9.7 14c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

const SOCIALS = [
  { icon: TikTokIcon, label: "TikTok", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: DiscordIcon, label: "Discord", href: "#" },
];

export function PublicFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-space-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <Link href="/" className="shrink-0">
          <OrbitWordmarkImage className="h-8 w-auto" />
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
          <Link href="/termos" className="transition hover:text-white/80">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="transition hover:text-white/80">
            Política de Privacidade
          </Link>
          <Link href="/contato" className="transition hover:text-white/80">
            Contato
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-white/50 transition hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30">Conecte-se com o universo.</p>
            <span className="mt-1 ml-auto block h-0.5 w-8 bg-orbit-pink" />
          </div>
        </div>
      </div>
    </footer>
  );
}
