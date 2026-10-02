import { clsx } from "clsx";

/** Foto redonda da comunidade (mesmo formato do perfil), com a inicial quando não há foto. */
export function CommunityAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return (
    <span className={clsx("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orbit-gradient font-bold text-snow", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
