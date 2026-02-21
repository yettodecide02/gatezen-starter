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

  try {
    const ticket = await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
      },
    ]);
    console.log(ticket, pushToken);
    
    return ticket;
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
