import {
  Cpu,
  Gamepad2,
  Music2,
  Clapperboard,
  Palette,
  Camera,
  Trophy,
  Plane,
  Sparkles,
  BookOpen,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type CommunityCategory = { slug: string; label: string; icon: LucideIcon };

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  { slug: "tecnologia", label: "Tecnologia", icon: Cpu },
  { slug: "games", label: "Games", icon: Gamepad2 },
  { slug: "musica", label: "Música", icon: Music2 },
  { slug: "cinema-series", label: "Cinema e Séries", icon: Clapperboard },
  { slug: "arte-design", label: "Arte e Design", icon: Palette },
  { slug: "fotografia", label: "Fotografia", icon: Camera },
  { slug: "esportes", label: "Esportes", icon: Trophy },
  { slug: "viagens", label: "Viagens", icon: Plane },
  { slug: "anime", label: "Anime", icon: Sparkles },
  { slug: "cultura", label: "Cultura", icon: BookOpen },
  { slug: "outros", label: "Mais", icon: MoreHorizontal },
];

export function categoryLabel(slug: string | null) {
  return COMMUNITY_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug ?? null;
}
