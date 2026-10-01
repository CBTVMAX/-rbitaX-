import Link from "next/link";
import { redirect } from "next/navigation";
import { PhoneIncoming, PhoneMissed, PhoneOutgoing, Phone, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, type CallPeer } from "@/lib/calls";
import { CallBackButtons } from "@/components/calls/call-back-buttons";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  kind: "voice" | "video";
  status: string;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  caller: CallPeer | null;
  callee: CallPeer | null;
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const day = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (day(d) === day(today)) return `Hoje, ${time}`;
  if (day(d) === day(yesterday)) return `Ontem, ${time}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" })}, ${time}`;
}

export default async function CallsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const supabase = await createClient();
  const me = current.authId;

  const { data } = await supabase
    .from("Call")
    .select(
      "id, conversationId, callerId, calleeId, kind, status, createdAt, answeredAt, endedAt, caller:User!Call_callerId_fkey(id, name, username, avatarUrl), callee:User!Call_calleeId_fkey(id, name, username, avatarUrl)"
    )
    .or(`callerId.eq.${me},calleeId.eq.${me}`)
    .order("createdAt", { ascending: false })
    .limit(60);
  const calls = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white md:text-2xl">Chamadas</h1>
        <p className="mt-1 text-sm text-white/60">
          Chamadas de voz e vídeo com seus amigos. Para ligar, abra uma conversa no{" "}
          <Link href="/mensagens" className="text-orbit-cyan hover:underline">
            Messenger
          </Link>{" "}
          e toque no telefone ou na câmera.
        </p>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-space-surface/80 px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow">
            <Phone className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-white">Nenhuma chamada ainda</p>
          <p className="mt-1 text-sm text-white/55">Suas chamadas feitas e recebidas aparecem aqui.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
          {calls.map((c, i) => {
            const outgoing = c.callerId === me;
            const peer = (outgoing ? c.callee : c.caller) ?? { id: outgoing ? c.calleeId : c.callerId, name: "Usuário", avatarUrl: null };
            const missed = !outgoing && (c.status === "missed" || c.status === "canceled");
            const answered = !!c.answeredAt;
            const seconds = answered && c.endedAt ? (new Date(c.endedAt).getTime() - new Date(c.answeredAt!).getTime()) / 1000 : 0;
            const DirIcon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
            const label = missed
              ? "Perdida"
              : c.status === "declined"
                ? outgoing ? "Recusada" : "Você recusou"
                : !answered
                  ? outgoing ? "Sem resposta" : "Não atendida"
                  : c.status === "accepted"
                    ? "Em andamento"
                    : formatDuration(seconds);
            return (
              <li key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-white/10" : ""}`}>
                <Link href={peer.username ? `/perfil/${peer.username}` : "#"} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card text-sm font-semibold text-white/70">
                  {peer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    peer.name.slice(0, 1).toUpperCase()
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${missed ? "text-red-400" : "text-white"}`}>{peer.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/50">
                    <DirIcon className={`h-3.5 w-3.5 ${missed ? "text-red-400" : outgoing ? "text-orbit-cyan" : "text-emerald-400"}`} />
                    {c.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                    <span className="truncate">
                      {label} · {when(c.createdAt)}
                    </span>
                  </p>
                </div>
                <CallBackButtons conversationId={c.conversationId} peer={peer} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
