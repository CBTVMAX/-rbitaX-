/**
 * Chamadas de voz e vídeo (1:1). A mídia vai direto entre os aparelhos via WebRTC; o Supabase
 * guarda o registro (tabela Call, funções call_start / call_update) e leva a sinalização
 * (oferta, resposta e candidatos ICE) por um canal Realtime exclusivo da chamada.
 */

export type CallKind = "voice" | "video";
export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "canceled" | "ended" | "failed";

export type CallPeer = { id: string; name: string; username?: string | null; avatarUrl: string | null };

export type CallRecord = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  kind: CallKind;
  status: CallStatus;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
};

/** Tempo que uma chamada fica tocando antes de virar "perdida". */
export const RING_TIMEOUT_MS = 45_000;

/**
 * Servidores ICE. STUN público resolve a maioria das redes; para redes com NAT restrito
 * (comum em 4G/5G) configure um TURN em NEXT_PUBLIC_TURN_URLS (separadas por vírgula),
 * NEXT_PUBLIC_TURN_USERNAME e NEXT_PUBLIC_TURN_CREDENTIAL.
 */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = process.env.NEXT_PUBLIC_TURN_URLS;
  if (turn) {
    servers.push({
      urls: turn.split(",").map((u) => u.trim()).filter(Boolean),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export function mediaConstraints(kind: CallKind, facingMode: "user" | "environment" = "user"): MediaStreamConstraints {
  return {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: kind === "video" ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  };
}

export function callErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Permita o acesso ao microfone e à câmera para fazer chamadas.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Nenhum microfone ou câmera foi encontrado neste aparelho.";
  if (name === "NotReadableError") return "O microfone ou a câmera já está em uso por outro app.";
  if (msg.includes("group_not_supported")) return "Chamadas em grupo chegam em breve.";
  if (msg.includes("calls_restricted")) return "Esta pessoa limitou quem pode ligar para ela.";
  if (msg.includes("not_allowed")) return "Vocês precisam ser amigos para fazer chamadas.";
  return "Não foi possível iniciar a chamada. Tente novamente.";
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Toques gerados no próprio navegador (sem arquivos de áudio): "chamando" para quem liga e
 * toque de chamada para quem recebe. Retorna uma função que para o som.
 */
export function playTone(type: "ringback" | "ringtone"): () => void {
  let ctx: AudioContext | null = null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  } catch {
    return () => {};
  }
  const audio = ctx;
  let stopped = false;
  const beep = (freqs: number[], start: number, dur: number, vol: number) => {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.03);
    gain.gain.setValueAtTime(vol, start + dur - 0.05);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    gain.connect(audio.destination);
    for (const f of freqs) {
      const osc = audio.createOscillator();
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + dur);
    }
  };
  const cycle = () => {
    if (stopped) return;
    const t = audio.currentTime + 0.05;
    if (type === "ringback") beep([425], t, 1, 0.08);
    else {
      beep([880, 1320], t, 0.35, 0.12);
      beep([880, 1320], t + 0.5, 0.35, 0.12);
    }
  };
  audio.resume().catch(() => {});
  cycle();
  const timer = window.setInterval(cycle, type === "ringback" ? 4000 : 2500);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    audio.close().catch(() => {});
  };
}
