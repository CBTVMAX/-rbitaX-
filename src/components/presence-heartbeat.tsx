"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { setSelfPresence } from "@/lib/presence-live";

const HEARTBEAT_MS = 30_000; // server marks a session offline after ~90 s without one
const BLUR_GRACE_MS = 60_000; // window unfocused for a minute counts as "not looking"
const ACTIVITY_THROTTLE_MS = 5_000;
const ENDPOINT = "/api/presence/heartbeat";

// One session per open tab (a reload is a new session; the old one simply expires).
let sessionId = "";
const newSession = () => (sessionId = crypto.randomUUID());

function deviceId() {
  try {
    let id = localStorage.getItem("orbitax-device-id");
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem("orbitax-device-id", id);
    }
    return id;
  } catch {
    return `tmp${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  }
}

function deviceType() {
  const ua = navigator.userAgent;
  if (/android.+wv|; wv\)/i.test(ua) || window.matchMedia?.("(display-mode: standalone)").matches) return "app";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Tells the server this tab is open and how it is being used. It never claims "online":
 * it only reports visibility and the time of the last real interaction; the database
 * computes online / away / offline and publishes it to everyone else.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    const device = deviceId();
    const type = deviceType();
    let userId: string | null = null;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActivity = Date.now();
    let lastSentVisibility = "";
    let lastStatus = "";
    let blurredAt: number | null = document.hasFocus() ? null : Date.now();
    let inFlight = false;
    let disposed = false;
    if (!sessionId) newSession();

    const visibility = () => {
      if (document.visibilityState === "hidden") return "hidden";
      if (blurredAt !== null && Date.now() - blurredAt >= BLUR_GRACE_MS) return "blurred";
      return "visible";
    };

    const schedule = (ms = HEARTBEAT_MS) => {
      if (timer) clearTimeout(timer);
      if (running) timer = setTimeout(() => send(), ms);
    };

    async function send(action: "heartbeat" | "end" = "heartbeat", keepalive = false) {
      if (!running && action === "heartbeat") return;
      if (action === "heartbeat" && (inFlight || !navigator.onLine)) return schedule();
      const vis = visibility();
      const body = JSON.stringify({
        action,
        sessionId,
        deviceId: device,
        deviceType: type,
        visibilityState: vis,
        lastActivityAt: new Date(lastActivity).toISOString(),
        timestamp: Date.now(),
      });
      inFlight = action === "heartbeat";
      try {
        const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive, credentials: "same-origin", cache: "no-store" });
        if (action !== "heartbeat") return;
        lastSentVisibility = vis;
        if (res.status === 401) return stop(); // logged out or login expired
        if (res.status === 409) newSession(); // this tab's id belongs to another account (account switch)
        if (res.ok) {
          const data = (await res.json()) as { status?: string; public?: string };
          if (data.status && userId) {
            lastStatus = data.status; // real activity state (drives "back from idle")
            setSelfPresence(userId, data.public ?? data.status); // what everyone else sees
          }
        }
      } catch {
        // No connection: the server will time this session out; we retry on the next beat / "online".
      } finally {
        if (action === "heartbeat") {
          inFlight = false;
          schedule();
        }
      }
    }

    function start(id: string) {
      if (disposed || (running && userId === id)) return;
      userId = id;
      running = true;
      send();
    }

    function stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    }

    // Real interaction only updates memory; it travels with the next heartbeat.
    // Coming back from idle/away sends right away so the status flips to Online quickly.
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity < ACTIVITY_THROTTLE_MS) return;
      lastActivity = now;
      if (blurredAt !== null && document.hasFocus()) blurredAt = null;
      if (running && lastStatus !== "online" && visibility() === "visible") send();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastActivity = Date.now();
        if (document.hasFocus()) blurredAt = null;
      }
      if (running && visibility() !== lastSentVisibility) send();
    };

    const onFocus = () => {
      blurredAt = null;
      if (blurTimer) clearTimeout(blurTimer);
      lastActivity = Date.now();
      if (running && lastSentVisibility !== "visible") send();
    };

    const onBlur = () => {
      blurredAt = Date.now();
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        if (running && visibility() === "blurred" && lastSentVisibility !== "blurred") send();
      }, BLUR_GRACE_MS + 500);
    };

    const onOnline = () => running && send();
    // Best effort only — the server timeout is what guarantees Offline.
    const onPageHide = () => running && send("end", true);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && running) send();
    };

    const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "wheel"] as const;
    activityEvents.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) start(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) stop();
      else if (session.user.id !== userId) {
        if (userId) newSession();
        start(session.user.id);
      }
    });

    return () => {
      disposed = true;
      stop();
      sub.subscription.unsubscribe();
      if (blurTimer) clearTimeout(blurTimer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}

/** Call before supabase.auth.signOut(): every tab of this login goes offline immediately. */
export async function endPresenceForSignOut() {
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout", sessionId: sessionId || undefined }),
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // The session will time out anyway.
  }
}
