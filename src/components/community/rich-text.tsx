import Link from "next/link";
import { Fragment } from "react";

const TOKEN = /(https?:\/\/[^\s<]{3,300}|www\.[^\s<]{3,300}|@[A-Za-z0-9_.]{3,30})/g;

/** Text with clickable links and @mentions. Plain React text nodes only — nothing is injected as HTML. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <p className={className}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        if (p.startsWith("@"))
          return (
            <Link key={i} href={`/perfil/${p.slice(1).replace(/\.$/, "")}`} className="font-medium text-orbit-cyan hover:underline">
              {p}
            </Link>
          );
        const href = p.startsWith("http") ? p : `https://${p}`;
        let safe = false;
        try {
          safe = ["http:", "https:"].includes(new URL(href).protocol);
        } catch {
          safe = false;
        }
        return safe ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-orbit-cyan hover:underline">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        );
      })}
    </p>
  );
}
