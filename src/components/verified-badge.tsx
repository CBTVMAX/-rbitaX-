import { useId } from "react";
import { clsx } from "clsx";

// Roseta de 8 pontas suavizadas (viewBox 24). Selo emitido pela plataforma:
// usa sempre as cores da marca, independente da cor escolhida no perfil.
const ROSETTE =
  "M12 0.8C12.6 0.8 13.4 1.5 14 1.9C14.6 2.2 15 2.9 15.6 3.2C16.2 3.5 17 3.2 17.7 3.4C18.4 3.5 19.3 3.6 19.8 4.1C20.3 4.6 20.4 5.5 20.5 6.2C20.7 6.9 20.5 7.7 20.7 8.3C21 8.9 21.7 9.3 22.1 9.9C22.5 10.5 23.1 11.3 23.1 12C23.1 12.6 22.5 13.4 22.1 14C21.7 14.6 21 15 20.7 15.6C20.5 16.2 20.7 17 20.5 17.7C20.4 18.4 20.3 19.3 19.8 19.8C19.3 20.3 18.4 20.4 17.7 20.5C17 20.7 16.2 20.5 15.6 20.7C15 21 14.6 21.7 14 22.1C13.4 22.5 12.6 23.1 12 23.1C11.3 23.1 10.5 22.5 9.9 22.1C9.3 21.7 8.9 21 8.3 20.7C7.7 20.5 6.9 20.7 6.2 20.5C5.5 20.4 4.6 20.3 4.1 19.8C3.6 19.3 3.5 18.4 3.4 17.7C3.2 17 3.5 16.2 3.2 15.6C2.9 15 2.2 14.6 1.9 14C1.5 13.4 0.8 12.6 0.8 12C0.8 11.3 1.5 10.5 1.9 9.9C2.2 9.3 2.9 8.9 3.2 8.3C3.5 7.7 3.2 6.9 3.4 6.2C3.5 5.5 3.6 4.6 4.1 4.1C4.6 3.6 5.5 3.5 6.2 3.4C6.9 3.2 7.7 3.5 8.3 3.2C8.9 2.9 9.3 2.2 9.9 1.9C10.5 1.5 11.3 0.8 12 0.8Z";

export function VerifiedBadge({ className, title = "Conta verificada" }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={clsx("verified-badge inline-block shrink-0 align-[-0.125em]", className ?? "h-4 w-4")}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`vb-f-${uid}`} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5EEAD4" />
          <stop offset="0.3" stopColor="#22D3EE" />
          <stop offset="0.65" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={`vb-h-${uid}`} x1="12" y1="1" x2="12" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={ROSETTE} fill={`url(#vb-f-${uid})`} />
      <path d={ROSETTE} fill={`url(#vb-h-${uid})`} />
      <path d={ROSETTE} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="0.6" />
      <path d="M7.6 12.3l3 3 5.9-6.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
