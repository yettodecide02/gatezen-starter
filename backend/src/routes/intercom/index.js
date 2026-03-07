import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { sendPushNotification } from "../../../lib/notifications.js";

const router = express.Router();

router.use(authMiddleware);

// GET /intercom/gatekeeper?communityId={id}
// Returns the on-duty gatekeeper for the given community.
router.get("/gatekeeper", async (req, res) => {
  const { communityId } = req.query;

  if (!communityId) {
    return res.status(400).json({ error: "communityId is required" });
  }

  try {
    const gatekeeper = await prisma.user.findFirst({
      where: {
        communityId,
        role: "GATEKEEPER",
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!gatekeeper) {
      return res.status(404).json({ error: "No on-duty gatekeeper found" });
    }

    res.json({ gatekeeper });
  } catch (error) {
    console.error("Error fetching on-duty gatekeeper:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /intercom/notify
// Sends a push notification to the call receiver so they get an alert
// when their app is in the background or killed.
router.post("/notify", async (req, res) => {
  const {
    receiverId,
    callerId,
    callerName,
    callId,
    callType,
    callerUnit,
    callerBlock,
  } = req.body;

  if (!receiverId || !callerName || !callId) {
    return res
      .status(400)
      .json({ error: "receiverId, callerName, and callId are required" });
  }

  try {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { pushToken: true },
    });

    if (!receiver?.pushToken) {
      return res.json({ success: false, reason: "No push token registered" });
    }

    await sendPushNotification(
      receiver.pushToken,
      "Incoming Call",
      callerName,
      {
        type: "INTERCOM_CALL",
        callId,
        callType: callType ?? "R2G",
        callerId: callerId ?? "",
        callerName,
        callerUnit: callerUnit ?? "",
        callerBlock: callerBlock ?? "",
      },
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending intercom push notification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
