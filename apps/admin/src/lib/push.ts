import { apiClient } from "@/lib/api";

/** Where the one service worker lives. Registered by `<ServiceWorker />`. */
export const SERVICE_WORKER_URL = "/sw.js";

/**
 * Every way the toggle can end up, kept apart because they want different
 * words on screen. `disabled` is the server having no VAPID key configured —
 * not a failure, and not something the user can act on, so the affordance
 * hides rather than erroring at them.
 */
export type PushResult =
  | { status: "ok"; subscribed: boolean }
  | { status: "unsupported" }
  | { status: "disabled" }
  | { status: "denied" }
  | { status: "error"; message: string };

/**
 * Push needs three separate browser features, and iOS only grants them to an
 * installed PWA. Checked before anything else so an unsupported browser gets a
 * hidden control instead of a thrown `TypeError`.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * The VAPID key, fetched at runtime rather than compiled in — see
 * `packages/env/src/admin.server.ts` for why it is deliberately not an env
 * var here. An empty string means push is off server-side.
 */
async function readPublicKey(): Promise<
  | { status: "ok"; publicKey: string }
  | { status: "disabled" }
  | { status: "error"; message: string }
> {
  let result;
  try {
    result = await apiClient.GET("/v1/admin/push/public-key");
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "error desconegut",
    };
  }

  if (result.error || !result.data) {
    return {
      status: "error",
      message: `l'api ha respost ${result.response.status}`,
    };
  }

  if (result.data.publicKey === "") return { status: "disabled" };
  return { status: "ok", publicKey: result.data.publicKey };
}

/** True when the server has a VAPID key, so the toggle is worth showing. */
export async function isPushConfigured(): Promise<boolean> {
  return (await readPublicKey()).status === "ok";
}

/** The standard base64url → bytes conversion `PushManager` insists on. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

/** This browser's existing subscription, if the worker is already running. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Reads the browser's `PushSubscription` into the API's request body. The
 * keys only exist on the JSON form, never on the object itself.
 */
function toSubscribeBody(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (
    json.endpoint === undefined ||
    p256dh === undefined ||
    auth === undefined
  ) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
    userAgent: navigator.userAgent,
  };
}

/**
 * Permission prompt, subscribe, register with the API — in that order, and
 * only ever from a click. Asking on load is what gets a site's notifications
 * permanently blocked.
 */
export async function enablePush(): Promise<PushResult> {
  if (!isPushSupported()) return { status: "unsupported" };

  const key = await readPublicKey();
  if (key.status !== "ok") return key;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key.publicKey),
    });

    const body = toSubscribeBody(subscription);
    if (body === null) {
      return { status: "error", message: "la subscripció no té claus" };
    }

    const result = await apiClient.POST("/v1/admin/push/subscribe", { body });
    if (result.error || !result.data) {
      return {
        status: "error",
        message: `l'api ha respost ${result.response.status}`,
      };
    }

    return { status: "ok", subscribed: true };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "error desconegut",
    };
  }
}

/**
 * Drops the browser subscription first, then tells the API. That order means a
 * failed request leaves a stale row the API prunes on its next 410, rather
 * than a live subscription the user believes they turned off.
 */
export async function disablePush(): Promise<PushResult> {
  if (!isPushSupported()) return { status: "unsupported" };

  try {
    const subscription = await currentSubscription();
    if (subscription === null) return { status: "ok", subscribed: false };

    const { endpoint } = subscription;
    await subscription.unsubscribe();

    const result = await apiClient.POST("/v1/admin/push/unsubscribe", {
      body: { endpoint },
    });
    if (result.error) {
      return {
        status: "error",
        message: `l'api ha respost ${result.response.status}`,
      };
    }

    return { status: "ok", subscribed: false };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "error desconegut",
    };
  }
}
