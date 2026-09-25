// Browser side of push notifications (used only from client components).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
export type PushStatus = "unsupported" | "default" | "denied" | "enabled";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js");
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "default";
  const sub = await (await registration()).pushManager.getSubscription();
  return sub ? "enabled" : "default";
}

async function subscribeAndSave(supabase: Client) {
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data: key } = await supabase.rpc("push_public_key");
    if (!key) throw new Error("push key unavailable");
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key as string),
    });
  }
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/** Asks permission (must be called from a tap/click) and registers this device. */
export async function enablePush(supabase: Client): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";
  await subscribeAndSave(supabase);
  return "enabled";
}

/** Keeps this device registered for the signed-in account when permission was already given. */
export async function syncPush(supabase: Client) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    await subscribeAndSave(supabase);
  } catch {
    /* ignore: next visit tries again */
  }
}

/** Stops notifications on this device (also used when logging out). */
export async function disablePush(supabase: Client) {
  if (!pushSupported()) return;
  try {
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) return;
    await supabase.rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}
