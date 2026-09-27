import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE = /^[A-Za-z0-9_-]{8,64}$/;
const VISIBILITY = new Set(["visible", "blurred", "hidden"]);
const DEVICE_TYPES = new Set(["desktop", "mobile", "tablet", "app"]);

type Body = {
  action?: "heartbeat" | "end" | "signout";
  sessionId?: string;
  deviceId?: string;
  deviceType?: string;
  visibilityState?: string;
  lastActivityAt?: string;
  timestamp?: number;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Presence signals from an open Órbita X tab. The browser only reports what it sees
 * (visibility, last interaction); the database decides online / away / offline.
 * The user always comes from the validated login, never from the request body.
 */
export async function POST(req: NextRequest) {
  // Only pages of Órbita X itself may send presence signals (defense in depth on top of SameSite cookies).
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = "invalid";
  }
  if (originHost && host && originHost !== host) return json({ error: "forbidden_origin" }, 403);
  const raw = await req.text();
  if (raw.length > 2048) return json({ error: "payload_too_large" }, 413);
  let body: Body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const supabase = createClient();
  // getUser() checks the token with Supabase Auth, so an expired or revoked login is refused here.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);

  const sessionId = typeof body.sessionId === "string" && UUID.test(body.sessionId) ? body.sessionId : null;
  const action = body.action ?? "heartbeat";

  if (action === "signout") {
    const { data, error } = await supabase.rpc("presence_sign_out", { p_session: sessionId });
    return error ? json({ error: "failed" }, 500) : json({ status: data ?? "offline" });
  }

  if (!sessionId) return json({ error: "invalid_session" }, 400);

  if (action === "end") {
    const { data, error } = await supabase.rpc("presence_end_session", { p_session: sessionId });
    return error ? json({ error: "failed" }, 500) : json({ status: data ?? "offline" });
  }

  const deviceId = typeof body.deviceId === "string" && DEVICE.test(body.deviceId) ? body.deviceId : null;
  if (!deviceId) return json({ error: "invalid_device" }, 400);
  const visibility = typeof body.visibilityState === "string" && VISIBILITY.has(body.visibilityState) ? body.visibilityState : "hidden";
  const deviceType = typeof body.deviceType === "string" && DEVICE_TYPES.has(body.deviceType) ? body.deviceType : "desktop";
  const activity = typeof body.lastActivityAt === "string" && !Number.isNaN(Date.parse(body.lastActivityAt)) ? new Date(body.lastActivityAt).toISOString() : null;

  const { data, error } = await supabase.rpc("presence_heartbeat", {
    p_session: sessionId,
    p_device: deviceId,
    p_device_type: deviceType,
    p_visibility: visibility,
    p_last_activity: activity,
  });
  if (error) {
    if (/session_mismatch/.test(error.message)) return json({ error: "session_mismatch" }, 409);
    if (/too_many_sessions/.test(error.message)) return json({ error: "too_many_sessions" }, 429);
    if (/not_authenticated/.test(error.message)) return json({ error: "not_authenticated" }, 401);
    return json({ error: "failed" }, 500);
  }
  return json(data);
}
