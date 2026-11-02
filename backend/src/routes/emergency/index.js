import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { sendPushNotification } from "../../../lib/notifications.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /emergency/sos
 * Trigger a high-priority emergency distress signal across the community.
 */
router.post("/sos", async (req, res) => {
  try {
    const communityId = req.user.communityId;
    const userId = req.user.id;
    const { message, unitNumber, blockName } = req.body;

    if (!communityId) {
      return res.status(400).json({ error: "User is not associated with a community" });
    }

    // Fetch user details to prevent untrusted client payload spoofing
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        unit: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
      },
    });

    const residentName = user?.name || req.body.userName || "Resident";
    const resolvedUnitNumber = user?.unit?.number || unitNumber || "N/A";
    const resolvedBlockName = user?.unit?.block?.name || blockName || "";

    const alert = await prisma.emergencyAlert.create({
      data: {
        userId,
        communityId,
        name: residentName,
        unitNumber: resolvedUnitNumber,
        blockName: resolvedBlockName,
        status: "ACTIVE",
      },
    });

    // Notify all gatekeepers and admins in the same community
    try {
      const securityAndAdmins = await prisma.user.findMany({
        where: {
          communityId,
          role: { in: ["ADMIN", "GATEKEEPER"] },
          pushToken: { not: null },
        },
        select: { pushToken: true },
      });

      const alertBody = `${residentName} (Unit ${resolvedUnitNumber}) triggered an emergency SOS alert: ${message || "Immediate assistance required"}`;
      for (const recipient of securityAndAdmins) {
        if (recipient.pushToken) {
          sendPushNotification(
            recipient.pushToken,
            "EMERGENCY SOS ALERT",
            alertBody,
            {
              type: "EMERGENCY_SOS",
              alertId: alert.id,
              userId,
              unitNumber: resolvedUnitNumber,
            }
          ).catch((e) => console.error("[SOS Push Error]:", e));
        }
      }
    } catch (pushErr) {
      console.error("[SOS Push Dispatch Failed]:", pushErr);
    }

    return res.status(201).json({
      success: true,
      id: alert.id,
      alertId: alert.id,
      status: "active",
      alert,
    });
  } catch (error) {
    console.error("Error creating emergency alert:", error);
    return res.status(500).json({ error: "Failed to create emergency alert" });
  }
});

/**
 * GET /emergency/alerts
 * List recent emergency alerts for the user's community.
 */
router.get("/alerts", async (req, res) => {
  try {
    const communityId = req.user.communityId;
    if (!communityId) {
      return res.status(400).json({ error: "Missing community context" });
    }

    const alerts = await prisma.emergencyAlert.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error("Error fetching emergency alerts:", error);
    return res.status(500).json({ error: "Failed to fetch emergency alerts" });
  }
});

/**
 * PATCH /emergency/alerts/:id/cancel
 * Cancel an active emergency alert.
 */
router.patch("/alerts/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.emergencyAlert.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Alert not found" });
    }

    // Tenant and ownership isolation
    if (existing.communityId !== req.user.communityId) {
      return res.status(403).json({ error: "Forbidden: Cross-community access denied" });
    }

    if (
      existing.userId !== req.user.id &&
      req.user.role !== "ADMIN" &&
      req.user.role !== "GATEKEEPER"
    ) {
      return res.status(403).json({ error: "Forbidden: Only creator or staff can cancel alert" });
    }

    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Alert cancelled successfully",
      alert: updated,
    });
  } catch (error) {
    console.error("Error cancelling emergency alert:", error);
    return res.status(500).json({ error: "Failed to cancel emergency alert" });
  }
});

export default router;
