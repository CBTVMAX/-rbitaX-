"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { AlertTriangle, BadgeCheck, Crown, Loader2, Shield, ShieldCheck, X } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/communities";

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "animate-sheet-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-space-surface shadow-[0_-18px_50px_rgba(0,0,0,0.5)] md:rounded-3xl",
          wide ? "md:max-w-2xl" : "md:max-w-md"
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />
        {title !== undefined && (
          <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-3 md:pt-4">
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">{title}</div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Confirmation before anything destructive. */
export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  danger = true,
  busy = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-4 text-center">
        <span className={clsx("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl", danger ? "bg-red-500/15 text-red-300" : "bg-orbit-purple/15 text-orbit-purple")}>
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="mt-3 text-base font-semibold text-white">{title}</p>
        <div className="mx-auto mt-1 max-w-sm text-sm text-white/60">{message}</div>
        {children}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-snow transition disabled:opacity-60",
              danger ? "bg-red-500/90 hover:bg-red-500" : "bg-orbit-gradient shadow-glow"
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function OfficialBadge({ className }: { className?: string }) {
  return (
    <span
      title="Comunidade oficial do Órbita X"
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-[linear-gradient(135deg,#22d3ee,#3b82f6_55%,#8b5cf6)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-snow shadow-[0_0_14px_rgba(34,211,238,0.45)]",
        className
      )}
    >
      <BadgeCheck className="h-3 w-3" /> Oficial
    </span>
  );
}

export function RoleBadge({ role, className }: { role: Role | null | undefined; className?: string }) {
  if (!role || role === "member") return null;
  const Icon = role === "owner" ? Crown : role === "admin" ? ShieldCheck : Shield;
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        role === "owner" ? "bg-amber-400/15 text-amber-400" : role === "admin" ? "bg-orbit-cyan/15 text-orbit-cyan" : "bg-orbit-purple/15 text-orbit-purple",
        className
      )}
    >
      <Icon className="h-3 w-3" /> {ROLE_LABEL[role]}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-white/80">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
