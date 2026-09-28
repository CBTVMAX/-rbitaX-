"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Eye, EyeOff, Loader2, MessageSquareQuote, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Testimonial = { id: string; authorId: string; username: string; name: string; avatarUrl: string | null; isVerified: boolean; body: string; createdAt: string };
export type PendingTestimonial = { id: string; authorId: string; username: string; name: string; avatarUrl: string | null; body: string; createdAt: string };

export function ProfileTestimonials({
  isMe,
  canWrite,
  profileName,
  profileUserId,
  approved,
  pending,
  myExisting,
}: {
  isMe: boolean;
  canWrite: boolean;
  profileName: string;
  profileUserId: string;
  approved: Testimonial[];
  pending: PendingTestimonial[];
  myExisting: { body: string; status: string } | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [body, setBody] = useState(myExisting?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function write() {
    if (!body.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("testimonial_write", { p_profile_id: profileUserId, p_body: body.trim() });
    setBusy(false);
    if (error) { setMsg("Não foi possível enviar."); return; }
    setMsg("Depoimento enviado! Ele aparece quando " + profileName + " aprovar.");
    router.refresh();
  }

  async function moderate(id: string, action: "approve" | "hide" | "delete") {
    await supabase.rpc("testimonial_moderate", { p_id: id, p_action: action });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Visitante escreve/edita */}
      {!isMe && canWrite && (
        <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquareQuote className="h-4 w-4 text-orbit-cyan" /> {myExisting ? "Editar seu depoimento" : `Escrever depoimento para ${profileName}`}
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={`Conte como é a sua conexão com ${profileName}...`}
            className="w-full resize-none rounded-2xl border border-white/10 bg-space-bg/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/40">
              {myExisting?.status === "pending" ? "Aguardando aprovação." : myExisting?.status === "approved" ? "Aprovado e visível." : `${body.length}/1000`}
            </span>
            <button type="button" onClick={write} disabled={busy || !body.trim()} className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-snow shadow-glow disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {myExisting ? "Atualizar" : "Enviar"}
            </button>
          </div>
          {msg && <p className="mt-2 text-xs text-emerald-300">{msg}</p>}
        </div>
      )}

      {/* Moderação do dono */}
      {isMe && pending.length > 0 && (
        <div className="rounded-2xl border border-orbit-purple/40 bg-orbit-purple/5 p-4">
          <p className="mb-3 text-sm font-semibold text-white">Depoimentos para aprovar</p>
          <div className="space-y-3">
            {pending.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-space-bg/40 p-3">
                <Header t={t} />
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/85">{t.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={() => moderate(t.id, "approve")} className="flex items-center gap-1 rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow"><Check className="h-3.5 w-3.5" /> Aprovar</button>
                  <button type="button" onClick={() => moderate(t.id, "delete")} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aprovados */}
      <div className="space-y-3">
        {approved.length === 0 && pending.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-space-surface/80 p-8 text-center text-sm text-white/50">
            {isMe ? "Quando alguém escrever um depoimento, ele aparece aqui para você aprovar." : `${profileName} ainda não tem depoimentos.`}
          </div>
        ) : (
          approved.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-space-surface/80 p-4">
              <Header t={t} />
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/85">{t.body}</p>
              {isMe && (
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={() => moderate(t.id, "hide")} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/5"><EyeOff className="h-3 w-3" /> Ocultar</button>
                  <button type="button" onClick={() => moderate(t.id, "delete")} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/5"><Trash2 className="h-3 w-3" /> Excluir</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Header({ t }: { t: { username: string; name: string; avatarUrl: string | null; isVerified?: boolean; createdAt: string } }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-xs text-white/70">
        {t.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
        ) : (
          t.name.slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <Link href={`/perfil/${t.username}`} className="flex items-center gap-1 truncate text-sm font-semibold text-white hover:underline">
          {t.name} {t.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-orbit-blue" />}
        </Link>
        <p className="text-[11px] text-white/40">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
  );
}
