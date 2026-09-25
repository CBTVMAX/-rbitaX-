"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Users, X } from "lucide-react";
import { initials } from "@/lib/format";
import { frameBackdropStyle, frameSrc, getFrame } from "@/lib/avatar-frames";
import { PresenceDot } from "@/components/presence-picker";
import type { Conversation } from "@/lib/messenger/types";

export function ChatAvatar({
  name,
  url,
  size = 44,
  presence,
  frame,
  group = false,
  ringClass = "border-space-bg",
}: {
  name: string;
  url: string | null | undefined;
  size?: number;
  presence?: string | null;
  frame?: string | null;
  group?: boolean;
  ringClass?: string;
}) {
  const f = frame ? getFrame(frame) : null;
  // Small avatars with a frame: the photo shrinks a little so the frame fits the same spot.
  const photo = f && size <= 56 ? Math.round(size * 0.8) : size;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className="relative inline-flex shrink-0" style={{ width: photo, height: photo }}>
        {f && <span aria-hidden className="pointer-events-none absolute -inset-[30%]" style={frameBackdropStyle(f)} />}
        <span
          className={clsx(
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-snow",
            group ? "bg-gradient-to-br from-orbit-blue/80 via-orbit-purple/80 to-orbit-pink/70" : "bg-orbit-gradient"
          )}
          style={{ fontSize: Math.max(10, photo * 0.34) }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : group ? (
            <Users style={{ width: photo * 0.45, height: photo * 0.45 }} />
          ) : (
            initials(name) || "?"
          )}
        </span>
        {f && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frameSrc(f.id)}
            alt=""
            aria-hidden
            loading="lazy"
            className="pointer-events-none absolute -inset-[30%] h-[160%] w-[160%] max-w-none select-none"
          />
        )}
      </span>
      {presence !== undefined && !group && (
        <PresenceDot
          value={presence}
          className={clsx(
            "absolute bottom-0 right-0 z-[1] border-2",
            size >= 64 ? "h-4 w-4" : size >= 40 ? "h-3.5 w-3.5" : "h-3 w-3",
            ringClass
          )}
        />
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function ConversationAvatar({ c, size = 48, ringClass }: { c: Conversation; size?: number; ringClass?: string }) {
  return c.isGroup ? (
    <ChatAvatar name={c.name ?? "Grupo"} url={c.avatarUrl} size={size} group />
  ) : (
    <ChatAvatar
      name={c.otherUser?.name ?? "?"}
      url={c.otherUser?.avatarUrl}
      size={size}
      presence={c.otherUser?.presence ?? "offline"}
      frame={c.otherUser?.avatarFrame}
      ringClass={ringClass}
    />
  );
}

/** Centered dialog on desktop, bottom sheet on phones. */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={clsx(
          "animate-sheet-up flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-space-surface shadow-2xl outline-none sm:animate-pop-in sm:rounded-2xl",
          size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        {title && (
          <div className="flex items-center gap-3 px-5 pb-2 pt-3 sm:pt-4">
            <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Small floating menu anchored to its trigger; closes on outside click / Escape. */
export function Popover({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("touchstart", onDown);
    });
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={clsx(
        "animate-pop-in absolute z-40 overflow-hidden rounded-2xl border border-white/10 bg-space-surface py-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition disabled:cursor-default disabled:opacity-45",
        danger ? "text-red-400 hover:bg-red-500/10" : "text-white/85 hover:bg-white/5"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[11px] text-white/40">{hint}</span>}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
  disabled,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-chat/15 text-chat" : "text-white/65 hover:bg-white/[0.06] hover:text-white",
        className
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:cursor-default disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  danger,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition",
        danger ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-white/15 text-white/85 hover:bg-white/5",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Orbit rings used in empty states (no new logo, just the ÓrbitaX motif). */
export function OrbitIllustration({ className }: { className?: string }) {
  return (
    <div className={clsx("relative mx-auto h-28 w-28", className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-orbit-radial blur-md" />
      <div className="absolute inset-2 rounded-full border border-orbit-purple/30" />
      <div className="absolute inset-6 rounded-full border border-orbit-blue/30" />
      <div className="animate-orbit-spin absolute inset-2">
        <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-orbit-cyan shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
      </div>
      <div className="absolute inset-[38%] rounded-full bg-orbit-gradient shadow-glow" />
    </div>
  );
}
