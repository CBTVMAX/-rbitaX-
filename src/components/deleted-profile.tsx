import Link from "next/link";

/** Perfil de quem pediu a exclusão (período de 6 meses): só o nome, como no VK. */
export function DeletedProfile({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-2xl px-3 py-6 md:px-4 md:py-10">
      <div className="rounded-2xl border border-white/10 bg-space-surface/80 px-6 py-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/perfil-removido.webp" alt="" width={112} height={112} className="mx-auto h-28 w-28 rounded-full" />
        <h1 className="mt-4 font-display text-xl font-bold text-white">{name}</h1>
        <p className="mt-2 text-sm text-white/55">Esta página foi excluída. As informações dela não estão disponíveis.</p>
        <Link
          href="/feed"
          className="mx-auto mt-6 flex min-h-[42px] w-fit items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
        >
          Voltar para o feed
        </Link>
      </div>
    </div>
  );
}
