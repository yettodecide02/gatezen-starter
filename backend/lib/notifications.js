import { Expo } from "expo-server-sdk";

const expo = new Expo();

/**
 * Send a push notification to a single Expo push token.
 * @param {string} pushToken
 * @param {string} title
 * @param {string} body
 * @param {object} data  - optional extra payload (for deep linking)
 */
export async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  // Intercom call notifications must arrive immediately even in doze/background.
  // priority:"high" maps to FCM high-priority (wakes the device).
  // ttl:0 means discard if not delivered instantly (stale call alerts are useless).
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
        priority: isCall ? "high" : "normal",
        ttl: isCall ? 30 : 3600,
      },
    ]);

    // Inspect the ticket immediately — status "error" means Expo could not
    // forward to FCM. Most common cause: FCM v1 credentials not uploaded to
    // the Expo project. Fix: `npx eas credentials -p android` → Upload FCM v1 key.
    for (const ticket of tickets) {
      if (ticket.status === "error") {
        console.error(
          "[Push] Expo ticket error:",
          ticket.message,
          ticket.details,
        );
        if (ticket.details?.error === "DeviceNotRegistered") {
          console.warn("[Push] Stale token — should clear from DB:", pushToken);
        }
      } else {
        console.log("[Push] Ticket OK:", ticket.id ?? ticket.status, pushToken);
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
  }));
  console.log(validTokens);

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      console.log(messages);
    } catch (error) {
      console.error("Bulk push notification error:", error);
    }
  }
}
