import Link from "next/link";
import { clsx } from "clsx";

// @menções (perfis e comunidades) e #hashtags viram links clicáveis.
// "@usuario (texto)" (padrão do VK) mostra só o texto, com link para o perfil do @usuario.
const TOKEN = /(@[a-zA-Z0-9_.]{2,30} \([^()\n]{0,60}\)|@[a-zA-Z0-9_.]{2,30}|#[\p{L}0-9_]{1,60})/gu;
const LABELED = /^@([a-zA-Z0-9_.]{2,30}) \(([^()\n]{0,60})\)$/;

/**
 * Renderiza o texto de um post/comentário transformando @menção e #hashtag em links,
 * preservando quebras de linha. Uma @menção aponta para /perfil/<handle>, que resolve
 * tanto perfis quanto comunidades (o handle pode ser de qualquer um dos dois).
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const token = m[0];
    const start = m.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const handle = token.slice(1);
    const labeled = token.match(LABELED);
    if (labeled) {
      nodes.push(
        <Link
          key={key++}
          href={`/perfil/${encodeURIComponent(labeled[1])}`}
          title={`@${labeled[1]}`}
          className="font-medium text-orbit-cyan hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {labeled[2].trim() || `@${labeled[1]}`}
        </Link>
      );
    } else if (token[0] === "@") {
      nodes.push(
        <Link key={key++} href={`/perfil/${encodeURIComponent(handle)}`} className="font-medium text-orbit-cyan hover:underline" onClick={(e) => e.stopPropagation()}>
          {token}
        </Link>
      );
    } else {
      nodes.push(
        <Link key={key++} href={`/explorar?q=${encodeURIComponent("#" + handle)}`} className="font-medium text-orbit-purple hover:underline" onClick={(e) => e.stopPropagation()}>
          {token}
        </Link>
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className={clsx("whitespace-pre-wrap", className)}>{nodes}</span>;
}
