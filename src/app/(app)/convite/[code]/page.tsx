import Link from "next/link";
import { redirect } from "next/navigation";
import { Link2Off, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatAvatar } from "@/components/messenger/ui";
import { JoinChatButton } from "./join-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Convite para o chat · ÓrbitaX" };

type Preview = { id: string; name: string | null; avatarUrl: string | null; description: string | null; memberCount: number; isMember: boolean };

/** Link para o chat (Configurações do chat → Recebimento do link): prévia do grupo e botão de entrar. */
export default async function ConvitePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const valid = /^[a-f0-9]{12}$/.test(code);
  const supabase = await createClient();
  const { data } = valid ? await supabase.rpc("group_invite_preview", { p_code: code }) : { data: null };
  const preview = (data ?? null) as Preview | null;

  if (preview?.isMember) redirect(`/mensagens?c=${preview.id}`);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-space-surface/90 p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        {preview ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Convite para o chat</p>
            <div className="mt-5 flex justify-center">
              <ChatAvatar name={preview.name ?? "Grupo"} url={preview.avatarUrl} size={96} group />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">{preview.name || "Grupo"}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/50">
              <Users className="h-4 w-4" /> {preview.memberCount} {preview.memberCount === 1 ? "participante" : "participantes"}
            </p>
            {preview.description && <p className="mt-3 text-sm leading-relaxed text-white/65">{preview.description}</p>}
            <JoinChatButton code={code} />
            <Link href="/mensagens" className="mt-3 inline-block text-sm text-white/50 transition hover:text-white">
              Agora não
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] text-white/50">
              <Link2Off className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-xl font-bold text-white">Link inválido</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Este link para o chat não existe mais. A administração pode ter gerado um novo — peça o link atualizado.
            </p>
            <Link
              href="/mensagens"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-snow transition hover:brightness-110"
            >
              Ir para o Messenger
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
