/**
 * Web Push notification utility.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   – base64url-encoded public key
 *   VAPID_PRIVATE_KEY  – base64url-encoded private key
 *   VAPID_SUBJECT      – "mailto:admin@example.com" or app URL
 *
 * Generate keys once:
 *   npx web-push generate-vapid-keys
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@resqio.local";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to a specific agent (all their subscriptions).
 */
export async function sendPushToAgent(
  agentId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { agentId },
  });

  const data = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404 or 410 = subscription expired/invalid → remove
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
        log.warn(`Push to ${sub.endpoint.slice(0, 50)}... failed: ${statusCode}`);
      }
    })
  );
}

/**
 * Send a push notification to all watchers of a ticket.
 * Optionally exclude one agent (e.g. the one who made the change).
 */
export async function sendPushToWatchers(
  ticketId: string,
  payload: PushPayload,
  excludeAgentId?: string
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const watchers = await prisma.ticketWatcher.findMany({
    where: { ticketId },
    select: { agentId: true },
  });

  await Promise.allSettled(
    watchers
      .filter((w) => w.agentId !== excludeAgentId)
      .map((w) => sendPushToAgent(w.agentId, payload))
  );
}
