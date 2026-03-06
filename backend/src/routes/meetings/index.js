import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { checkFeature } from "../../middleware/checkFeature.js";

const router = express.Router();
router.use(authMiddleware);

const FEATURE = "MEETING_ALIGNMENT";

function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// GET /meetings?communityId&userId
// Returns meetings with myRsvp and rsvpCounts
router.get("/", checkFeature(FEATURE), async (req, res) => {
  const { communityId, userId } = req.query;
  if (!communityId) {
    return res.status(400).json({ error: "communityId is required" });
  }
  try {
    const meetings = await prisma.meeting.findMany({
      where: { communityId },
      include: { rsvps: { select: { userId: true, response: true } } },
      orderBy: { scheduledAt: "asc" },
    });

    const result = meetings.map((m) => {
      const rsvpCounts = { GOING: 0, NOT_GOING: 0, MAYBE: 0 };
      let myRsvp = null;
      for (const r of m.rsvps) {
        rsvpCounts[r.response] = (rsvpCounts[r.response] || 0) + 1;
        if (userId && r.userId === userId) myRsvp = r.response;
      }
      const { rsvps, ...rest } = m;
      return { ...rest, rsvpCounts, myRsvp };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /meetings — admin only
router.post("/", requireAdmin, checkFeature(FEATURE), async (req, res) => {
  const { communityId, title, description, location, scheduledAt, agenda } =
    req.body;
  if (!communityId || !title || !scheduledAt) {
    return res
      .status(400)
      .json({ error: "communityId, title and scheduledAt are required" });
  }
  try {
    const meeting = await prisma.meeting.create({
      data: {
        communityId,
        title,
        description,
        location,
        scheduledAt: new Date(scheduledAt),
        agenda: agenda ?? [],
      },
    });
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /meetings/:id — admin only
router.patch("/:id", requireAdmin, checkFeature(FEATURE), async (req, res) => {
  const { id } = req.params;
  const { title, description, location, scheduledAt, agenda } = req.body;
  try {
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (location !== undefined) data.location = location;
    if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
    if (agenda !== undefined) data.agenda = agenda;

    const meeting = await prisma.meeting.update({ where: { id }, data });
    res.json(meeting);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /meetings/:id — admin only
router.delete(
  "/:id",
  requireAdmin,
  checkFeature(FEATURE),
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.meeting.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /meetings/:id/rsvp
router.post("/:id/rsvp", checkFeature(FEATURE), async (req, res) => {
  const { id } = req.params;
  const { response, userId, communityId } = req.body;

  if (!response || !userId || !communityId) {
    return res
      .status(400)
      .json({ error: "response, userId and communityId are required" });
  }

  const validResponses = ["GOING", "NOT_GOING", "MAYBE"];
  if (!validResponses.includes(response)) {
    return res.status(400).json({ error: "Invalid response value" });
  }

  try {
    const rsvp = await prisma.meetingRsvp.upsert({
      where: { meetingId_userId: { meetingId: id, userId } },
      update: { response },
      create: { meetingId: id, userId, response },
    });
    res.json(rsvp);
  } catch (error) {
    console.error("Error saving RSVP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /meetings/:id/rsvps
router.get("/:id/rsvps", checkFeature(FEATURE), async (req, res) => {
  const { id } = req.params;
  try {
    const rsvps = await prisma.meetingRsvp.findMany({
      where: { meetingId: id },
      include: {
        user: {
          select: {
            name: true,
            unit: {
              select: {
                number: true,
                block: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const result = rsvps.map((r) => ({
      id: r.id,
      meetingId: r.meetingId,
      userId: r.userId,
      response: r.response,
      user: {
        name: r.user?.name || "Unknown",
        unitNumber: r.user?.unit?.number || "N/A",
        blockName: r.user?.unit?.block?.name || "N/A",
      },
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
