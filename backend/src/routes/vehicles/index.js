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

// GET /vehicles?userId&communityId
router.get(
  "/",
  requireResident,
  checkFeature("VEHICLE_MANAGEMENT"),
  async (req, res) => {
    const { userId, communityId } = req.query;
    if (!userId || !communityId) {
      return res
        .status(400)
        .json({ error: "userId and communityId are required" });
    }
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { userId, communityId },
        orderBy: { createdAt: "desc" },
      });
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /vehicles
router.post(
  "/",
  requireResident,
  checkFeature("VEHICLE_MANAGEMENT"),
  async (req, res) => {
    const { plateNumber, vehicleType, brand, model, color, userId, communityId } =
      req.body;

    if (!plateNumber || !vehicleType || !userId || !communityId) {
      return res
        .status(400)
        .json({ error: "plateNumber, vehicleType, userId and communityId are required" });
    }

    try {
      const vehicle = await prisma.vehicle.create({
        data: { plateNumber, vehicleType, brand, model, color, userId, communityId },
      });
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /vehicles/:id
router.delete(
  "/:id",
  requireResident,
  checkFeature("VEHICLE_MANAGEMENT"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      await prisma.vehicle.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
