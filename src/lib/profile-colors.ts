import type { CSSProperties } from "react";

// Personalizar perfil → Cor do perfil. Ids must match the CHECK constraint on User."profileColor"
// (a preset id below or a custom "#rrggbb").
export const PROFILE_COLORS = [
  { id: "orbita", label: "Padrão", hex: "#8b5cf6" },
  { id: "roxo", label: "Roxo", hex: "#7c3aed" },
  { id: "azul", label: "Azul", hex: "#2b6cff" },
  { id: "ciano", label: "Ciano", hex: "#06b6d4" },
  { id: "rosa", label: "Rosa", hex: "#ec4899" },
  { id: "vermelho", label: "Vermelho", hex: "#ef4444" },
  { id: "laranja", label: "Laranja", hex: "#f97316" },
  { id: "dourado", label: "Dourado", hex: "#eab308" },
  { id: "verde", label: "Verde", hex: "#22c55e" },
  { id: "magenta", label: "Magenta", hex: "#d946ef" },
] as const;

export const DEFAULT_PROFILE_COLOR = "orbita";

const HEX = /^#[0-9a-f]{6}$/;

export function isValidProfileColor(value: string) {
  return HEX.test(value) || PROFILE_COLORS.some((c) => c.id === value);
}

export function profileColorHex(value: string | null | undefined): string {
  if (value && HEX.test(value)) return value;
  return PROFILE_COLORS.find((c) => c.id === value)?.hex ?? PROFILE_COLORS[0].hex;
}

export function profileColorLabel(value: string | null | undefined): string {
  if (value && HEX.test(value)) return "Personalizada";
  return PROFILE_COLORS.find((c) => c.id === value)?.label ?? "Padrão";
}

/** "r g b" channels for the --pa CSS variable. */
export function hexToChannels(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Style that sets the profile accent for everything inside, or undefined for the default look. */
export function profileAccentStyle(value: string | null | undefined): CSSProperties | undefined {
  if (!value || value === DEFAULT_PROFILE_COLOR) return undefined;
  return { ["--pa" as string]: hexToChannels(profileColorHex(value)) };
}

export function hasCustomAccent(value: string | null | undefined) {
  return !!value && value !== DEFAULT_PROFILE_COLOR;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToChannels(h: number, s: number, l: number) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => Math.round(255 * (ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `${f(0)} ${f(8)} ${f(4)}`;
}

/**
 * The member's color applied to the whole logged-in app (buttons, gradients, highlights, Messenger).
 * One color becomes a three-tone palette, like the original blue → purple → pink:
 * `--app-accent` (the chosen color) with neighbours a bit cooler (`-a`) and warmer (`-b`).
 * Returns undefined for the default color, so the original ÓrbitaX palette stays untouched.
 */
export function appAccentVars(value: string | null | undefined): Record<string, string> | undefined {
  if (!hasCustomAccent(value)) return undefined;
  const hex = profileColorHex(value);
  const [h, s, l] = hexToHsl(hex);
  const sat = Math.max(s, 55);
  return {
    "--app-accent": hexToChannels(hex),
    "--app-accent-a": hslToChannels(h - 26, sat, Math.max(38, l - 6)),
    "--app-accent-b": hslToChannels(h + 26, sat, Math.min(68, l + 6)),
  };
}
