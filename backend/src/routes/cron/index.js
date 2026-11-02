import crypto from "crypto";
import express from "express";
import prisma from "../../../lib/prisma.js";
import {
  sendPushNotification,
  checkPendingReceipts,
} from "../../../lib/notifications.js";

const router = express.Router();

function safeCronSecretCompare(provided, expected) {
  if (!provided || !expected) return false;
  const pBuf = Buffer.from(provided);
  const eBuf = Buffer.from(expected);
  if (pBuf.length !== eBuf.length) return false;
  return crypto.timingSafeEqual(pBuf, eBuf);
}

// Track notified booking IDs to guarantee idempotency across sliding windows
const notifiedBookings = new Set();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    // Clear once daily to release memory
    notifiedBookings.clear();
  }, 24 * 60 * 60 * 1000).unref?.();
}

/**
 * GET /cron/booking-reminder
 * Called every minute by Vercel Cron (or an external scheduler).
 * Notifies residents whose facility booking starts within the next 15 minutes.
 * Protected by a shared secret so only the scheduler can call it.
 */
router.get("/booking-reminder", async (req, res) => {
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers["authorization"];
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const secret =
    bearerSecret || req.headers["x-cron-secret"] || req.query.secret;
  if (!safeCronSecretCompare(secret, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000); // 15 min lookahead

    // Find confirmed bookings starting in the next 15 minutes that haven't been notified yet
    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        user: { select: { pushToken: true, name: true } },
        facility: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const booking of bookings) {
      if (notifiedBookings.has(booking.id)) {
        continue;
      }

      if (booking.user?.pushToken) {
        await sendPushNotification(
          booking.user.pushToken,
          "⏰ Booking Starting Soon",
          `Your ${booking.facility.name} booking starts soon!`,
          { type: "BOOKING_REMINDER", bookingId: booking.id },
        );
        sent++;
      }
      notifiedBookings.add(booking.id);
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    console.error("Booking reminder cron error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /cron/check-receipts
 * Checks Expo push receipts for all pending ticket IDs and auto-clears
 * DeviceNotRegistered tokens from the DB.
 * Call this ~60-120 seconds after any notification send (e.g. every 2 minutes).
 */
router.post("/check-receipts", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const secret =
    bearerSecret || req.headers["x-cron-secret"] || req.query.secret;
  if (!safeCronSecretCompare(secret, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await checkPendingReceipts();
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error("check-receipts cron error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
