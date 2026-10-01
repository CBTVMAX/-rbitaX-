"use client";

import { Phone, Video } from "lucide-react";
import { useCalls } from "@/components/calls/call-provider";
import type { CallPeer } from "@/lib/calls";

export function CallBackButtons({ conversationId, peer }: { conversationId: string; peer: CallPeer }) {
  const { startCall } = useCalls();
  const btn = "flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label={`Ligar para ${peer.name}`} title="Chamada de voz" className={btn} onClick={() => startCall({ conversationId, peer, kind: "voice" })}>
        <Phone className="h-4 w-4" />
      </button>
      <button type="button" aria-label={`Videochamada com ${peer.name}`} title="Chamada de vídeo" className={btn} onClick={() => startCall({ conversationId, peer, kind: "video" })}>
        <Video className="h-4 w-4" />
      </button>
    </div>
  );
}
