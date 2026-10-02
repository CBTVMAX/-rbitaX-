import { clsx } from "clsx";

/** Três pontinhos pulando, ao lado de "digitando". */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("inline-flex items-end gap-[3px] pb-[3px]", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="ox-typing-dot h-[4px] w-[4px] rounded-full bg-current" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

/** "digitando…" pronto para cabeçalho e lista. */
export function TypingText({ label, className }: { label: string; className?: string }) {
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1.5 text-chat", className)} role="status">
      <span className="truncate">{label}</span>
      <TypingDots className="shrink-0" />
    </span>
  );
}
