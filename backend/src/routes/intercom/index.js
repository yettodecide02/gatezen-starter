import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

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

export default router;
