import express from "express";
import { v4 as uuid } from "uuid";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

// Use global broadcastEvent function
const broadcastEvent = global.broadcastEvent || (() => {});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const visitors = [];

router.get("/dashboard", authMiddleware, async (req, res) => {
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
router.get("/maintenance", authMiddleware, async (req, res) => {
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

router.post("/maintenance", authMiddleware, async (req, res) => {
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

router.post("/maintenance/:id/comments", authMiddleware, async (req, res) => {
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
router.patch("/maintenance/:id/status", authMiddleware, async (req, res) => {
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
router.post("/maintenance/:id/images", authMiddleware, async (req, res) => {
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
router.get("/visitors", authMiddleware, async (req, res) => {
  try {
    const { status, from, to, communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    let filteredVisitors = visitors.filter(
      (v) => v.communityId === communityId
    );

    if (status) {
      filteredVisitors = filteredVisitors.filter((v) => v.status === status);
    }

    if (from) {
      const fromDate = new Date(from);
      filteredVisitors = filteredVisitors.filter(
        (v) => new Date(v.expectedAt || v.createdAt) >= fromDate
      );
    }

    if (to) {
      const toDate = new Date(to);
      filteredVisitors = filteredVisitors.filter(
        (v) => new Date(v.expectedAt || v.createdAt) <= toDate
      );
    }

    res.status(200).json(filteredVisitors);
  } catch (e) {
    console.error("Error fetching visitors:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update visitor status
router.patch("/visitors/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, communityId } = req.body;

    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }

    const visitorIndex = visitors.findIndex(
      (v) => v.id === id && v.communityId === communityId
    );
    if (visitorIndex === -1) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    visitors[visitorIndex] = {
      ...visitors[visitorIndex],
      status,
      note,
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json(visitors[visitorIndex]);
  } catch (e) {
    console.error("Error updating visitor status:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/visitor-creation", authMiddleware, async (req, res) => {
  try {
    const { name, email, expectedAt, purpose, vehicle, notes, communityId } =
      req.body || {};
    if (!name || !email || !communityId) {
      return res.status(400).json({
        error: "Missing required fields: name, email, and communityId",
      });
    }

    const id = uuid();
    const newVisitor = { id, name, email, communityId };

    visitors.push(newVisitor);

    const qrPngBuffer = await qrcode.toBuffer(
      "http://192.168.0.103:4000/scan?id=" + id,
      {
        type: "png",
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
      }
    );

    const qrCid = `qr-${id}@gatezen`;

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

    return res.status(201).json({
      visitor: newVisitor,
      message: "Visitor created and QR email dispatched",
    });
  } catch (err) {
    console.error("Error creating visitor / sending QR email:", err);
    return res
      .status(500)
      .json({ error: "Failed to create visitor or send email" });
  }
});

router.get("/scan", (req, res) => {
  const { id, communityId } = req.query;

  if (!id || !communityId) {
    return res.status(400).json({ error: "Missing visitor ID or communityId" });
  }

  const visitor = visitors.find(
    (v) => v.id === id && v.communityId === communityId
  );

  if (!visitor) {
    return res.status(404).json({ error: "Visitor not found" });
  }

  return res.status(200).json({ visitor });
});

router.get("/facilities", authMiddleware, async (req, res) => {
  try {
    const { communityId } = req.query;

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        facilityConfigs: true,
      },
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "No community configuration found",
      });
    }

    // Get actual facilities that are linked to enabled configurations
    const enabledFacilities = community.facilityConfigs;

    res.status(200).json({
      success: true,
      data: enabledFacilities,
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

// Get bookings for a resident
router.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, from, to, communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: "communityId is required",
      });
    }

    let whereCondition = { userId, communityId };

    if (status) {
      whereCondition.status = status.toUpperCase();
    }

    if (from || to) {
      whereCondition.startsAt = {};
      if (from) {
        whereCondition.startsAt.gte = new Date(from);
      }
      if (to) {
        whereCondition.startsAt.lte = new Date(to);
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereCondition,
      include: {
        facility: {
          include: {
            configuration: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });

    // Format response for frontend
    const formattedBookings = bookings.map((booking) => ({
      ...booking,
      facility: {
        ...booking.facility,
        facilityType: booking.facility.facilityType.toLowerCase(),
        configuration: booking.facility.configuration
          ? {
              ...booking.facility.configuration,
              facilityType:
                booking.facility.configuration.facilityType.toLowerCase(),
              priceType:
                booking.facility.configuration.priceType?.toLowerCase(),
            }
          : null,
      },
    }));

    res.status(200).json({
      success: true,
      data: formattedBookings,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
});

// Create a new booking (only for enabled facilities)
router.post("/bookings", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { facilityId, startsAt, endsAt, note, communityId } = req.body;

    // Validate required fields
    if (!facilityId || !startsAt || !endsAt || !communityId) {
      return res.status(400).json({
        success: false,
        message: "facilityId, startsAt, endsAt, and communityId are required",
      });
    }

    // Check if facility exists and is enabled
    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,
        communityId: communityId,
      },
      include: {
        configuration: true,
      },
    });

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    if (!facility.configuration || !facility.configuration.enabled) {
      return res.status(400).json({
        success: false,
        message: "This facility is not available for booking",
      });
    }

    const startTime = new Date(startsAt);
    const endTime = new Date(endsAt);

    // Validate booking times
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "Start time must be before end time",
      });
    }

    if (startTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot book in the past",
      });
    }

    // Check for conflicts
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        facilityId,
        communityId,
        status: "CONFIRMED",
        OR: [
          {
            AND: [
              { startsAt: { lte: startTime } },
              { endsAt: { gt: startTime } },
            ],
          },
          {
            AND: [{ startsAt: { lt: endTime } }, { endsAt: { gte: endTime } }],
          },
          {
            AND: [
              { startsAt: { gte: startTime } },
              { endsAt: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      return res.status(409).json({
        success: false,
        message: "The selected time slot is already booked",
      });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        facilityId,
        communityId,
        startsAt: startTime,
        endsAt: endTime,
        note: note?.trim() || null,
        status: "CONFIRMED",
      },
      include: {
        facility: {
          include: {
            configuration: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        ...booking,
        facility: {
          ...booking.facility,
          facilityType: booking.facility.facilityType.toLowerCase(),
          configuration: booking.facility.configuration
            ? {
                ...booking.facility.configuration,
                facilityType:
                  booking.facility.configuration.facilityType.toLowerCase(),
                priceType:
                  booking.facility.configuration.priceType?.toLowerCase(),
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
});

// Cancel a booking
router.patch(
  "/bookings/:bookingId/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { bookingId } = req.params;
      const { communityId } = req.body;

      if (!communityId) {
        return res.status(400).json({
          success: false,
          message: "communityId is required",
        });
      }

      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          communityId: communityId,
        },
        include: {
          facility: {
            include: {
              configuration: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only cancel your own bookings",
        });
      }

      if (booking.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message: "Booking is already cancelled",
        });
      }

      // Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
        include: {
          facility: {
            include: {
              configuration: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
        data: {
          ...updatedBooking,
          facility: {
            ...updatedBooking.facility,
            facilityType: updatedBooking.facility.facilityType.toLowerCase(),
            configuration: updatedBooking.facility.configuration
              ? {
                  ...updatedBooking.facility.configuration,
                  facilityType:
                    updatedBooking.facility.configuration.facilityType.toLowerCase(),
                  priceType:
                    updatedBooking.facility.configuration.priceType?.toLowerCase(),
                }
              : null,
          },
        },
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel booking",
        error: error.message,
      });
    }
  }
);

// Get events for a resident
router.get("/events", authMiddleware, async (req, res) => {
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
router.post("/events/:eventId/rsvp", authMiddleware, async (req, res) => {
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
