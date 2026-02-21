import express from "express";
import prisma from "../../../lib/prisma.js";
import { sendPushNotification } from "../../../lib/notifications.js";

const router = express.Router();

/**
 * GET /cron/booking-reminder
 * Called every minute by Vercel Cron (or an external scheduler).
 * Notifies residents whose facility booking starts within the next 10 minutes.
 * Protected by a shared secret so only the scheduler can call it.
 */
router.get("/booking-reminder", async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now
    const windowStart = new Date(now.getTime() + 9 * 60 * 1000); // 9 min from now (1-min window to avoid double-sending)

    // Find confirmed bookings starting in the 9-10 minute window
    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: {
          gte: windowStart,
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
      if (booking.user?.pushToken) {
        await sendPushNotification(
          booking.user.pushToken,
          "⏰ Booking Starting Soon",
          `Your ${booking.facility.name} booking starts in 10 minutes`,
          { type: "BOOKING_REMINDER", bookingId: booking.id },
        );
        sent++;
      }
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    console.error("Booking reminder cron error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
