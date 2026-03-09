import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/token", async (req, res) => {
  const { pushToken } = req.body;

  if (!pushToken) {
    return res.status(400).json({ error: "pushToken is required" });
  }
  console.log(pushToken, req.user.name);

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
 * POST /notifications/admin/clear-tokens
 * One-shot admin endpoint: clears ALL push tokens in the DB so every
 * user re-registers on next app open. Use this after switching build
 * profiles (e.g. dev → preview) to purge stale tokens.
 */
router.post("/admin/clear-tokens", async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const result = await prisma.user.updateMany({
      where: { pushToken: { not: null } },
      data: { pushToken: null },
    });
    console.log(`[Push] Admin cleared ${result.count} push tokens`);
    return res.status(200).json({ success: true, cleared: result.count });
  } catch (e) {
    console.error("Error clearing all push tokens:", e);
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
