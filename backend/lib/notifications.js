import { Expo } from "expo-server-sdk";
import prisma from "./prisma.js";

const expo = new Expo();

// In-process store of (receiptId → pushToken) for pending receipt checks.
// Populated when a ticket comes back OK; drained by checkPendingReceipts().
const pendingReceipts = new Map();
export { pendingReceipts };

/**
 * Clear a stale push token from the DB so the user stops getting failed
 * delivery attempts.
 * @param {string} pushToken
 */
async function clearStaleToken(pushToken) {
  try {
    await prisma.user.updateMany({
      where: { pushToken },
      data: { pushToken: null },
    });
    console.warn("[Push] Cleared stale token from DB:", pushToken);
  } catch (e) {
    console.error("[Push] Failed to clear stale token:", e);
  }
}

/**
 * Send a push notification to a single Expo push token.
 * All messages use priority "high" so Android Doze never defers them on
 * production/preview builds (unlike debug builds which are battery-exempt).
 * @param {string} pushToken
 * @param {string} title
 * @param {string} body
 * @param {object} data  - optional extra payload (for deep linking)
 */
export async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  const isCall = data?.type === "INTERCOM_CALL";

  try {
    const tickets = await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
        channelId: "default",
        // Always high: production/preview APKs are not battery-exempt, so
        // normal-priority FCM messages are deferred indefinitely by Android Doze.
        priority: "high",
        ttl: isCall ? 30 : 3600,
      },
    ]);

    for (const ticket of tickets) {
      if (ticket.status === "error") {
        console.error(
          "[Push] Ticket error:",
          ticket.message,
          ticket.details,
          "token:",
          pushToken,
        );
        if (ticket.details?.error === "DeviceNotRegistered") {
          await clearStaleToken(pushToken);
        }
      } else {
        console.log("[Push] Ticket OK:", ticket.id, "token:", pushToken);
        if (ticket.id) pendingReceipts.set(ticket.id, pushToken);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

/**
 * Send a push notification to multiple Expo push tokens in bulk.
 * @param {string[]} pushTokens
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
export async function sendBulkPushNotifications(
  pushTokens,
  title,
  body,
  data = {},
) {
  const validTokens = (pushTokens || []).filter((t) => Expo.isExpoPushToken(t));
  if (!validTokens.length) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    channelId: "default",
    priority: "high",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = chunk[i].to;
        if (ticket.status === "error") {
          console.error(
            "[Push] Bulk ticket error:",
            ticket.message,
            ticket.details,
            "token:",
            token,
          );
          if (ticket.details?.error === "DeviceNotRegistered") {
            await clearStaleToken(token);
          }
        } else {
          console.log(
            "[Push] Bulk ticket OK:",
            ticket.id ?? ticket.status,
            "token:",
            token,
          );
          if (ticket.id) pendingReceipts.set(ticket.id, token);
        }
      }
    } catch (error) {
      console.error("Bulk push notification error:", error);
    }
  }
}

/**
 * Check Expo push receipts for all pending ticket IDs.
 * Receipts are the async second step of Expo's push pipeline and carry
 * the real FCM/APNs delivery status. Call this ~60-120 seconds after
 * notifications are sent (e.g. from a cron job).
 * @returns {{ checked: number, errors: number }}
 */
export async function checkPendingReceipts() {
  if (!pendingReceipts.size) return { checked: 0, errors: 0 };

  // Snapshot and clear the queue atomically so concurrent sends can keep populating it
  const entries = [...pendingReceipts.entries()];
  pendingReceipts.clear();
  const tokenByReceiptId = new Map(entries);
  const receiptIds = entries.map(([id]) => id);
  let errors = 0;

  try {
    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of receiptChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [receiptId, receipt] of Object.entries(receipts)) {
        const pushToken = tokenByReceiptId.get(receiptId);
        if (receipt.status === "error") {
          errors++;
          console.error(
            "[Push Receipt] Error:",
            receipt.message,
            receipt.details,
            "token:",
            pushToken,
          );
          if (receipt.details?.error === "DeviceNotRegistered" && pushToken) {
            await clearStaleToken(pushToken);
          }
        } else {
          console.log("[Push Receipt] OK:", receiptId, "token:", pushToken);
        }
      }
    }
  } catch (e) {
    console.error("[Push Receipt] checkPendingReceipts error:", e);
  }

  return { checked: entries.length, errors };
}
