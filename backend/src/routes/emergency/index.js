import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { checkFeature } from "../../middleware/checkFeature.js";
import { sendBulkPushNotifications } from "../../../lib/notifications.js";

const router = express.Router();
router.use(authMiddleware);

// POST /emergency/sos
// Broadcasts SOS to all admins and gatekeepers in the community
router.post("/sos", checkFeature("SOS_ALERT"), async (req, res) => {
  const { userId, communityId, name, unitNumber, blockName } = req.body;

  if (!userId || !communityId || !name) {
    return res
      .status(400)
      .json({ error: "userId, communityId and name are required" });
  }

  try {
    const alert = await prisma.emergencyAlert.create({
      data: { userId, communityId, name, unitNumber, blockName },
    });

    // Notify all admins and gatekeepers in the community
    const staff = await prisma.user.findMany({
      where: {
        communityId,
        role: { in: ["ADMIN", "GATEKEEPER"] },
        pushToken: { not: null },
      },
      select: { pushToken: true },
    });

    const tokens = staff.map((u) => u.pushToken).filter(Boolean);
    const locationLabel =
      blockName && unitNumber
        ? `${blockName} - Unit ${unitNumber}`
        : unitNumber || blockName || "unknown location";

    await sendBulkPushNotifications(
      tokens,
      "🚨 SOS Alert",
      `${name} (${locationLabel}) needs immediate assistance`,
      { type: "SOS", alertId: alert.id, communityId },
    );

    res.status(201).json({ id: alert.id });
  } catch (error) {
    console.error("Error creating SOS alert:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /emergency/alerts?userId&communityId
router.get("/alerts", checkFeature("SOS_ALERT"), async (req, res) => {
  const { userId, communityId } = req.query;
  if (!userId || !communityId) {
    return res
      .status(400)
      .json({ error: "userId and communityId are required" });
  }
  try {
    const alerts = await prisma.emergencyAlert.findMany({
      where: { userId, communityId },
      orderBy: { createdAt: "desc" },
    });
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching emergency alerts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /emergency/alerts/:id/cancel
router.patch("/alerts/:id/cancel", checkFeature("SOS_ALERT"), async (req, res) => {
  const { id } = req.params;
  try {
    const alert = await prisma.emergencyAlert.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    if (alert.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ error: "Only ACTIVE alerts can be cancelled" });
    }
    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error cancelling alert:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
