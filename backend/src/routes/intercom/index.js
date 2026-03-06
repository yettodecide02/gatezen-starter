import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { checkFeature } from "../../middleware/checkFeature.js";
import { sendPushNotification } from "../../../lib/notifications.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /intercom/gatekeeper?communityId=…
 * Returns the on-duty gatekeeper for a community.
 * Used by residents to look up who to call for R2G intercom.
 */
router.get("/gatekeeper", checkFeature("E_INTERCOM"), async (req, res) => {
  try {
    const communityId = req.query.communityId || req.user.communityId;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    const gatekeeper = await prisma.user.findFirst({
      where: {
        role: "GATEKEEPER",
        status: "APPROVED",
        communityId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });

    if (!gatekeeper) {
      return res.status(404).json({ error: "No gatekeeper found" });
    }

    res.json({ gatekeeper });
  } catch (error) {
    console.error("Error fetching gatekeeper for intercom:", error);
    res.status(500).json({ error: "Failed to fetch gatekeeper" });
  }
});

/**
 * GET /intercom/directory?communityId=…
 * Returns the list of residents in a community for R2R intercom.
 * Accessible by both residents (R2R) and gatekeepers (G2R).
 */
router.get("/directory", checkFeature("E_INTERCOM"), async (req, res) => {
  try {
    const communityId = req.query.communityId || req.user.communityId;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    const residents = await prisma.user.findMany({
      where: {
        role: "RESIDENT",
        status: "APPROVED",
        communityId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        unit: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { unit: { block: { name: "asc" } } },
        { unit: { number: "asc" } },
        { name: "asc" },
      ],
    });

    const data = residents.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || null,
      unitNumber: r.unit?.number || null,
      blockName: r.unit?.block?.name || null,
    }));

    res.json({ residents: data });
  } catch (error) {
    console.error("Error fetching intercom directory:", error);
    res.status(500).json({ error: "Failed to fetch directory" });
  }
});

/**
 * POST /intercom/notify
 * Sends a push notification to the call receiver so they get an alert
 * even when their app is running in the background or is closed.
 * Body: { receiverId, callerName, callId, callType, callerUnit?, callerBlock? }
 */
router.post("/notify", checkFeature("E_INTERCOM"), async (req, res) => {
  try {
    const {
      receiverId,
      callerName,
      callId,
      callType,
      callerUnit,
      callerBlock,
    } = req.body;

    if (!receiverId || !callId) {
      return res
        .status(400)
        .json({ error: "receiverId and callId are required" });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { pushToken: true },
    });

    if (!receiver?.pushToken) {
      return res.json({ sent: false, reason: "No push token registered" });
    }

    const subtitle = [
      callerUnit ? `Unit ${callerUnit}` : null,
      callerBlock ? `Block ${callerBlock}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    await sendPushNotification(
      receiver.pushToken,
      "📞 Incoming Call",
      `${callerName}${subtitle ? ` (${subtitle})` : ""}`,
      { type: "INTERCOM_CALL", callId, callType },
    );

    res.json({ sent: true });
  } catch (error) {
    console.error("Error sending intercom call notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
