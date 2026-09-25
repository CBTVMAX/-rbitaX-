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
