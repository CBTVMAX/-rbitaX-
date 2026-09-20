import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

export function timeAgo(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: ptBR });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
