"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { clsx } from "clsx";
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RING_TIMEOUT_MS,
  callErrorMessage,
  formatDuration,
  iceServers,
  mediaConstraints,
  playTone,
  type CallKind,
  type CallPeer,
  type CallRecord,
} from "@/lib/calls";

type Phase = "outgoing" | "incoming" | "connecting" | "active" | "ended";

type Session = {
  record: CallRecord;
  peer: CallPeer;
  role: "caller" | "callee";
  phase: Phase;
  endText?: string;
  startedAt?: number;
};

type Signal =
  | { t: "ready" }
  | { t: "offer"; sdp: RTCSessionDescriptionInit }
  | { t: "answer"; sdp: RTCSessionDescriptionInit }
  | { t: "ice"; candidate: RTCIceCandidateInit }
  | { t: "hangup" };

type CallsContext = {
  /** Liga para a outra pessoa de uma conversa 1:1. */
  startCall: (opts: { conversationId: string; peer: CallPeer; kind: CallKind }) => Promise<void>;
  inCall: boolean;
};

const Ctx = createContext<CallsContext>({ startCall: async () => {}, inCall: false });

export function useCalls() {
  return useContext(Ctx);
}

const USER_CARD = "id, name, username, avatarUrl" as const;

/**
 * Chamadas de voz e vídeo para todo o app (montado no layout raiz): recebe chamadas em qualquer
 * página, toca, mostra a tela da chamada e cuida da conexão WebRTC. Sem login, não faz nada.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [meId, setMeId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [now, setNow] = useState(Date.now());

  const sessionRef = useRef<Session | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const stopToneRef = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);
  const facingRef = useRef<"user" | "environment">("user");
  const gotOfferRef = useRef(false);

  const update = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);
  const patch = useCallback((p: Partial<Session>) => {
    if (!sessionRef.current) return;
    update({ ...sessionRef.current, ...p });
  }, [update]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

  // ---------- sessão / login ----------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setMeId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ---------- limpeza ----------
  const stopTone = useCallback(() => {
    stopToneRef.current?.();
    stopToneRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopTone();
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    pendingIce.current = [];
    gotOfferRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setMinimized(false);
  }, [stopTone, supabase]);

  /** Encerra localmente e mostra o motivo por um instante. */
  const finish = useCallback(
    (text: string) => {
      cleanup();
      if (!sessionRef.current) return;
      patch({ phase: "ended", endText: text });
      const t = window.setTimeout(() => update(null), 1800);
      timers.current.push(t);
    },
    [cleanup, patch, update]
  );

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  };

  // ---------- sinalização ----------
  const send = useCallback((signal: Signal) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: signal });
  }, []);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const list = pendingIce.current;
    pendingIce.current = [];
    for (const c of list) await pc.addIceCandidate(c).catch(() => {});
  }, []);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    pcRef.current = pc;
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
    pc.onicecandidate = (e) => e.candidate && send({ t: "ice", candidate: e.candidate.toJSON() });
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        stopTone();
        if (sessionRef.current && sessionRef.current.phase !== "active") patch({ phase: "active", startedAt: Date.now() });
      } else if (st === "failed") {
        const id = sessionRef.current?.record.id;
        if (id) supabase.rpc("call_update", { p_call: id, p_action: "fail" });
        finish("Não foi possível manter a conexão");
      } else if (st === "disconnected") {
        later(() => {
          if (pcRef.current === pc && pc.connectionState === "disconnected") {
            const id = sessionRef.current?.record.id;
            if (id) supabase.rpc("call_update", { p_call: id, p_action: "end" });
            finish("Conexão perdida");
          }
        }, 8000);
      }
    };
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, stopTone, patch, supabase, finish]);

  const onSignal = useCallback(
    async (signal: Signal) => {
      const s = sessionRef.current;
      if (!s) return;
      try {
        if (signal.t === "ready" && s.role === "caller" && !pcRef.current) {
          stopTone();
          patch({ phase: "connecting" });
          const pc = createPeer();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ t: "offer", sdp: offer });
        } else if (signal.t === "offer" && s.role === "callee" && !gotOfferRef.current) {
          gotOfferRef.current = true;
          const pc = createPeer();
          await pc.setRemoteDescription(signal.sdp);
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ t: "answer", sdp: answer });
        } else if (signal.t === "answer" && s.role === "caller" && pcRef.current && !pcRef.current.remoteDescription) {
          await pcRef.current.setRemoteDescription(signal.sdp);
          await flushIce();
        } else if (signal.t === "ice") {
          if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(signal.candidate).catch(() => {});
          else pendingIce.current.push(signal.candidate);
        } else if (signal.t === "hangup") {
          finish("Chamada encerrada");
        }
      } catch {
        supabase.rpc("call_update", { p_call: s.record.id, p_action: "fail" });
        finish("Não foi possível conectar a chamada");
      }
    },
    [createPeer, flushIce, finish, patch, send, stopTone, supabase]
  );

  const openSignal = useCallback(
    (callId: string) =>
      new Promise<boolean>((resolve) => {
        const ch = supabase.channel(`call:${callId}`, { config: { private: true, broadcast: { self: false } } });
        ch.on("broadcast", { event: "signal" }, ({ payload }) => onSignal(payload as Signal));
        const giveUp = window.setTimeout(() => resolve(false), 10_000);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            window.clearTimeout(giveUp);
            resolve(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.clearTimeout(giveUp);
            resolve(false);
          }
        });
        channelRef.current = ch;
      }),
    [supabase, onSignal]
  );

  const getMedia = useCallback(async (kind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(kind, facingRef.current));
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ---------- ligar ----------
  const startCall = useCallback<CallsContext["startCall"]>(
    async ({ conversationId, peer, kind }) => {
      if (sessionRef.current) return flash("Você já está em uma chamada.");
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        return flash("Este navegador não suporta chamadas. Atualize o navegador ou use o Chrome.");
      }
      try {
        await getMedia(kind);
      } catch (err) {
        return flash(callErrorMessage(err));
      }
      const { data: id, error } = await supabase.rpc("call_start", { p_conversation: conversationId, p_kind: kind });
      if (error || !id) {
        cleanup();
        return flash(callErrorMessage(error));
      }
      update({
        role: "caller",
        phase: "outgoing",
        peer,
        record: {
          id: id as string,
          conversationId,
          callerId: meId ?? "",
          calleeId: peer.id,
          kind,
          status: "ringing",
          createdAt: new Date().toISOString(),
          answeredAt: null,
          endedAt: null,
        },
      });
      stopToneRef.current = playTone("ringback");
      if (!(await openSignal(id as string))) {
        supabase.rpc("call_update", { p_call: id as string, p_action: "fail" });
        return finish("Sem conexão com o servidor de chamadas");
      }
      later(() => {
        if (sessionRef.current?.record.id === id && sessionRef.current.phase === "outgoing") {
          supabase.rpc("call_update", { p_call: id as string, p_action: "miss" });
          finish("Sem resposta");
        }
      }, RING_TIMEOUT_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleanup, finish, flash, getMedia, meId, openSignal, supabase, update]
  );

  // ---------- receber ----------
  const showIncoming = useCallback(
    async (rec: CallRecord) => {
      if (sessionRef.current) return; // já em outra chamada: ela continua tocando só nos outros aparelhos
      const age = Date.now() - new Date(rec.createdAt).getTime();
      if (rec.status !== "ringing" || age > RING_TIMEOUT_MS) return;
      const { data: user } = await supabase.from("User").select(USER_CARD).eq("id", rec.callerId).maybeSingle();
      if (sessionRef.current) return;
      update({ role: "callee", phase: "incoming", record: rec, peer: (user as CallPeer | null) ?? { id: rec.callerId, name: "Chamada", avatarUrl: null } });
      stopToneRef.current = playTone("ringtone");
      later(() => {
        if (sessionRef.current?.record.id === rec.id && sessionRef.current.phase === "incoming") finish("Chamada perdida");
      }, Math.max(1000, RING_TIMEOUT_MS - age));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finish, supabase, update]
  );

  const accept = useCallback(
    async (audioOnly = false) => {
      const s = sessionRef.current;
      if (!s || s.phase !== "incoming") return;
      stopTone();
      const kind: CallKind = audioOnly ? "voice" : s.record.kind;
      try {
        await getMedia(kind);
      } catch (err) {
        flash(callErrorMessage(err));
        supabase.rpc("call_update", { p_call: s.record.id, p_action: "decline" });
        return finish("Chamada recusada");
      }
      patch({ phase: "connecting" });
      // Aceita antes de entrar no canal: o canal privado só libera chamadas tocando/atendidas.
      const { data: status } = await supabase.rpc("call_update", { p_call: s.record.id, p_action: "accept" });
      if (status !== "accepted") return finish("A chamada já foi encerrada");
      if (!(await openSignal(s.record.id))) {
        supabase.rpc("call_update", { p_call: s.record.id, p_action: "fail" });
        return finish("Sem conexão com o servidor de chamadas");
      }
      // Repete o "pronto" até a oferta chegar (cobre quem liga entrando no canal um pouco depois).
      let tries = 0;
      const ping = () => {
        if (gotOfferRef.current || !sessionRef.current || tries++ > 10) return;
        send({ t: "ready" });
        later(ping, 1500);
      };
      ping();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finish, flash, getMedia, openSignal, patch, send, stopTone, supabase]
  );

  const decline = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    supabase.rpc("call_update", { p_call: s.record.id, p_action: "decline" });
    stopTone();
    cleanup();
    update(null);
  }, [cleanup, stopTone, supabase, update]);

  const hangup = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (s.phase === "incoming") return decline();
    send({ t: "hangup" });
    supabase.rpc("call_update", { p_call: s.record.id, p_action: s.phase === "outgoing" ? "cancel" : "end" });
    finish(s.phase === "outgoing" ? "Chamada cancelada" : "Chamada encerrada");
  }, [decline, finish, send, supabase]);

  // ---------- realtime: chamadas recebidas e mudanças de estado ----------
  useEffect(() => {
    if (!meId) return;
    const onUpdate = (rec: CallRecord) => {
      const s = sessionRef.current;
      if (!s || s.record.id !== rec.id) return;
      if (s.role === "callee" && s.phase === "incoming" && rec.status !== "ringing") {
        stopTone();
        cleanup();
        update(null); // atendida/recusada em outro aparelho ou cancelada por quem ligou
        if (rec.status === "canceled" || rec.status === "missed") flash("Chamada perdida");
        return;
      }
      if (rec.status === "declined") finish("Chamada recusada");
      else if (rec.status === "ended" && s.phase !== "ended") finish("Chamada encerrada");
      else if (rec.status === "failed" && s.phase !== "ended") finish("Não foi possível conectar a chamada");
    };
    const ch = supabase
      .channel(`calls:${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Call", filter: `calleeId=eq.${meId}` }, (p) => showIncoming(p.new as CallRecord))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Call", filter: `calleeId=eq.${meId}` }, (p) => onUpdate(p.new as CallRecord))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Call", filter: `callerId=eq.${meId}` }, (p) => onUpdate(p.new as CallRecord))
      .subscribe();

    // Abriu o app pela notificação? Mostra a chamada que ainda está tocando.
    supabase
      .from("Call")
      .select("*")
      .eq("calleeId", meId)
      .eq("status", "ringing")
      .gt("createdAt", new Date(Date.now() - RING_TIMEOUT_MS).toISOString())
      .order("createdAt", { ascending: false })
      .limit(1)
      .then(({ data }) => data?.[0] && showIncoming(data[0] as CallRecord));

    return () => {
      supabase.removeChannel(ch);
    };
  }, [meId, supabase, showIncoming, cleanup, finish, flash, stopTone, update]);

  // Relógio da chamada ativa.
  useEffect(() => {
    if (session?.phase !== "active") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [session?.phase]);

  // Fechar a aba no meio da chamada avisa o outro lado.
  useEffect(() => {
    const onUnload = () => sessionRef.current && send({ t: "hangup" });
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [send]);

  // ---------- controles ----------
  const toggleMute = () => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  };
  const flipCamera = async () => {
    const stream = localRef.current;
    const oldTrack = stream?.getVideoTracks()[0];
    if (!stream || !oldTrack) return;
    facingRef.current = facingRef.current === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingRef.current } });
      const track = fresh.getVideoTracks()[0];
      await pcRef.current?.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track);
      stream.removeTrack(oldTrack);
      oldTrack.stop();
      stream.addTrack(track);
      track.enabled = !cameraOff;
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      flash("Não foi possível trocar de câmera.");
    }
  };

  const ctx = useMemo<CallsContext>(() => ({ startCall, inCall: !!session }), [startCall, session]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {session && (
        <CallScreen
          session={session}
          now={now}
          localStream={localStream}
          remoteStream={remoteStream}
          muted={muted}
          cameraOff={cameraOff}
          minimized={minimized}
          onMinimize={setMinimized}
          onAccept={accept}
          onDecline={decline}
          onHangup={hangup}
          onMute={toggleMute}
          onCamera={toggleCamera}
          onFlip={flipCamera}
        />
      )}
      {notice &&
        createPortal(
          <button
            type="button"
            role="alert"
            onClick={() => setNotice(null)}
            className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-white/10 bg-space-surface/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur md:bottom-6"
          >
            {notice}
          </button>,
          document.body
        )}
    </Ctx.Provider>
  );
}

/** Liga um MediaStream a um <video>/<audio>, inclusive quando o elemento é remontado. */
function useStreamRef<T extends HTMLMediaElement>(stream: MediaStream | null) {
  const [el, setEl] = useState<T | null>(null);
  useEffect(() => {
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      if (stream) el.play().catch(() => {});
    }
  }, [el, stream]);
  return setEl;
}

function PeerAvatar({ peer, size, ring }: { peer: CallPeer; size: number; ring?: boolean }) {
  return (
    <span className={clsx("relative flex items-center justify-center rounded-full", ring && "animate-pulse")} style={{ width: size, height: size }}>
      {ring && <span className="absolute inset-[-10px] rounded-full border border-orbit-purple/40" />}
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-orbit-gradient p-[3px] shadow-glow">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-space-card text-2xl font-semibold text-white/80">
          {peer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            peer.name.slice(0, 1).toUpperCase()
          )}
        </span>
      </span>
    </span>
  );
}

function RoundButton({
  label,
  onClick,
  tone = "neutral",
  active = false,
  size = "md",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger" | "accept";
  active?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full transition active:scale-95",
        size === "sm" ? "h-10 w-10" : "h-14 w-14",
        tone === "danger" && "bg-red-500 text-snow hover:bg-red-600",
        tone === "accept" && "bg-emerald-500 text-snow hover:bg-emerald-600",
        tone === "neutral" && (active ? "bg-snow text-[#03040b]" : "bg-snow/15 text-snow hover:bg-snow/25")
      )}
    >
      {children}
    </button>
  );
}

function CallScreen({
  session,
  now,
  localStream,
  remoteStream,
  muted,
  cameraOff,
  minimized,
  onMinimize,
  onAccept,
  onDecline,
  onHangup,
  onMute,
  onCamera,
  onFlip,
}: {
  session: Session;
  now: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  minimized: boolean;
  onMinimize: (v: boolean) => void;
  onAccept: (audioOnly?: boolean) => void;
  onDecline: () => void;
  onHangup: () => void;
  onMute: () => void;
  onCamera: () => void;
  onFlip: () => void;
}) {
  const { peer, phase, record } = session;
  const localVideo = useStreamRef<HTMLVideoElement>(localStream);
  const remoteVideo = useStreamRef<HTMLVideoElement>(remoteStream);
  const remoteAudio = useStreamRef<HTMLAudioElement>(remoteStream);
  const hasLocalVideo = !!localStream?.getVideoTracks().length;
  const hasRemoteVideo = !!remoteStream?.getVideoTracks().some((t) => t.readyState === "live");
  const isVideo = record.kind === "video";
  const showRemoteVideo = phase === "active" && hasRemoteVideo;

  const status =
    phase === "incoming"
      ? isVideo
        ? "Chamada de vídeo recebida"
        : "Chamada de voz recebida"
      : phase === "outgoing"
        ? "Chamando…"
        : phase === "connecting"
          ? "Conectando…"
          : phase === "active"
            ? formatDuration(((now - (session.startedAt ?? now)) / 1000))
            : session.endText ?? "Chamada encerrada";

  // ---------- chamada recebida ----------
  if (phase === "incoming") {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md md:items-center" role="dialog" aria-modal="true" aria-label="Chamada recebida">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-space-surface/95 p-6 text-center shadow-2xl">
          <div className="flex justify-center pt-2">
            <PeerAvatar peer={peer} size={96} ring />
          </div>
          <p className="mt-6 font-display text-xl font-bold text-white">{peer.name}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/60">
            {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />} {status}
          </p>
          <div className="mt-8 flex items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-2">
              <RoundButton label="Recusar" tone="danger" onClick={onDecline}>
                <PhoneOff className="h-6 w-6" />
              </RoundButton>
              <span className="text-xs text-white/60">Recusar</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RoundButton label="Atender" tone="accept" onClick={() => onAccept(false)}>
                {isVideo ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
              </RoundButton>
              <span className="text-xs text-white/60">Atender</span>
            </div>
          </div>
          {isVideo && (
            <button type="button" onClick={() => onAccept(true)} className="mt-5 text-xs font-medium text-orbit-cyan hover:underline">
              Atender só com áudio
            </button>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // ---------- chamada em andamento (tela cheia ou minimizada) ----------
  return createPortal(
    <div
      role="dialog"
      aria-label={`Chamada com ${peer.name}`}
      className={clsx(
        "fixed z-[60] overflow-hidden bg-[#03040b] text-snow shadow-2xl",
        minimized
          ? "bottom-24 left-3 h-44 w-36 rounded-2xl border border-snow/15 md:bottom-6 md:left-auto md:right-24 md:h-48 md:w-64"
          : "inset-0"
      )}
    >
      {/* fundo: vídeo da outra pessoa ou avatar */}
      <video ref={remoteVideo} muted playsInline autoPlay className={clsx("absolute inset-0 h-full w-full object-cover", !showRemoteVideo && "hidden")} />
      <audio ref={remoteAudio} autoPlay className="hidden" />
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18),transparent_65%)]">
          <PeerAvatar peer={peer} size={minimized ? 56 : 120} ring={phase === "outgoing" || phase === "connecting"} />
          {!minimized && (
            <>
              <p className="mt-7 font-display text-2xl font-bold">{peer.name}</p>
              <p className="mt-1.5 text-sm text-snow/60">{status}</p>
            </>
          )}
        </div>
      )}

      {/* topo: nome + tempo (com vídeo) e minimizar */}
      {!minimized && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className={clsx(!showRemoteVideo && "invisible")}>
            <p className="font-semibold">{peer.name}</p>
            <p className="text-xs text-snow/70">{status}</p>
          </div>
          {phase !== "ended" && (
            <button type="button" onClick={() => onMinimize(true)} aria-label="Minimizar chamada" title="Minimizar" className="rounded-full bg-snow/10 p-2.5 transition hover:bg-snow/20">
              <Minimize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* minha câmera (picture-in-picture) */}
      {hasLocalVideo && !minimized && (
        <video
          ref={localVideo}
          muted
          playsInline
          autoPlay
          className={clsx(
            "absolute right-4 top-20 aspect-[3/4] w-28 rounded-2xl border border-snow/20 bg-black object-cover shadow-xl md:w-40",
            facingMirror(localStream) && "-scale-x-100",
            cameraOff && "opacity-0"
          )}
        />
      )}

      {/* controles */}
      {minimized ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2">
          <span className="min-w-0 truncate px-1 text-[11px] text-snow/80">{status}</span>
          <div className="flex gap-1.5">
            <RoundButton label="Expandir chamada" size="sm" onClick={() => onMinimize(false)}>
              <Maximize2 className="h-4 w-4" />
            </RoundButton>
            <RoundButton label="Encerrar" tone="danger" size="sm" onClick={onHangup}>
              <PhoneOff className="h-4 w-4" />
            </RoundButton>
          </div>
        </div>
      ) : (
        phase !== "ended" && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
            <RoundButton label={muted ? "Ativar microfone" : "Desativar microfone"} active={muted} onClick={onMute}>
              {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </RoundButton>
            {hasLocalVideo && (
              <RoundButton label={cameraOff ? "Ligar câmera" : "Desligar câmera"} active={cameraOff} onClick={onCamera}>
                {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </RoundButton>
            )}
            {hasLocalVideo && (
              <RoundButton label="Trocar câmera" onClick={onFlip}>
                <SwitchCamera className="h-6 w-6" />
              </RoundButton>
            )}
            <RoundButton label="Encerrar chamada" tone="danger" onClick={onHangup}>
              <PhoneOff className="h-6 w-6" />
            </RoundButton>
          </div>
        )
      )}
    </div>,
    document.body
  );
}

/** A câmera frontal aparece espelhada (como um espelho), a traseira não. */
function facingMirror(stream: MediaStream | null) {
  const facing = stream?.getVideoTracks()[0]?.getSettings().facingMode;
  return !facing || facing === "user";
}
