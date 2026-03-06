import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import { checkFeature } from "../../middleware/checkFeature.js";

const router = express.Router();
router.use(authMiddleware);

function requireResident(req, res, next) {
  if (req.user.role !== "RESIDENT") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

const VALID_TYPES = ["MAINTENANCE", "CONTRACTOR", "SERVICE", "CLEANING", "OTHER"];
const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

// GET /home-planner?userId&communityId
router.get(
  "/",
  requireResident,
  checkFeature("HOME_PLANNER"),
  async (req, res) => {
    const { userId, communityId } = req.query;
    if (!userId || !communityId) {
      return res
        .status(400)
        .json({ error: "userId and communityId are required" });
    }
    try {
      const tasks = await prisma.homePlannerTask.findMany({
        where: { userId, communityId },
        orderBy: { scheduledDate: "asc" },
      });
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching home planner tasks:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /home-planner
router.post(
  "/",
  requireResident,
  checkFeature("HOME_PLANNER"),
  async (req, res) => {
    const { title, description, type, scheduledDate, userId, communityId } =
      req.body;

    if (!title || !type || !userId || !communityId) {
      return res
        .status(400)
        .json({ error: "title, type, userId and communityId are required" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type: ${type}` });
    }

    try {
      const task = await prisma.homePlannerTask.create({
        data: {
          title,
          description,
          type,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          userId,
          communityId,
        },
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating home planner task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /home-planner/:id
router.patch(
  "/:id",
  requireResident,
  checkFeature("HOME_PLANNER"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    try {
      const task = await prisma.homePlannerTask.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      const updated = await prisma.homePlannerTask.update({
        where: { id },
        data: { status },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating home planner task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /home-planner/:id
router.delete(
  "/:id",
  requireResident,
  checkFeature("HOME_PLANNER"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const task = await prisma.homePlannerTask.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      await prisma.homePlannerTask.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting home planner task:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
