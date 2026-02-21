import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * POST /notifications/token
 * Save / update the Expo push token for the authenticated user.
 * Called by the mobile app right after login.
 */
router.post("/token", async (req, res) => {
  const { pushToken } = req.body;

  if (!pushToken) {
    return res.status(400).json({ error: "pushToken is required" });
  }

  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Error saving push token:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /notifications/token
 * Clear the push token on logout so the user stops receiving notifications.
 */
router.delete("/token", async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: null },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Error clearing push token:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
