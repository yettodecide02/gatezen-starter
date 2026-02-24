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
    const announcements = await prisma.announcement.findMany({
      where: { communityId: communityId },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const announcementsCount = await prisma.announcement.count({
      where: { communityId: communityId },
    });

    const tickets = await prisma.ticket.findMany({
      where: { userId: userId, communityId: communityId },
      select: { id: true, title: true, description: true, status: true },
    });

    const payments = await prisma.payment.findMany({
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
      announcementsCount: announcementsCount,
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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        history: {
          orderBy: { changedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(tickets);

    res.json(tickets);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.post("/maintenance", async (req, res) => {
  try {
    const { userId, title, category, description, communityId } = req.body;

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
        priority: "LOW", // Default priority
        history: {
          create: {
            status: "SUBMITTED",
          },
        },
      },
      include: {
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        history: {
          orderBy: { changedAt: "desc" },
        },
      },
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
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
      whereClause.userId = String(userId);
    }

    // Date range filtering — frontend sends full ISO local-day boundaries
    whereClause.visitDate = {};
    if (from) {
      whereClause.visitDate.gte = new Date(from);
    }

    if (to) {
      whereClause.visitDate.lte = new Date(to);
    }

    const visitors = await prisma.visitor.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            id: true,
            unit: {
              select: {
                id: true,
                number: true,
                block: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        visitDate: "desc",
      },
    });
    // Transform data to match frontend expectations
    const transformedVisitors = visitors.map((visitor) => ({
      ...visitor,
      hostName: visitor.user?.name || "Unknown",
      unitNumber: visitor.user?.unit?.number || "N/A",
      blockName: visitor.user?.unit?.block?.name || "N/A",
      status: visitor.checkOutAt
        ? "checked_out"
        : visitor.checkInAt
          ? "checked_in"
          : "pending",
    }));

    res.status(200).json(transformedVisitors);
  } catch (e) {
    console.error("Error fetching visitors:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/visitor-creation", async (req, res) => {
  try {
    const {
      name,
      contact,
      visitorType,
      visitDate,
      vehicleNo,
      communityId,
      userId,
    } = req.body || {};

    // Use authenticated user's ID as userId if not provided
    const actualUserId = userId || req.user?.id;

    if (!name || !communityId || !actualUserId) {
      return res.status(400).json({
        error: "Missing required fields: name, communityId, and userId",
      });
    }

    const validTypes = ["GUEST", "DELIVERY", "CAB_AUTO"];
    const actualVisitorType =
      visitorType && validTypes.includes(visitorType.toUpperCase())
        ? visitorType.toUpperCase()
        : "GUEST";

    if (actualVisitorType === "GUEST") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        return res.status(400).json({
          error:
            "Valid email is required in contact field for GUEST visitor type",
        });
      }
    }

    const visitorData = {
      name,
      contact,
      vehicleNo,
      visitorType: actualVisitorType,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      communityId: String(communityId),
      userId: String(actualUserId),
    };

    const visitor = await prisma.visitor.create({
      data: visitorData,
      select: {
        id: true,
        name: true,
        contact: true,
        vehicleNo: true,
        visitorType: true,
        visitDate: true,
        checkInAt: true,
        checkOutAt: true,
        communityId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!visitor) {
      throw new Error("Visitor creation failed");
    }

    // Send QR code email for GUEST visitors
    if (visitor.visitorType === "GUEST") {
      const qrPngBuffer = await qrcode.toBuffer(
        `${process.env.BACKEND_URL}/gatekeeper/scan?id=${visitor.id}&communityId=${visitor.communityId}`,
        {
          type: "png",
          width: 300,
          margin: 2,
          errorCorrectionLevel: "M",
        },
      );

      const qrCid = `qr-${visitor.id}@gatezen`;

      const subject = `Your GateZen visitor pass (QR) — ${name}`;
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: contact, // contact field contains email for GUEST type
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
        capacity: facility?.capacity || config.maxCapacity, // Use actual facility capacity if available
        isPaid: config.isPaid,
        price: config.price,
        priceType: config.priceType,
        operatingHours: config.operatingHours,
        rules: config.rules,
        // Provide slotMins - use actual facility value or default to 60
        slotMins: facility?.slotMins || 60,
        // Parse operating hours "09:00-21:00" into separate open/close times for frontend
        ...(config.operatingHours && {
          open: config.operatingHours.split("-")[0]?.trim(),
          close: config.operatingHours.split("-")[1]?.trim(),
        }),
        // If there's an actual facility, include its specific details
        ...(facility && {
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

        if (!openTime || !closeTime) {
          return res.status(400).json({
            error: "Invalid operating hours format in facility configuration",
          });
        }

        try {
          actualFacility = await prisma.facility.create({
            data: {
              name: `${facilityConfig.facilityType.replace(/_/g, " ")} 1`, // Convert ENUM to readable name
              open: openTime.trim(),
              close: closeTime.trim(),
              slotMins: 60, // Default slot duration
              capacity: facilityConfig.maxCapacity,
              communityId: facilityConfig.communityId,
              facilityType: facilityConfig.facilityType,
              configurationId: facilityConfig.id,
            },
          });
        } catch (createError) {
          console.error("Error creating facility:", createError);
          return res.status(500).json({
            error: "Failed to create facility from configuration",
          });
        }
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

    if (!actualFacility) {
      return res.status(404).json({ error: "Could not resolve facility" });
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
      merged.reduce((sum, [s, e]) => sum + (e - s), 0) / 60000,
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

// Get resident profile with unit and block information
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        communityId: true,
        unitId: true,
        createdAt: true,
        unit: {
          select: {
            id: true,
            number: true,
            block: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileData = {
      ...user,
      unitNumber: user.unit?.number || null,
      blockName: user.unit?.block?.name || null,
      communityName: user.community?.name || null,
      communityAddress: user.community?.address || null,
    };

    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
});

// Update resident profile (name only)
router.patch("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

// Get all announcements for the resident's community
router.get("/announcements", async (req, res) => {
  try {
    const { communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    const announcements = await prisma.announcement.findMany({
      where: { communityId },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
});

// Get resident's payments
router.get("/payments", async (req, res) => {
  try {
    const { communityId, status, from, to } = req.query;
    const userId = req.user.id;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    let whereClause = {
      userId,
      communityId,
    };

    // Status filter
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // Date range filter
    if (from || to) {
      whereClause.createdAt = {};
      if (from) {
        whereClause.createdAt.gte = new Date(from);
      }
      if (to) {
        whereClause.createdAt.lte = new Date(to);
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        method: true,
        status: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
});

// Get resident's community statistics
router.get("/community-stats", async (req, res) => {
  try {
    const { communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    const [
      totalBlocks,
      totalUnits,
      totalResidents,
      totalFacilities,
      myActiveTickets,
      myBookingsThisMonth,
    ] = await Promise.all([
      prisma.block.count({ where: { communityId } }),
      prisma.unit.count({ where: { communityId } }),
      prisma.user.count({
        where: {
          communityId,
          role: "RESIDENT",
          status: "APPROVED",
        },
      }),
      prisma.facility.count({ where: { communityId } }),
      prisma.ticket.count({
        where: {
          userId: req.user.id,
          communityId,
          status: { in: ["SUBMITTED", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.count({
        where: {
          userId: req.user.id,
          communityId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        community: {
          totalBlocks,
          totalUnits,
          totalResidents,
          totalFacilities,
        },
        personal: {
          myActiveTickets,
          myBookingsThisMonth,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching community stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community statistics",
      error: error.message,
    });
  }
});

router.get("/packages", async (req, res) => {
  const { communityId, userId, from, to } = req.query;

  if (!communityId || !userId) {
    return res.status(400).json({ error: "communityId and userId required" });
  }

  if (!from || !to) {
    return res.status(400).json({ error: "date required" });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setDate(toDate.getDate() + 1);

  if (isNaN(fromDate) || isNaN(toDate)) {
    return res.status(400).json({ error: "invalid date format" });
  }

  try {
    const packages = await prisma.packages.findMany({
      where: {
        communityId,
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(packages);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get neighbor information (residents in the same block)
router.get("/neighbors", async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user's unit and block information
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        unitId: true,
        unit: {
          select: {
            blockId: true,
            block: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!currentUser?.unit?.blockId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "User not assigned to any unit/block",
      });
    }

    // Get all residents in the same block
    const neighbors = await prisma.user.findMany({
      where: {
        unit: {
          blockId: currentUser.unit.blockId,
        },
        role: "RESIDENT",
        status: "APPROVED",
        NOT: {
          id: userId, // Exclude current user
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        unit: {
          select: {
            id: true,
            number: true,
          },
        },
      },
      orderBy: {
        unit: {
          number: "asc",
        },
      },
    });

    const formattedNeighbors = neighbors.map((neighbor) => ({
      id: neighbor.id,
      name: neighbor.name,
      email: neighbor.email,
      unitNumber: neighbor.unit?.number || "N/A",
    }));

    res.status(200).json({
      success: true,
      data: formattedNeighbors,
      blockInfo: {
        id: currentUser.unit.block.id,
        name: currentUser.unit.block.name,
      },
    });
  } catch (error) {
    console.error("Error fetching neighbors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch neighbors",
      error: error.message,
    });
  }
});

router.get("/pdfs", async (req, res) => {
  try {
    const { communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "CommunityId required" });
    }

    const pdfs = await prisma.pdfs.findMany({
      where: { communityId },
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json({ pdfs });
  } catch (e) {
    console.error("Error fetching PDFs:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pdf/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pdf = await prisma.pdfs.findUnique({ where: { id } });

    if (!pdf) {
      console.error("PDF not found:", id);
      return res.status(404).json({ error: "PDF not found" });
    }

    if (!pdf.content) {
      console.error("PDF content is empty:", id);
      return res.status(400).json({ error: "PDF content is empty" });
    }

    // Convert content to Buffer if it's a string (base64) or already a Buffer
    let pdfBuffer;
    try {
      if (typeof pdf.content === "string") {
        // Try to decode from base64
        pdfBuffer = Buffer.from(pdf.content, "base64");
      } else if (Buffer.isBuffer(pdf.content)) {
        pdfBuffer = pdf.content;
      } else if (pdf.content instanceof Uint8Array) {
        pdfBuffer = Buffer.from(pdf.content);
      } else {
        console.error("Unknown PDF content type:", typeof pdf.content);
        return res.status(400).json({ error: "Invalid PDF content format" });
      }
    } catch (bufferError) {
      console.error("Error converting PDF content:", bufferError);
      return res.status(400).json({ error: "Failed to process PDF content" });
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error("PDF buffer is empty after conversion");
      return res.status(400).json({ error: "PDF content is empty" });
    }

    const fileName = pdf.name.endsWith(".pdf") ? pdf.name : `${pdf.name}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.end(pdfBuffer);
  } catch (e) {
    console.error("Error fetching PDF:", e.message, e.stack);
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// Get kid passes for a resident
router.get("/kid-passes", async (req, res) => {
  try {
    const { userId, communityId } = req.query;

    if (!userId || !communityId) {
      return res.status(400).json({ error: "Missing userId or communityId" });
    }

    const kidPasses = await prisma.kidPass.findMany({
      where: {
        userId: String(userId),
        communityId: String(communityId),
      },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(kidPasses);
  } catch (e) {
    console.error("Error fetching kid passes:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a kid pass
router.post("/kid-passes", async (req, res) => {
  try {
    const {
      childName,
      childAge,
      parentName,
      contact,
      permissions,
      validFrom,
      validTo,
      communityId,
      userId,
    } = req.body;

    const actualUserId = userId || req.user?.id;

    if (
      !childName ||
      !parentName ||
      !contact ||
      !communityId ||
      !actualUserId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!validFrom || !validTo) {
      return res.status(400).json({ error: "Valid dates are required" });
    }

    const kidPass = await prisma.kidPass.create({
      data: {
        childName,
        childAge: childAge ? parseInt(childAge) : null,
        parentName,
        contact,
        permissions: permissions || "Standard access",
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        communityId: String(communityId),
        userId: String(actualUserId),
        status: "PENDING",
      },
    });

    res.status(201).json(kidPass);
  } catch (err) {
    console.error("Error creating kid pass:", err);
    res.status(500).json({ error: "Failed to create kid pass" });
  }
});

export default router;
