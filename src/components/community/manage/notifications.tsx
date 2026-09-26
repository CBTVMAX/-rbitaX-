"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { communityError, rank, type NotifyPrefs } from "@/lib/communities";
import { useCommunity } from "../context";
import { Card, ReadOnlyNote, Toggle } from "./fields";

const PREFS: { key: keyof NotifyPrefs; label: string; desc: string }[] = [
  { key: "newPost", label: "Novas publicações", desc: "Membros são avisados quando sai um post novo." },
  { key: "newDiscussion", label: "Novas discussões", desc: "Membros são avisados quando alguém abre um tópico." },
  { key: "announcements", label: "Anúncios", desc: "Posts marcados como Anúncio, Evento, Novidade etc. avisam todos os membros." },
  { key: "joinRequests", label: "Pedidos para entrar", desc: "Administradores são avisados quando chega um pedido (comunidade privada)." },
];

export function NotificationsSection({ notify, onAnnounce }: { notify: boolean; onAnnounce: () => void }) {
  const { community, role, supabase, toast } = useCommunity();
  const admin = rank(role) >= 3;
  const [mine, setMine] = useState(notify);
  const [prefs, setPrefs] = useState<NotifyPrefs>(community.notifyPrefs);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleMine(v: boolean) {
    setBusy("mine");
    const { error } = await supabase.rpc("community_set_notify", { p_community: community.id, p_on: v });
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    setMine(v);
    toast(v ? "Você vai receber as notificações desta comunidade." : "Notificações desta comunidade silenciadas para você.");
  }

  async function togglePref(key: keyof NotifyPrefs, v: boolean) {
    const next = { ...prefs, [key]: v };
    setBusy(key);
    const { error } = await supabase.rpc("community_update", { p_community: community.id, p: { notifyPrefs: next } as never });
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    setPrefs(next);
    toast("Preferência salva.");
  }

  return (
    <div className="space-y-4">
      <Card title="Para você" desc="Vale só para a sua conta.">
        <Toggle checked={mine} disabled={busy === "mine"} onChange={toggleMine} label="Receber notificações desta comunidade" desc="Posts, discussões, anúncios e menções." />
      </Card>
      <Card title="Para os membros" desc="O que a comunidade envia de notificação. Menções e respostas aos seus posts sempre chegam, sem duplicar.">
        {!admin && <ReadOnlyNote>Só administradores e o proprietário mudam essas opções.</ReadOnlyNote>}
        <div className="divide-y divide-white/[0.05]">
          {PREFS.map((p) => (
            <Toggle key={p.key} checked={prefs[p.key]} disabled={!admin || busy === p.key} onChange={(v) => togglePref(p.key, v)} label={p.label} desc={p.desc} />
          ))}
        </div>
      </Card>
      {admin && (
        <Card
          title={community.isOfficial ? "Anúncios oficiais" : "Anúncios"}
          desc="Publique um aviso que chega como notificação para todos os membros (se Anúncios estiver ativo)."
          right={
            <button type="button" onClick={onAnnounce} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow shadow-glow">
              <Megaphone className="h-4 w-4" /> Criar anúncio
            </button>
          }
        >
          <p className="text-xs text-white/45">Tipos: 📣 Anúncio · 🛰️ Atualização · 📅 Evento · 🛠️ Manutenção · ✨ Novidade · 🚀 Novo recurso.</p>
        </Card>
      )}
    </div>
  );
}
