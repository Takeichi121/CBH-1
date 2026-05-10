import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "admin@cbh.local";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
} else {
  console.warn("[Push] VAPID keys not configured — push notifications disabled");
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
): Promise<{ ok: boolean; gone?: boolean }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { ok: false };
  }
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, gone: true };
    }
    console.error("[Push] sendNotification error:", err.message);
    return { ok: false };
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
