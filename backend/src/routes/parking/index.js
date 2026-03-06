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

// GET /parking/spots?communityId — available spots for residents
router.get(
  "/spots",
  requireResident,
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { communityId } = req.query;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    try {
      const spots = await prisma.parkingSpot.findMany({
        where: { communityId, isAvailable: true },
        orderBy: { spotNumber: "asc" },
      });
      res.json(spots);
    } catch (error) {
      console.error("Error fetching parking spots:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /parking/bookings
router.post(
  "/bookings",
  requireResident,
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { spotId, userId, communityId, fromDate, toDate } = req.body;
    if (!spotId || !userId || !communityId || !fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "spotId, userId, communityId, fromDate and toDate are required" });
    }
    try {
      const spot = await prisma.parkingSpot.findFirst({
        where: { id: spotId, communityId, isAvailable: true },
      });
      if (!spot) {
        return res.status(404).json({ error: "Spot not found or unavailable" });
      }

      const booking = await prisma.parkingBooking.create({
        data: {
          spotId,
          userId,
          communityId,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
        },
        include: {
          spot: {
            select: {
              spotNumber: true,
              spotType: true,
              floor: true,
              block: true,
              pricePerDay: true,
            },
          },
        },
      });
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating parking booking:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// GET /parking/bookings?userId&communityId
router.get(
  "/bookings",
  requireResident,
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { userId, communityId } = req.query;
    if (!userId || !communityId) {
      return res
        .status(400)
        .json({ error: "userId and communityId are required" });
    }
    try {
      const bookings = await prisma.parkingBooking.findMany({
        where: { userId, communityId },
        include: {
          spot: {
            select: {
              spotNumber: true,
              spotType: true,
              floor: true,
              block: true,
              pricePerDay: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching parking bookings:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /parking/bookings/:id/cancel
router.patch(
  "/bookings/:id/cancel",
  requireResident,
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const booking = await prisma.parkingBooking.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (booking.status === "CANCELLED") {
        return res.status(400).json({ error: "Booking already cancelled" });
      }
      const updated = await prisma.parkingBooking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          spot: {
            select: {
              spotNumber: true,
              spotType: true,
              floor: true,
              block: true,
              pricePerDay: true,
            },
          },
        },
      });
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling parking booking:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
