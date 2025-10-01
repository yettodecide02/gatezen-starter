import express from "express";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);
router.use(checkAuth);

function checkAuth(req, res, next) {
  if (req.user.role !== "RESIDENT") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Use global broadcastEvent function
const broadcastEvent = global.broadcastEvent || (() => {});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper function to check if booking aligns to slot
function isAlignedToSlot(start, end, slotMins) {
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  return durationMins === slotMins;
}

router.get("/dashboard", async (req, res) => {
  const { userId, communityId } = req.query;
  if (!userId || !communityId) {
    return res
      .status(400)
      .json({ error: "Missing userId or communityId in query parameters" });
  }
  try {
    // Get community announcements (not user-specific)
    const announcements = await prisma.announcements.findMany({
      where: { communityId: communityId },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const tickets = await prisma.ticket.findMany({
      where: { userId: userId, communityId: communityId },
      select: { id: true, title: true, description: true, status: true },
    });

    const payments = await prisma.payments.findMany({
      where: { userId: userId, communityId: communityId },
      select: { id: true, amount: true, status: true },
    });

    const bookings = await prisma.booking.findMany({
      where: { userId: userId, communityId: communityId },
      select: {
        id: true,
        facility: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    });

    res.status(200).json({
      announcements: announcements,
      maintenance: tickets,
      payments: payments,
      bookings: bookings,
    });
  } catch (e) {
    console.error("Error fetching dashboard data:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Maintenance routes for residents
router.get("/maintenance", async (req, res) => {
  try {
    const { userId, communityId } = req.query;
    const tickets = await prisma.ticket.findMany({
      where: { userId, communityId },
      include: {
        comments: { include: { user: true } },
        images: true,
        history: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.post("/maintenance", async (req, res) => {
  try {
    const { userId, title, category, description, images, communityId } =
      req.body;

    if (!userId || !title || !category || !communityId) {
      return res.status(400).json({
        error: "Missing required fields: userId, title, category, communityId",
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        category,
        description,
        userId,
        communityId,
        status: "SUBMITTED",
        images: {
          create: (images || []).map((url) => ({ url })),
        },
        history: {
          create: { status: "SUBMITTED", note: "Ticket created" },
        },
      },
      include: { comments: true, images: true, history: true },
    });

    broadcastEvent("maintenance", { action: "created", ticket });
    res.status(201).json(ticket);
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.post("/maintenance/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, text } = req.body;

    const comment = await prisma.comment.create({
      data: { text, userId, ticketId: id },
      include: { user: true },
    });

    broadcastEvent("maintenance", { action: "comment", ticketId: id, comment });

    res.status(201).json({
      id: comment.id,
      text: comment.text,
      userId: comment.userId,
      name: name || comment.user?.name,
      at: comment.createdAt,
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// PATCH /maintenance/:id/status
router.patch("/maintenance/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    let { status, communityId } = req.body;

    // Map frontend status to Prisma enum
    if (status === "in_progress") status = "IN_PROGRESS";
    if (status === "resolved") status = "RESOLVED";
    if (status === "submitted") status = "SUBMITTED";

    const ticket = await prisma.ticket.update({
      where: { id, communityId },
      data: {
        status,
        history: {
          create: { status, note: `Status changed to ${status}` },
        },
      },
      include: { comments: true, images: true, history: true },
    });

    broadcastEvent("maintenance", { action: "status", ticketId: id, status });
    res.json(ticket);
  } catch (err) {
    console.error("Error changing ticket status:", err);
    res.status(500).json({ error: "Failed to change status" });
  }
});

// POST /maintenance/:id/images
router.post("/maintenance/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    await prisma.image.create({
      data: { url: imageUrl, ticketId: id },
    });

    broadcastEvent("maintenance", { action: "image", ticketId: id });
    res.json({ message: "Image attached" });
  } catch (err) {
    console.error("Error attaching image:", err);
    res.status(500).json({ error: "Failed to attach image" });
  }
});

// Get visitors for a resident
router.get("/visitors", async (req, res) => {
  try {
    const { from, to, communityId, userId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    // Build where clause
    const whereClause = {
      communityId: String(communityId),
    };

    // If userId is provided, filter by resident (for resident's own visitors)
    if (userId) {
      whereClause.residentId = String(userId);
    }

    // Date range filtering
    whereClause.expectedAt = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setUTCHours(0, 0, 0, 0); // Start of the day
      whereClause.expectedAt.gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999); // End of the day
      whereClause.expectedAt.lte = toDate;
    }

    const visitors = await prisma.visitor.findMany({
      where: whereClause,
      include: {
        resident: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: {
        expectedAt: "desc",
      },
    });
    // Transform data to match frontend expectations
    const transformedVisitors = visitors.map((visitor) => ({
      ...visitor,
      hostName: visitor.resident?.name || "Unknown",
      visitDate: visitor.expectedAt,
      unitNumber: visitor.residentId,
      status: visitor.status.toLowerCase(),
    }));

    res.status(200).json(transformedVisitors);
  } catch (e) {
    console.error("Error fetching visitors:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/visitor-creation", async (req, res) => {
  try {
    console.log("Visitor creation request body:", req.body);
    console.log("Authenticated user:", req.user);

    const {
      name,
      email,
      type,
      expectedAt,
      purpose,
      vehicle,
      notes,
      communityId,
      residentId,
    } = req.body || {};

    // Use authenticated user's ID as residentId if not provided
    const actualResidentId = residentId || req.user?.id;

    console.log("Resolved residentId:", actualResidentId);

    if (!name || !communityId || !actualResidentId) {
      return res.status(400).json({
        error:
          "Missing required fields: name, communityId, and residentId",
      });
    }

    const validTypes = ["GUEST", "DELIVERY", "CAB_AUTO"];
    const visitorType =
      type && validTypes.includes(type.toUpperCase())
        ? type.toUpperCase()
        : "GUEST";

    if(visitorType === "GUEST" && !email) {
      return res.status(400).json({ error: "Email is required for GUEST visitor type" });
    }

    const visitorData = {
      name,
      email: visitorType === "GUEST" ? email : undefined, // ensure null if not GUEST
      type: visitorType,
      expectedAt: expectedAt ? new Date(expectedAt) : new Date(),
      purpose,
      vehicle,
      notes,
      communityId: String(communityId),
      residentId: String(actualResidentId),
    };

    const visitor = await prisma.visitor.create({
      data: visitorData,
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        expectedAt: true,
        purpose: true,
        vehicle: true,
        notes: true,
        communityId: true,
        residentId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!visitor) {
      throw new Error("Visitor creation failed");
    }

    if (visitor.type === "GUEST") {
      const qrPngBuffer = await qrcode.toBuffer(
        `${process.env.BACKEND_URL}/gatekeeper/scan?id=${visitor.id}&communityId=${visitor.communityId}`,
        {
          type: "png",
          width: 300,
          margin: 2,
          errorCorrectionLevel: "M",
        }
      );

      const qrCid = `qr-${visitor.id}@gatezen`;

      const subject = `Your GateZen visitor pass (QR) — ${name}`;
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: email,
        subject,
        text: `Hi ${name},\n\nPlease scan this QR code at the entrance to check in:`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin: 0 0 12px;">Hi ${name},</h2>
          <p style="margin: 0 0 12px;">Your visitor pass is ready. Show this QR at the gate:</p>
          <p style="margin: 0 0 16px;"><img src="cid:${qrCid}" alt="Visitor QR Code" width="300" height="300" style="display:block;border:0;outline:none;text-decoration:none;" /></p>
          <p style="margin: 0;">Thanks,<br/>GateZen</p>
        </div>
      `,
        attachments: [
          {
            filename: "visitor-qr.png",
            content: qrPngBuffer,
            contentType: "image/png",
            cid: qrCid,
          },
        ],
      });
    }
    return res.status(201).json({
      visitor: visitor,
      message: "Visitor created and QR email dispatched",
    });
  } catch (err) {
    console.error("Error creating visitor / sending QR email:", err);
    return res
      .status(500)
      .json({ error: "Failed to create visitor or send email" });
  }
});

router.get("/facilities", async (req, res) => {
  try {
    const { communityId } = req.query;

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        facilityConfigs: {
          where: { enabled: true }, // Only return enabled facilities
          select: {
            id: true,
            facilityType: true,
            enabled: true,
            quantity: true,
            maxCapacity: true,
            isPaid: true,
            price: true,
            priceType: true,
            operatingHours: true,
            rules: true,
            createdAt: true,
            updatedAt: true,
            facilities: {
              // Include linked actual facilities
              select: {
                id: true,
                name: true,
                open: true,
                close: true,
                slotMins: true,
                capacity: true,
              },
            },
          },
        },
      },
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "No community configuration found",
      });
    }

    // Transform the data to provide both configuration and facility information
    const transformedFacilities = community.facilityConfigs.map((config) => {
      // If there's an actual facility, use its details, otherwise use config defaults
      const facility = config.facilities[0]; // Assuming one facility per config for now

      return {
        // Use configuration ID for booking (our endpoint handles the mapping)
        id: config.id,
        facilityType: config.facilityType,
        name: facility?.name || config.facilityType.replace(/_/g, " "),
        enabled: config.enabled,
        quantity: config.quantity,
        maxCapacity: config.maxCapacity,
        capacity: config.maxCapacity, // For frontend compatibility
        isPaid: config.isPaid,
        price: config.price,
        priceType: config.priceType,
        operatingHours: config.operatingHours,
        rules: config.rules,
        // Parse operating hours "09:00-21:00" into separate open/close times for frontend
        ...(config.operatingHours && {
          open: config.operatingHours.split("-")[0],
          close: config.operatingHours.split("-")[1],
        }),
        // If there's an actual facility, include its specific details
        ...(facility && {
          slotMins: facility.slotMins,
          actualFacilityId: facility.id,
        }),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: transformedFacilities,
    });
  } catch (error) {
    console.error("Error fetching available facilities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available facilities",
      error: error.message,
    });
  }
});

function toHM(date) {
  // returns "HH:mm" in local time
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// GET /bookings?facilityId=&date=YYYY-MM-DD
router.get("/bookings", async (req, res) => {
  try {
    const { facilityId, date } = req.query;
    if (!facilityId || !date) {
      return res
        .status(400)
        .json({ error: "facilityId and date are required" });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600e3);

    // Determine if this is a configuration ID or actual facility ID
    let actualFacilityIds = [];

    // First check if it's a configuration ID
    const facilityConfig = await prisma.facilityConfiguration.findUnique({
      where: { id: facilityId },
      include: { facilities: { select: { id: true } } },
    });

    if (facilityConfig) {
      // This is a configuration ID, get all linked facility IDs
      actualFacilityIds = facilityConfig.facilities.map((f) => f.id);
    } else {
      // Check if it's already a facility ID
      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { id: true },
      });
      if (facility) {
        actualFacilityIds = [facility.id];
      }
    }

    if (actualFacilityIds.length === 0) {
      return res
        .status(404)
        .json({ error: "No facilities found for the given ID" });
    }

    const list = await prisma.booking.findMany({
      where: {
        facilityId: { in: actualFacilityIds },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startsAt: "asc" },
    });

    // Map DB enum -> frontend lowercase string
    const payload = list.map((b) => ({
      ...b,
      status: b.status === "CANCELLED" ? "cancelled" : "confirmed",
    }));

    res.json(payload);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET /user-bookings?userId=xxx&date=YYYY-MM-DD
router.get("/user-bookings", async (req, res) => {
  try {
    const { userId, date } = req.query;
    if (!userId || !date) {
      return res.status(400).json({ error: "userId and date are required" });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600e3);

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        startsAt: { gte: dayStart, lt: dayEnd },
      },
    });
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ error: "Failed to fetch user bookings" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { userId, facilityId, startsAt, endsAt, note, peopleCount } =
      req.body;

    if (!userId || !facilityId || !startsAt || !endsAt) {
      return res
        .status(400)
        .json({ error: "userId, facilityId, startsAt, endsAt are required" });
    }

    // First, try to find if this is a FacilityConfiguration ID
    let actualFacility = null;
    let facilityConfig = null;

    // Check if facilityId is a FacilityConfiguration ID
    facilityConfig = await prisma.facilityConfiguration.findUnique({
      where: { id: facilityId },
      include: { facilities: true },
    });

    if (facilityConfig) {
      // This is a configuration ID, we need to find or create the actual facility
      if (!facilityConfig.enabled) {
        return res.status(400).json({ error: "Facility is not enabled" });
      }

      // Look for existing facility linked to this configuration
      actualFacility = facilityConfig.facilities[0]; // Get first available facility

      // If no facility exists, create one from the configuration
      if (!actualFacility) {
        const operatingHours = facilityConfig.operatingHours || "09:00-21:00";
        const [openTime, closeTime] = operatingHours.split("-");

        actualFacility = await prisma.facility.create({
          data: {
            name: `${facilityConfig.facilityType.replace(/_/g, " ")} 1`, // Convert ENUM to readable name
            open: openTime?.trim() || "09:00",
            close: closeTime?.trim() || "21:00",
            slotMins: 60, // Default slot duration
            capacity: facilityConfig.maxCapacity,
            communityId: facilityConfig.communityId,
            facilityType: facilityConfig.facilityType,
            configurationId: facilityConfig.id,
          },
        });
      }
    } else {
      // Check if it's already a Facility ID
      actualFacility = await prisma.facility.findUnique({
        where: { id: facilityId },
        include: { configuration: true },
      });

      if (!actualFacility) {
        return res.status(404).json({ error: "Facility not found" });
      }

      // If facility has a configuration, check if it's enabled
      if (
        actualFacility.configuration &&
        !actualFacility.configuration.enabled
      ) {
        return res.status(400).json({ error: "Facility is not enabled" });
      }
    }

    const communityId = actualFacility.communityId;
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Prevent booking in the past
    const now = new Date();
    if (start.toDateString() === now.toDateString() && start < now) {
      return res.status(400).json({ error: "Cannot book a slot in the past" });
    }

    if (!(start < end)) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    // Check within operating hours (compare HH:mm strings)
    const startHM = toHM(start);
    const endHM = toHM(end);
    if (startHM < actualFacility.open || endHM > actualFacility.close) {
      return res.status(400).json({
        error: `Booking must be within ${actualFacility.open}–${actualFacility.close}`,
      });
    }

    // Enforce slot alignment and single-slot booking
    if (!isAlignedToSlot(start, end, actualFacility.slotMins)) {
      return res.status(400).json({
        error: `Booking must align to a single ${actualFacility.slotMins}-minute slot`,
      });
    }

    // 3-hour daily usage limit per user (across all facilities)
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const userBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        startsAt: { gte: dayStart, lt: dayEnd },
      },
    });

    // Merge overlapping intervals for this user's bookings
    function mergeIntervals(intervals) {
      if (!intervals.length) return [];
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        if (intervals[i][0] <= last[1]) {
          last[1] = Math.max(last[1], intervals[i][1]);
        } else {
          merged.push(intervals[i]);
        }
      }
      return merged;
    }

    const intervals = userBookings.map((b) => [
      new Date(b.startsAt).getTime(),
      new Date(b.endsAt).getTime(),
    ]);

    // Add the new booking interval
    intervals.push([start.getTime(), end.getTime()]);

    const merged = mergeIntervals(intervals);
    const alreadyBookedMins = Math.round(
      merged.reduce((sum, [s, e]) => sum + (e - s), 0) / 60000
    );

    if (alreadyBookedMins > 180) {
      return res.status(400).json({
        error: "You can only book up to 3 hours per day across all facilities.",
      });
    }

    // Find all bookings for this slot using the actual facility ID
    const overlapping = await prisma.booking.findMany({
      where: {
        facilityId: actualFacility.id,
        status: "CONFIRMED",
        startsAt: { equals: start },
        endsAt: { equals: end },
      },
    });

    const totalPeople =
      overlapping.reduce((sum, b) => sum + (b.peopleCount || 1), 0) +
      (peopleCount || 1);
    if (totalPeople > actualFacility.capacity) {
      return res.status(400).json({
        error: `This slot is full. Max allowed: ${actualFacility.capacity}`,
      });
    }

    // Prevent partial overlaps (no booking can overlap a slot unless it's for the exact same slot)
    const partialOverlap = await prisma.booking.findFirst({
      where: {
        facilityId: actualFacility.id,
        status: "CONFIRMED",
        OR: [
          {
            startsAt: { lt: end },
            endsAt: { gt: start },
            NOT: [{ startsAt: { equals: start }, endsAt: { equals: end } }],
          },
        ],
      },
    });
    if (partialOverlap) {
      return res.status(409).json({
        error: "Time slot conflict: partial overlap with another booking.",
      });
    }

    const created = await prisma.booking.create({
      data: {
        userId,
        facilityId: actualFacility.id, // Use the actual facility ID
        startsAt: start,
        endsAt: end,
        note,
        status: "CONFIRMED",
        peopleCount: peopleCount || 1,
        communityId,
      },
      include: {
        facility: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    broadcastEvent("booking", {
      action: "created",
      bookingId: created.id,
      facilityId: actualFacility.id,
    });

    res.status(201).json({ ...created, status: "confirmed" });
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// PATCH /bookings/:id/cancel
router.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    broadcastEvent("booking", {
      action: "cancelled",
      bookingId: id,
      facilityId: updated.facilityId,
    });
    res.json({ ...updated, status: "cancelled" });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Get events for a resident
router.get("/events", async (req, res) => {
  try {
    const { communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: "communityId is required",
      });
    }

    const events = await prisma.event.findMany({
      where: { communityId },
      include: {
        rsvps: true,
      },
      orderBy: { startsAt: "asc" },
    });

    const formattedEvents = events.map((event) => ({
      ...event,
      attendees: event.rsvps.map((rsvp) => rsvp.userId),
    }));

    res.status(200).json({
      success: true,
      data: formattedEvents,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
});

// RSVP to an event
router.post("/events/:eventId/rsvp", async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { communityId } = req.body;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: "communityId is required",
      });
    }

    // Check if event exists
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        communityId,
      },
      include: {
        rsvps: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is already attending
    const existingRSVP = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: { eventId, userId },
      },
    });

    let updatedEvent;

    if (existingRSVP) {
      // Remove RSVP
      await prisma.rSVP.delete({
        where: {
          userId_eventId: { eventId, userId },
        },
      });

      updatedEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          rsvps: true,
        },
      });
    } else {
      // Add RSVP
      await prisma.rSVP.create({
        data: {
          eventId,
          userId,
        },
      });

      updatedEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          rsvps: true,
        },
      });
    }

    const formattedEvent = {
      ...updatedEvent,
      attendees: updatedEvent.rsvps.map((rsvp) => rsvp.userId),
    };

    res.status(200).json({
      success: true,
      data: formattedEvent,
    });
  } catch (error) {
    console.error("Error updating RSVP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update RSVP",
      error: error.message,
    });
  }
});

export default router;
