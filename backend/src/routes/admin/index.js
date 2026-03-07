import express from "express";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import { UserStatus, FacilityType, PriceType } from "@prisma/client";
import { authMiddleware } from "../../middleware/auth.js";
import { checkFeature } from "../../middleware/checkFeature.js";
import {
  sendPushNotification,
  sendBulkPushNotifications,
} from "../../../lib/notifications.js";

const router = express.Router();
router.use(authMiddleware);
router.use(checkAuth);

const upload = multer({ storage: multer.memoryStorage() });

function checkAuth(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.get("/dashboard", async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        announcements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, title: true, content: true, createdAt: true },
        },
        payments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        tickets: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        users: {
          where: { status: UserStatus.PENDING },
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    });

    if (!community) {
      return res.status(404).json({
        error: "No community found. Please create a community first.",
      });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        facility: {
          communityId: community.id,
        },
      },
      include: {
        user: { select: { name: true } },
        facility: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    res.status(200).json({
      announcements: community.announcements,
      payments: community.payments,
      maintenance: community.tickets,
      bookings,
      pendingRequests: community.users,
    });
  } catch (e) {
    console.error("Error fetching admin dashboard data:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard-stats", async (req, res) => {
  try {
    const { communityId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "Community ID is required" });
    }

    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const [
      totalBlocks,
      totalUnits,
      totalResidents,
      pendingRequests,
      totalTickets,
      openTickets,
      totalBookings,
      totalPayments,
      pendingPayments,
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
      prisma.user.count({
        where: {
          communityId,
          role: "RESIDENT",
          status: "PENDING",
        },
      }),
      prisma.ticket.count({ where: { communityId } }),
      prisma.ticket.count({
        where: {
          communityId,
          status: { in: ["SUBMITTED", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.count({ where: { communityId } }),
      prisma.payment.count({ where: { communityId } }),
      prisma.payment.count({
        where: {
          communityId,
          status: "PENDING",
        },
      }),
    ]);

    // Get occupancy statistics
    const unitsWithResidents = await prisma.unit.count({
      where: {
        communityId,
        residents: {
          some: {
            status: "APPROVED",
          },
        },
      },
    });

    const occupancyRate =
      totalUnits > 0 ? (unitsWithResidents / totalUnits) * 100 : 0;

    // Get recent activities count
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Last 7 days

    const recentActivities = await Promise.all([
      prisma.user.count({
        where: {
          communityId,
          createdAt: { gte: recentDate },
        },
      }),
      prisma.ticket.count({
        where: {
          communityId,
          createdAt: { gte: recentDate },
        },
      }),
      prisma.booking.count({
        where: {
          communityId,
          createdAt: { gte: recentDate },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        infrastructure: {
          totalBlocks,
          totalUnits,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          unitsWithResidents,
          vacantUnits: totalUnits - unitsWithResidents,
        },
        residents: {
          totalResidents,
          pendingRequests,
          approvedResidents: totalResidents,
        },
        maintenance: {
          totalTickets,
          openTickets,
          closedTickets: totalTickets - openTickets,
        },
        bookings: {
          totalBookings,
        },
        payments: {
          totalPayments,
          pendingPayments,
          completedPayments: totalPayments - pendingPayments,
        },
        recentActivity: {
          newResidents: recentActivities[0],
          newTickets: recentActivities[1],
          newBookings: recentActivities[2],
        },
      },
    });
  } catch (e) {
    console.error("Error fetching dashboard statistics:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resident management routes
router.get("/resident-requests", async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        status: UserStatus.PENDING,
        communityId: community.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        unitId: true,
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
      orderBy: [
        {
          unit: {
            block: {
              name: "asc",
            },
          },
        },
        {
          unit: {
            number: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
    });

    // Transform the data to include block and unit information
    const pendingUsersWithUnitInfo = pendingUsers.map((user) => ({
      ...user,
      blockName: user.unit?.block?.name || null,
      unitNumber: user.unit?.number || null,
    }));

    res.status(200).json(pendingUsersWithUnitInfo);
  } catch (e) {
    console.error("Error fetching resident requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/approve-resident", async (req, res) => {
  const { userId } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: "APPROVED" },
      select: { id: true, name: true, email: true, status: true },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: updatedUser.email,
      subject: "GateZen Account Approved",
      text: `Hello ${updatedUser.name},\n\nYour account has been approved. You can now log in to your GateZen account.\n\nThank you,\nGateZen Team`,
    });

    res.status(200).json({ message: "Resident approved", user: updatedUser });
  } catch (e) {
    console.error("Error approving resident:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reject-resident", async (req, res) => {
  const { userId } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: "REJECTED" },
      select: { id: true, name: true, email: true, status: true },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: updatedUser.email,
      subject: "GateZen Account Rejected",
      text: `Hello ${updatedUser.name},\n\nWe regret to inform you that your account has been rejected. For more information, please contact support.\n\nThank you,\nGateZen Team`,
    });

    res.status(200).json({ message: "Resident rejected", user: updatedUser });
  } catch (e) {
    console.error("Error rejecting resident:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/residents", async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const residents = await prisma.user.findMany({
      where: {
        role: "RESIDENT",
        communityId: community.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
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
      },
      orderBy: [
        {
          unit: {
            block: {
              name: "asc",
            },
          },
        },
        {
          unit: {
            number: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
    });

    // Transform the data to include block and unit information
    const residentsWithUnitInfo = residents.map((resident) => ({
      ...resident,
      blockName: resident.unit?.block?.name || null,
      unitNumber: resident.unit?.number || null,
    }));

    res.status(200).json({ residents: residentsWithUnitInfo });
  } catch (e) {
    console.error("Error fetching residents:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bookings management
router.get("/bookings", checkFeature("AMENITY_BOOKING"), async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        facility: {
          communityId: community.id,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        facility: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });
    res.status(200).json({ bookings });
  } catch (e) {
    console.error("Error fetching bookings:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Maintenance management
router.get("/maintenance", checkFeature("HELPDESK"), async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const maintenance = await prisma.ticket.findMany({
      where: { communityId: community.id },
      include: {
        user: { select: { name: true, email: true } },
        comments: {
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ maintenance });
  } catch (e) {
    console.error("Error fetching maintenance requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/maintenance/:id/comments",
  checkFeature("HELPDESK"),
  async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    try {
      const comment = await prisma.comment.create({
        data: { text: text.trim(), userId, ticketId: id },
        include: { user: { select: { name: true, role: true } } },
      });
      res.status(201).json({ comment });
    } catch (e) {
      console.error("Error adding comment:", e);
      res.status(500).json({ error: "Failed to add comment" });
    }
  },
);

router.post(
  "/maintenance/update",
  checkFeature("HELPDESK"),
  async (req, res) => {
    const { ticketId, status } = req.body;

    const ALLOWED_TRANSITIONS = {
      SUBMITTED: ["IN_PROGRESS"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["CLOSED"],
      CLOSED: [],
    };

    try {
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      if (!currentTicket)
        return res.status(404).json({ error: "Ticket not found" });
      const allowed = ALLOWED_TRANSITIONS[currentTicket.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Invalid transition: cannot move from ${currentTicket.status} to ${status}`,
        });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status },
        include: {
          user: { select: { name: true, email: true, pushToken: true } },
        },
      });

      // Push notification to the ticket owner
      if (updatedTicket.user?.pushToken) {
        await sendPushNotification(
          updatedTicket.user.pushToken,
          "🔧 Maintenance Update",
          `Your ticket "${updatedTicket.title}" status changed to ${updatedTicket.status.replace("_", " ")}`,
          { type: "TICKET_UPDATE", ticketId: updatedTicket.id },
        );
      }

      res.status(200).json({
        message: "Maintenance request updated",
        ticket: updatedTicket,
      });
    } catch (e) {
      console.error("Error updating maintenance request:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Announcements management
router.get(
  "/announcements",
  checkFeature("COMMUNICATION"),
  async (req, res) => {
    try {
      const { communityId } = req.query;
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });
      if (!community) {
        return res.status(404).json({ error: "No community found" });
      }

      const announcements = await prisma.announcement.findMany({
        where: { communityId: community.id },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ announcements });
    } catch (e) {
      console.error("Error fetching announcements:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/create-announcement",
  checkFeature("COMMUNICATION"),
  async (req, res) => {
    const { title, content, communityId } = req.body;
    const { userId } = req.user;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    if (!communityId) {
      return res.status(400).json({ error: "Community ID is required" });
    }

    try {
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });
      if (!community) {
        return res.status(404).json({ error: "No community found" });
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          communityId: community.id,
        },
        select: { id: true, title: true, content: true, createdAt: true },
      });

      // Push notification to all approved residents in the community (exclude admins)
      const residents = await prisma.user.findMany({
        where: {
          communityId: community.id,
          role: "RESIDENT",
          status: "APPROVED",
          pushToken: { not: null },
        },
        select: { pushToken: true },
      });
      await sendBulkPushNotifications(
        residents.map((r) => r.pushToken),
        "📢 New Announcement",
        title,
        { type: "ANNOUNCEMENT", announcementId: announcement.id },
      );

      res.status(201).json({ message: "Announcement created", announcement });
    } catch (e) {
      console.error("Error creating announcement:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/announcements/:id",
  checkFeature("COMMUNICATION"),
  async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.announcement.delete({
        where: { id: id },
      });

      res.status(200).json({ message: "Announcement deleted successfully" });
    } catch (e) {
      console.error("Error deleting announcement:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// === BLOCK MANAGEMENT ROUTES ===

// Get all blocks for a community
router.get("/blocks", async (req, res) => {
  try {
    const { communityId } = req.query;
    if (!communityId) {
      return res.status(400).json({ error: "Community ID is required" });
    }

    const blocks = await prisma.block.findMany({
      where: { communityId },
      include: {
        units: {
          include: {
            residents: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ blocks });
  } catch (e) {
    console.error("Error fetching blocks:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new block
router.post("/blocks", async (req, res) => {
  try {
    const { name, communityId } = req.body;

    if (!name || !communityId) {
      return res
        .status(400)
        .json({ error: "Name and community ID are required" });
    }

    // Check if block name already exists in the community
    const existingBlock = await prisma.block.findFirst({
      where: {
        name,
        communityId,
      },
    });

    if (existingBlock) {
      return res.status(400).json({
        error: "Block with this name already exists in the community",
      });
    }

    const block = await prisma.block.create({
      data: {
        name,
        communityId,
      },
      include: {
        units: true,
      },
    });

    res.status(201).json({ message: "Block created successfully", block });
  } catch (e) {
    console.error("Error creating block:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a block
router.put("/blocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const block = await prisma.block.findUnique({
      where: { id },
    });

    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Check if block name already exists in the community (excluding current block)
    const existingBlock = await prisma.block.findFirst({
      where: {
        name,
        communityId: block.communityId,
        NOT: { id },
      },
    });

    if (existingBlock) {
      return res.status(400).json({
        error: "Block with this name already exists in the community",
      });
    }

    const updatedBlock = await prisma.block.update({
      where: { id },
      data: { name },
      include: {
        units: {
          include: {
            residents: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });

    res
      .status(200)
      .json({ message: "Block updated successfully", block: updatedBlock });
  } catch (e) {
    console.error("Error updating block:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a block
router.delete("/blocks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const block = await prisma.block.findUnique({
      where: { id },
      include: {
        units: {
          include: {
            residents: true,
          },
        },
      },
    });

    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Check if block has units with residents
    const hasResidents = block.units.some((unit) => unit.residents.length > 0);
    if (hasResidents) {
      return res.status(400).json({
        error:
          "Cannot delete block with residents. Please reassign residents first.",
      });
    }

    await prisma.block.delete({
      where: { id },
    });

    res.status(200).json({ message: "Block deleted successfully" });
  } catch (e) {
    console.error("Error deleting block:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === UNIT MANAGEMENT ROUTES ===

// Get all units for a community or block
router.get("/units", async (req, res) => {
  try {
    const { communityId, blockId } = req.query;

    if (!communityId) {
      return res.status(400).json({ error: "Community ID is required" });
    }

    const whereClause = { communityId };
    if (blockId) {
      whereClause.blockId = blockId;
    }

    const units = await prisma.unit.findMany({
      where: whereClause,
      include: {
        block: {
          select: {
            id: true,
            name: true,
          },
        },
        residents: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: [
        {
          block: {
            name: "asc",
          },
        },
        {
          number: "asc",
        },
      ],
    });

    res.status(200).json({ units });
  } catch (e) {
    console.error("Error fetching units:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new unit
router.post("/units", async (req, res) => {
  try {
    const { number, blockId, communityId } = req.body;

    if (!number || !blockId || !communityId) {
      return res
        .status(400)
        .json({ error: "Number, block ID, and community ID are required" });
    }

    // Check if unit number already exists in the block
    const existingUnit = await prisma.unit.findFirst({
      where: {
        number,
        blockId,
      },
    });

    if (existingUnit) {
      return res
        .status(400)
        .json({ error: "Unit with this number already exists in the block" });
    }

    // Verify block exists and belongs to the community
    const block = await prisma.block.findFirst({
      where: {
        id: blockId,
        communityId,
      },
    });

    if (!block) {
      return res
        .status(400)
        .json({ error: "Block not found in the specified community" });
    }

    const unit = await prisma.unit.create({
      data: {
        number,
        blockId,
        communityId,
      },
      include: {
        block: {
          select: {
            id: true,
            name: true,
          },
        },
        residents: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json({ message: "Unit created successfully", unit });
  } catch (e) {
    console.error("Error creating unit:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a unit
router.put("/units/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { number, blockId } = req.body;

    if (!number) {
      return res.status(400).json({ error: "Number is required" });
    }

    const unit = await prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const updateData = { number };

    // If blockId is provided, validate and update it
    if (blockId && blockId !== unit.blockId) {
      const block = await prisma.block.findFirst({
        where: {
          id: blockId,
          communityId: unit.communityId,
        },
      });

      if (!block) {
        return res
          .status(400)
          .json({ error: "Block not found in the same community" });
      }

      updateData.blockId = blockId;
    }

    // Check if unit number already exists in the target block (excluding current unit)
    const targetBlockId = blockId || unit.blockId;
    const existingUnit = await prisma.unit.findFirst({
      where: {
        number,
        blockId: targetBlockId,
        NOT: { id },
      },
    });

    if (existingUnit) {
      return res
        .status(400)
        .json({ error: "Unit with this number already exists in the block" });
    }

    const updatedUnit = await prisma.unit.update({
      where: { id },
      data: updateData,
      include: {
        block: {
          select: {
            id: true,
            name: true,
          },
        },
        residents: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    res
      .status(200)
      .json({ message: "Unit updated successfully", unit: updatedUnit });
  } catch (e) {
    console.error("Error updating unit:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a unit
router.delete("/units/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        residents: true,
      },
    });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    // Check if unit has residents
    if (unit.residents.length > 0) {
      return res.status(400).json({
        error:
          "Cannot delete unit with residents. Please reassign residents first.",
      });
    }

    await prisma.unit.delete({
      where: { id },
    });

    res.status(200).json({ message: "Unit deleted successfully" });
  } catch (e) {
    console.error("Error deleting unit:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign resident to unit
router.post("/units/:unitId/assign-resident", async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    // Verify user exists and belongs to the same community
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        communityId: unit.communityId,
        role: "RESIDENT",
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "Resident not found in this community" });
    }

    // Update user's unit assignment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { unitId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        unitId: true,
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
    });

    res.status(200).json({
      message: "Resident assigned to unit successfully",
      user: updatedUser,
    });
  } catch (e) {
    console.error("Error assigning resident to unit:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove resident from unit
router.post("/units/:unitId/remove-resident", async (req, res) => {
  try {
    const { unitId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify user is assigned to this unit
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        unitId: unitId,
        role: "RESIDENT",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Resident not found in this unit" });
    }

    // Remove unit assignment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { unitId: null },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        unitId: true,
      },
    });

    res.status(200).json({
      message: "Resident removed from unit successfully",
      user: updatedUser,
    });
  } catch (e) {
    console.error("Error removing resident from unit:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === COMMUNITY CONFIGURATION ROUTES ===

// Get community configuration
router.get("/community", async (req, res) => {
  try {
    // Get the user's community ID from the authenticated user
    const user = req.user;

    if (!user || !user.communityId) {
      return res.status(404).json({
        success: false,
        message: "User not associated with any community",
      });
    }

    const community = await prisma.community.findUnique({
      where: { id: user.communityId },
      include: {
        facilityConfigs: true,
      },
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community configuration not found",
      });
    }

    // Convert facility types from enum to string for frontend
    const facilitiesWithStringTypes = (community.facilityConfigs || []).map(
      (facility) => ({
        ...facility,
        facilityType: facility.facilityType.toLowerCase(),
        priceType: facility.priceType?.toLowerCase(),
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        ...community,
        facilities: facilitiesWithStringTypes,
      },
    });
  } catch (error) {
    console.error("Error fetching community configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community configuration",
      error: error.message,
    });
  }
});

// Create or update community configuration
router.post("/community", async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      facilities,
      communityId,
      overstayLimits,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Community name is required",
      });
    }

    let community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (community) {
      // Update existing community
      community = await prisma.community.update({
        where: { id: community.id },
        data: {
          description: description?.trim() || null,
          address: address?.trim() || null,
          ...(overstayLimits !== undefined && { overstayLimits }),
        },
      });

      // Delete existing facility configurations and their associated facilities
      const existingConfigs = await prisma.facilityConfiguration.findMany({
        where: { communityId: community.id },
        select: { id: true },
      });

      // Delete actual facilities first (due to foreign key constraints)
      await prisma.facility.deleteMany({
        where: {
          configurationId: {
            in: existingConfigs.map((config) => config.id),
          },
        },
      });

      // Then delete facility configurations
      await prisma.facilityConfiguration.deleteMany({
        where: { communityId: community.id },
      });
    } else {
      // Create new community
      community = await prisma.community.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          address: address?.trim() || null,
        },
      });
    }

    // Create facility configurations if provided
    if (facilities && Array.isArray(facilities) && facilities.length > 0) {
      const facilityData = facilities.map((facility) => {
        // Convert string facility type to enum
        const facilityTypeEnum = facility.facilityType.toUpperCase();

        return {
          facilityType: facilityTypeEnum,
          enabled: facility.enabled || false,
          quantity: facility.quantity || 1,
          maxCapacity: facility.maxCapacity || 10,
          isPaid: facility.isPaid || false,
          price: facility.isPaid ? facility.price || 0 : 0,
          priceType: facility.isPaid
            ? facility.priceType?.toUpperCase() || "PER_HOUR"
            : null,
          operatingHours: facility.operatingHours || "09:00-21:00",
          rules: facility.rules?.trim() || null,
          communityId: community.id,
        };
      });

      // Create facility configurations
      const createdConfigs = await Promise.all(
        facilityData.map(async (configData) => {
          return await prisma.facilityConfiguration.create({
            data: configData,
          });
        }),
      );

      // Create actual facility records for enabled facilities
      for (const config of createdConfigs) {
        if (config.enabled) {
          const operatingHours = config.operatingHours || "09:00-21:00";
          const [openTime, closeTime] = operatingHours.split("-");

          const facilitiesToCreate = [];
          for (let i = 1; i <= config.quantity; i++) {
            facilitiesToCreate.push({
              name: `${config.facilityType
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
              facilityType: config.facilityType,
              open: openTime?.trim() || "09:00",
              close: closeTime?.trim() || "21:00",
              slotMins: 60,
              capacity: config.maxCapacity || 10,
              communityId: community.id,
              configurationId: config.id,
            });
          }

          if (facilitiesToCreate.length > 0) {
            await prisma.facility.createMany({
              data: facilitiesToCreate,
            });
          }
        }
      }
    }

    // Fetch the updated community with facilities
    const updatedCommunity = await prisma.community.findUnique({
      where: { id: community.id },
      select: {
        facilityConfigs: true,
      },
    });

    // Convert facility types back to string for frontend
    const facilitiesWithStringTypes = updatedCommunity.facilityConfigs.map(
      (facility) => ({
        ...facility,
        facilityType: facility.facilityType.toLowerCase(),
        priceType: facility.priceType?.toLowerCase(),
      }),
    );

    res.status(200).json({
      success: true,
      message: "Community configuration saved successfully",
      data: {
        ...updatedCommunity,
        facilities: facilitiesWithStringTypes,
      },
    });
  } catch (error) {
    console.error("Error saving community configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save community configuration",
      error: error.message,
    });
  }
});

// Get all enabled facilities for booking purposes
router.get("/community/facilities", async (req, res) => {
  try {
    // Get the user's community ID from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { communityId: true },
    });

    if (!user || !user.communityId) {
      return res
        .status(400)
        .json({ error: "User not associated with any community" });
    }

    const community = await prisma.community.findUnique({
      where: { id: user.communityId },
      include: {
        facilityConfigs: true,
      },
    });

    if (!community) {
      return res.status(200).json([]); // Return empty array if no community
    }

    // Convert facility types to lowercase for frontend
    const facilities = (community.facilityConfigs || []).map((facility) => ({
      ...facility,
      facilityType: facility.facilityType.toLowerCase(),
      priceType: facility.priceType?.toLowerCase(),
    }));

    res.status(200).json(facilities);
  } catch (error) {
    console.error("Error fetching facility configurations:", error);
    res.status(500).json({ error: "Failed to fetch facility configurations" });
  }
});

// Helper function to create actual facilities from configuration
async function createFacilitiesFromConfig(facilityConfig, communityId) {
  const facilitiesToCreate = [];
  const operatingHours = facilityConfig.operatingHours || "09:00-21:00";
  const [openTime, closeTime] = operatingHours.split("-");

  for (let i = 1; i <= facilityConfig.quantity; i++) {
    facilitiesToCreate.push({
      name: `${facilityConfig.facilityType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
      facilityType: facilityConfig.facilityType,
      open: openTime?.trim() || "09:00",
      close: closeTime?.trim() || "21:00",
      slotMins: 60, // Default slot duration
      capacity: facilityConfig.maxCapacity,
      communityId: communityId,
      configurationId: facilityConfig.id,
    });
  }

  if (facilitiesToCreate.length > 0) {
    await prisma.facility.createMany({
      data: facilitiesToCreate,
    });
  }
}

// Save facility configurations
router.post("/community/facilities", async (req, res) => {
  try {
    const { facilities } = req.body;

    // Get the user's community ID from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { communityId: true },
    });

    if (!user || !user.communityId) {
      return res
        .status(400)
        .json({ error: "User not associated with any community" });
    }

    const community = await prisma.community.findUnique({
      where: { id: user.communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Begin transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Delete existing facilities and configurations
      await tx.facility.deleteMany({
        where: { communityId: community.id },
      });

      await tx.facilityConfiguration.deleteMany({
        where: { communityId: community.id },
      });

      // Create new facility configurations and actual facilities
      if (facilities && Array.isArray(facilities) && facilities.length > 0) {
        for (const facility of facilities) {
          // Create facility configuration
          const facilityConfig = await tx.facilityConfiguration.create({
            data: {
              facilityType: facility.facilityType.toUpperCase(),
              enabled: facility.enabled || false,
              quantity: facility.quantity || 1,
              maxCapacity: facility.maxCapacity || 10,
              isPaid: facility.isPaid || false,
              price: facility.isPaid ? facility.price || 0 : 0,
              priceType: facility.isPaid
                ? facility.priceType?.toUpperCase() || "PER_HOUR"
                : null,
              operatingHours: facility.operatingHours || "09:00-21:00",
              rules: facility.rules?.trim() || null,
              communityId: community.id,
            },
          });

          // If enabled, create actual facility records
          if (facility.enabled) {
            const operatingHours = facility.operatingHours || "09:00-21:00";
            const [openTime, closeTime] = operatingHours.split("-");

            const facilitiesToCreate = [];
            for (let i = 1; i <= (facility.quantity || 1); i++) {
              facilitiesToCreate.push({
                name: `${facility.facilityType
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
                facilityType: facility.facilityType.toUpperCase(),
                open: openTime?.trim() || "09:00",
                close: closeTime?.trim() || "21:00",
                slotMins: 60, // Default slot duration
                capacity: facility.maxCapacity || 10,
                communityId: community.id,
                configurationId: facilityConfig.id,
              });
            }

            if (facilitiesToCreate.length > 0) {
              await tx.facility.createMany({
                data: facilitiesToCreate,
              });
            }
          }
        }
      }
    });

    res.status(200).json({ message: "Facilities saved successfully" });
  } catch (error) {
    console.error("Error saving facilities:", error);
    res.status(500).json({ error: "Failed to save facilities" });
  }
});

router.get(
  "/community/facilities/enabled",
  authMiddleware,
  async (req, res) => {
    try {
      // Get the user's community ID from the authenticated user
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { communityId: true },
      });

      if (!user || !user.communityId) {
        return res.status(400).json({
          success: false,
          message: "User not associated with any community",
        });
      }

      const community = await prisma.community.findUnique({
        where: { id: user.communityId },
        include: {
          facilityConfigs: {
            where: { enabled: true },
            include: {
              facilities: true,
            },
          },
        },
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community configuration not found",
        });
      }

      // Get enabled facilities with their configurations
      const enabledFacilities = [];

      for (const facilityConfig of community.facilityConfigs) {
        // If no actual facilities exist for this config, create them
        let existingFacilities = facilityConfig.facilities;

        if (existingFacilities.length === 0) {
          // Create facilities on-demand (fallback for old data)
          await createFacilitiesFromConfig(facilityConfig, user.communityId);

          // Fetch the newly created facilities
          existingFacilities = await prisma.facility.findMany({
            where: {
              configurationId: facilityConfig.id,
              communityId: user.communityId,
            },
          });
        }

        // Add facilities with configuration data
        enabledFacilities.push(
          ...existingFacilities.map((facility) => ({
            ...facility,
            facilityType: facility.facilityType.toLowerCase(),
            configuration: {
              ...facilityConfig,
              facilityType: facilityConfig.facilityType.toLowerCase(),
              priceType: facilityConfig.priceType?.toLowerCase(),
            },
          })),
        );
      }

      res.status(200).json({
        success: true,
        data: {
          community: {
            id: community.id,
            name: community.name,
            description: community.description,
            address: community.address,
          },
          facilities: enabledFacilities,
        },
      });
    } catch (error) {
      console.error("Error fetching enabled facilities:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch enabled facilities",
        error: error.message,
      });
    }
  },
);

// Update specific facility configuration
router.patch(
  "/community/facility/:facilityType",
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityType } = req.params;
      const facilityData = req.body;

      // Convert string to enum
      const facilityTypeEnum = facilityType.toUpperCase();

      // Find the community
      const { communityId } = req.query;
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });
      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found",
        });
      }

      // Update or create facility configuration
      const facility = await prisma.facilityConfiguration.upsert({
        where: {
          communityId_facilityType: {
            communityId: community.id,
            facilityType: facilityTypeEnum,
          },
        },
        create: {
          facilityType: facilityTypeEnum,
          enabled: facilityData.enabled || false,
          quantity: facilityData.quantity || 1,
          maxCapacity: facilityData.maxCapacity || 10,
          isPaid: facilityData.isPaid || false,
          price: facilityData.isPaid ? facilityData.price || 0 : 0,
          priceType: facilityData.isPaid
            ? facilityData.priceType?.toUpperCase() || "PER_HOUR"
            : null,
          operatingHours: facilityData.operatingHours || "09:00-21:00",
          rules: facilityData.rules?.trim() || null,
          communityId: community.id,
        },
        update: {
          enabled: facilityData.enabled,
          quantity: facilityData.quantity,
          maxCapacity: facilityData.maxCapacity,
          isPaid: facilityData.isPaid,
          price: facilityData.isPaid ? facilityData.price : 0,
          priceType: facilityData.isPaid
            ? facilityData.priceType?.toUpperCase() || "PER_HOUR"
            : null,
          operatingHours: facilityData.operatingHours,
          rules: facilityData.rules?.trim() || null,
        },
      });

      // If facility is enabled, ensure actual facility records exist
      if (facilityData.enabled) {
        const existingFacilities = await prisma.facility.findMany({
          where: {
            facilityType: facilityTypeEnum,
            configurationId: facility.id,
          },
        });

        // Update existing facilities with new configuration data
        if (existingFacilities.length > 0) {
          const operatingHours = facilityData.operatingHours || "09:00-21:00";
          const [openTime, closeTime] = operatingHours.split("-");

          await prisma.facility.updateMany({
            where: {
              facilityType: facilityTypeEnum,
              configurationId: facility.id,
            },
            data: {
              open: openTime?.trim() || "09:00",
              close: closeTime?.trim() || "21:00",
              capacity: facilityData.maxCapacity || 10,
            },
          });
        }

        // Create missing facilities if quantity increased
        const currentCount = existingFacilities.length;
        const targetCount = facilityData.quantity || 1;

        if (currentCount < targetCount) {
          const operatingHours = facilityData.operatingHours || "09:00-21:00";
          const [openTime, closeTime] = operatingHours.split("-");

          const facilitiesToCreate = [];
          for (let i = currentCount + 1; i <= targetCount; i++) {
            facilitiesToCreate.push({
              name: `${facilityTypeEnum
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
              facilityType: facilityTypeEnum,
              open: openTime?.trim() || "09:00",
              close: closeTime?.trim() || "21:00",
              slotMins: 60,
              capacity: facilityData.maxCapacity || 10,
              communityId: community.id,
              configurationId: facility.id,
            });
          }

          await prisma.facility.createMany({
            data: facilitiesToCreate,
          });
        } else if (currentCount > targetCount) {
          // Remove excess facilities
          const facilitiesToRemove = existingFacilities.slice(targetCount);
          await prisma.facility.deleteMany({
            where: {
              id: {
                in: facilitiesToRemove.map((f) => f.id),
              },
            },
          });
        }

        // If no existing facilities and we need to create them
        if (currentCount === 0 && targetCount > 0) {
          const operatingHours = facilityData.operatingHours || "09:00-21:00";
          const [openTime, closeTime] = operatingHours.split("-");

          const facilitiesToCreate = [];
          for (let i = 1; i <= targetCount; i++) {
            facilitiesToCreate.push({
              name: `${facilityTypeEnum
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
              facilityType: facilityTypeEnum,
              open: openTime?.trim() || "09:00",
              close: closeTime?.trim() || "21:00",
              slotMins: 60,
              capacity: facilityData.maxCapacity || 10,
              communityId: community.id,
              configurationId: facility.id,
            });
          }

          await prisma.facility.createMany({
            data: facilitiesToCreate,
          });
        }
      } else {
        // If facility is disabled, remove all actual facility records
        await prisma.facility.deleteMany({
          where: {
            facilityType: facilityTypeEnum,
            configurationId: facility.id,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: "Facility configuration updated successfully",
        data: {
          ...facility,
          facilityType: facility.facilityType.toLowerCase(),
          priceType: facility.priceType?.toLowerCase(),
        },
      });
    } catch (error) {
      console.error("Error updating facility configuration:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update facility configuration",
        error: error.message,
      });
    }
  },
);

// Delete community configuration
router.delete("/community", async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community configuration not found",
      });
    }

    // Delete all related facilities first
    await prisma.facility.deleteMany({
      where: {
        configuration: {
          communityId: community.id,
        },
      },
    });

    // Delete community (facility configurations will be cascade deleted)
    await prisma.community.delete({
      where: { id: community.id },
    });

    res.status(200).json({
      success: true,
      message: "Community configuration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting community configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete community configuration",
      error: error.message,
    });
  }
});

// Get facility types enum for frontend
router.get("/community/facility-types", async (req, res) => {
  try {
    const facilityTypes = Object.values(FacilityType).map((type) => ({
      id: type.toLowerCase(),
      name: type
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      enum: type,
    }));

    const priceTypes = Object.values(PriceType).map((type) => ({
      id: type.toLowerCase(),
      name: type
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      enum: type,
    }));

    res.status(200).json({
      success: true,
      data: {
        facilityTypes,
        priceTypes,
      },
    });
  } catch (error) {
    console.error("Error fetching facility types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch facility types",
      error: error.message,
    });
  }
});

router.delete(
  "/bookings/:id",
  checkFeature("AMENITY_BOOKING"),
  async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.booking.delete({ where: { id } });
      res.json({ message: "Booking deleted" });
    } catch (err) {
      console.error("Error deleting booking:", err);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  },
);

router.get("/gatekeepers", async (req, res) => {
  try {
    const { communityId } = req.query;
    if (!communityId) {
      return res
        .status(400)
        .json({ error: "communityId query parameter is required" });
    }
    const gatekeepers = await prisma.user.findMany({
      where: { communityId, role: "GATEKEEPER" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
    res.json(gatekeepers);
  } catch (err) {
    console.error("Error fetching gatekeepers:", err);
    res.status(500).json({ error: "Failed to fetch gatekeepers" });
  }
});

router.post("/gatekeeper-signup", async (req, res) => {
  const { name, email, password, communityId } = req.body;

  try {
    if (!communityId) {
      return res.status(400).json({
        error: "Community selection is required.",
      });
    }
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(400).json({
        error: "Selected community not found. Please select a valid community.",
      });
    }
    const existingGatekeeper = await prisma.user.findUnique({
      where: { email },
    });
    if (existingGatekeeper) {
      return res
        .status(400)
        .json({ error: "Gatekeeper with this email exists" });
    }
    const gatekeeper = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role: "GATEKEEPER",
        status: "APPROVED",
        communityId: community.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        communityId: true,
      },
    });
    const jwttoken = jwt.sign(
      { userId: gatekeeper.id },
      process.env.JWT_SECRET,
    );
    return res.status(201).json({ user: gatekeeper, jwttoken });
  } catch (e) {
    console.error("Error signing up gatekeeper:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/gatekeepers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const gatekeeper = await prisma.user.findUnique({
      where: { id },
    });
    if (!gatekeeper) {
      return res.status(404).json({ error: "Gatekeeper not found" });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: "Gatekeeper deleted" });
  } catch (err) {
    console.error("Error deleting gatekeeper:", err);
    res.status(500).json({ error: "Failed to delete gatekeeper" });
  }
});

router.get("/visitor", checkFeature("VISITOR_MANAGEMENT"), async (req, res) => {
  const { communityId, from, to } = req.query;

  if (!communityId || !from || !to) {
    return res
      .status(400)
      .json({ error: "All fields (communityId, from, to) are required" });
  }

  try {
    // Convert query params to Date objects
    const fromDate = new Date(from);
    fromDate.setUTCHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);

    const visitors = await prisma.visitor.findMany({
      where: {
        communityId: communityId,
        visitDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
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

    return res.status(200).json({ visitors });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get visitors" });
  }
});

router.post(
  "/pdf",
  upload.single("file"),
  checkFeature("DOCUMENTS_UPLOADING"),
  async (req, res) => {
    try {
      const { file } = req;
      const { communityId, name } = req.body;

      if (!communityId)
        return res.status(400).json({ error: "CommunityId required" });

      if (!file) return res.status(400).json({ error: "PDF file is required" });

      const pdfBytes = file.buffer;

      const result = await prisma.pdfs.create({
        data: {
          name: name || file.originalname,
          content: pdfBytes,
          communityId: communityId,
        },
      });

      res.status(200).json({ message: "PDF uploaded successfully", result });
    } catch (e) {
      console.error("Error uploading PDF:", e);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.get("/pdfs", checkFeature("DOCUMENTS_UPLOADING"), async (req, res) => {
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

router.get(
  "/pdf/:id",
  checkFeature("DOCUMENTS_UPLOADING"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const pdf = await prisma.pdfs.findUnique({ where: { id } });

      if (!pdf) return res.status(404).send("PDF not found");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${pdf.name}.pdf"`,
      );

      res.end(pdf.content); // IMPORTANT!!!
    } catch (e) {
      console.error("Error fetching PDFs:", e);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.delete(
  "/pdf/:id",
  checkFeature("DOCUMENTS_UPLOADING"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "PDF ID required" });
      }

      const existingPdf = await prisma.pdfs.findUnique({
        where: { id },
      });

      if (!existingPdf) {
        return res.status(404).json({ error: "PDF not found" });
      }

      await prisma.pdfs.delete({
        where: { id },
      });

      res.status(200).json({ message: "PDF deleted successfully" });
    } catch (e) {
      console.error("Error deleting PDF:", e);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.post(
  "/notice-board/",
  checkFeature("NOTICE_BOARD"),
  async (req, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const { title, content, category, isPinned } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ success: false, message: "Title and content are required" });
      }

      const notice = await prisma.notice.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          category: category?.trim() || "General",
          isPinned: isPinned || false,
          communityId: req.user.communityId,
        },
      });

      // Send push notification to all community residents
      const residents = await prisma.user.findMany({
        where: {
          communityId: req.user.communityId,
          role: "RESIDENT",
          status: "APPROVED",
          pushToken: { not: null },
        },
        select: { pushToken: true },
      });

      if (residents.length > 0) {
        const tokens = residents.map((r) => r.pushToken);
        await sendBulkPushNotifications(tokens, "New Notice", `${title}`, {
          type: "notice",
          noticeId: notice.id,
        });
      }

      res.status(201).json({ success: true, data: notice });
    } catch (error) {
      console.error("Error creating notice:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create notice" });
    }
  },
);

// ─── PUT update a notice (ADMIN only) ───────────────────────
router.put(
  "/notice-board/:id",
  checkFeature("NOTICE_BOARD"),
  async (req, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const { id } = req.params;
      const { title, content, category, isPinned } = req.body;

      const existing = await prisma.notice.findFirst({
        where: { id, communityId: req.user.communityId },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Notice not found" });
      }

      const notice = await prisma.notice.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(content && { content: content.trim() }),
          ...(category !== undefined && {
            category: category?.trim() || "General",
          }),
          ...(isPinned !== undefined && { isPinned }),
        },
      });

      res.json({ success: true, data: notice });
    } catch (error) {
      console.error("Error updating notice:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update notice" });
    }
  },
);

// ─── DELETE a notice (ADMIN only) ───────────────────────────
router.delete(
  "/notice-board/:id",
  checkFeature("NOTICE_BOARD"),
  async (req, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const { id } = req.params;

      const existing = await prisma.notice.findFirst({
        where: { id, communityId: req.user.communityId },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Notice not found" });
      }

      await prisma.notice.delete({ where: { id } });

      res.json({ success: true, message: "Notice deleted" });
    } catch (error) {
      console.error("Error deleting notice:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete notice" });
    }
  },
);

router.get("/surveys/:id", checkFeature("SURVEYS"), async (req, res) => {
  try {
    const { communityId, id: userId } = req.user;
    const { id } = req.params;

    const survey = await prisma.survey.findFirst({
      where: { id, communityId },
      include: {
        questions: true,
        responses:
          req.user.role === "ADMIN"
            ? {
                include: {
                  user: {
                    select: {
                      id: true,
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
              }
            : { where: { userId } },
        _count: { select: { responses: true } },
      },
    });

    if (!survey) {
      return res
        .status(404)
        .json({ success: false, message: "Survey not found" });
    }

    res.json({ success: true, data: survey });
  } catch (error) {
    console.error("Error fetching survey:", error);
    res.status(500).json({ success: false, message: "Failed to fetch survey" });
  }
});

// ─── POST create a new survey (ADMIN only) ──────────────────
router.post("/surveys/", checkFeature("SURVEYS"), async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { title, description, startDate, endDate, questions } = req.body;

    if (!title || !endDate || !questions || !questions.length) {
      return res.status(400).json({
        success: false,
        message: "Title, endDate, and at least one question are required",
      });
    }

    const survey = await prisma.survey.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        communityId: req.user.communityId,
        questions: {
          create: questions.map((q) => ({
            question: q.question.trim(),
            type: q.type,
            options: q.options || null,
          })),
        },
      },
      include: { questions: true },
    });

    // Notify residents
    const residents = await prisma.user.findMany({
      where: {
        communityId: req.user.communityId,
        role: "RESIDENT",
        status: "APPROVED",
        pushToken: { not: null },
      },
      select: { pushToken: true },
    });

    if (residents.length > 0) {
      const tokens = residents.map((r) => r.pushToken);
      await sendBulkPushNotifications(
        tokens,
        "New Survey",
        `${title} — share your opinion!`,
        { type: "survey", surveyId: survey.id },
      );
    }

    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    console.error("Error creating survey:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create survey" });
  }
});

// ─── POST respond to a survey ───────────────────────────────

// ─── DELETE a survey (ADMIN only) ───────────────────────────
router.delete("/surveys/:id", checkFeature("SURVEYS"), async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { id } = req.params;

    const existing = await prisma.survey.findFirst({
      where: { id, communityId: req.user.communityId },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Survey not found" });
    }

    await prisma.survey.delete({ where: { id } });

    res.json({ success: true, message: "Survey deleted" });
  } catch (error) {
    console.error("Error deleting survey:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete survey" });
  }
});

router.post("/polls/", checkFeature("ELECTION_POLLS"), async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { title, description, startDate, endDate, candidates } = req.body;

    if (!title || !endDate || !candidates || candidates.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Title, endDate, and at least two candidates are required",
      });
    }

    const poll = await prisma.poll.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        communityId: req.user.communityId,
        candidates: {
          create: candidates.map((c) => ({
            name: c.name.trim(),
            description: c.description?.trim() || null,
          })),
        },
      },
      include: { candidates: true },
    });

    // Notify residents
    const residents = await prisma.user.findMany({
      where: {
        communityId: req.user.communityId,
        role: "RESIDENT",
        status: "APPROVED",
        pushToken: { not: null },
      },
      select: { pushToken: true },
    });

    if (residents.length > 0) {
      const tokens = residents.map((r) => r.pushToken);
      await sendBulkPushNotifications(
        tokens,
        "New Poll",
        `${title} — cast your vote!`,
        { type: "poll", pollId: poll.id },
      );
    }

    res.status(201).json({ success: true, data: poll });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({ success: false, message: "Failed to create poll" });
  }
});

// ─── POST vote in a poll ────────────────────────────────────

// ─── DELETE a poll (ADMIN only) ─────────────────────────────
router.delete(
  "/polls/:id",
  checkFeature("ELECTION_POLLS"),
  async (req, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const { id } = req.params;

      const existing = await prisma.poll.findFirst({
        where: { id, communityId: req.user.communityId },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Poll not found" });
      }

      await prisma.poll.delete({ where: { id } });

      res.json({ success: true, message: "Poll deleted" });
    } catch (error) {
      console.error("Error deleting poll:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete poll" });
    }
  },
);

router.get("/notice-board/", checkFeature("NOTICE_BOARD"), async (req, res) => {
  try {
    const { communityId } = req.user;

    const notices = await prisma.notice.findMany({
      where: { communityId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    res.json({ success: true, data: notices });
  } catch (error) {
    console.error("Error fetching notices:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch notices" });
  }
});

router.get("/surveys/", checkFeature("SURVEYS"), async (req, res) => {
  try {
    const { communityId, id: userId } = req.user;

    const surveys = await prisma.survey.findMany({
      where: { communityId },
      include: {
        questions: true,
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each survey, check if the current user has already responded
    const userResponses = await prisma.surveyResponse.findMany({
      where: {
        userId,
        surveyId: { in: surveys.map((s) => s.id) },
      },
      select: { surveyId: true },
    });

    const respondedSet = new Set(userResponses.map((r) => r.surveyId));

    const data = surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      startDate: survey.startDate,
      endDate: survey.endDate,
      createdAt: survey.createdAt,
      questionCount: survey.questions.length,
      responseCount: survey._count.responses,
      hasResponded: respondedSet.has(survey.id),
      questions: survey.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
      })),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch surveys" });
  }
});

router.post(
  "/surveys/:id/respond",
  checkFeature("SURVEYS"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { answers } = req.body;
      const userId = req.user.id;

      if (!answers) {
        return res
          .status(400)
          .json({ success: false, message: "Answers are required" });
      }

      // Verify survey exists and belongs to user's community
      const survey = await prisma.survey.findFirst({
        where: { id, communityId: req.user.communityId },
      });

      if (!survey) {
        return res
          .status(404)
          .json({ success: false, message: "Survey not found" });
      }

      // Check if survey is still open
      if (new Date() > new Date(survey.endDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Survey has ended" });
      }

      // Check if user already responded
      const existingResponse = await prisma.surveyResponse.findUnique({
        where: { surveyId_userId: { surveyId: id, userId } },
      });

      if (existingResponse) {
        return res.status(400).json({
          success: false,
          message: "You have already responded to this survey",
        });
      }

      const response = await prisma.surveyResponse.create({
        data: {
          surveyId: id,
          userId,
          answers,
        },
      });

      res.status(201).json({ success: true, data: response });
    } catch (error) {
      console.error("Error submitting survey response:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to submit response" });
    }
  },
);

router.get("/polls/", checkFeature("ELECTION_POLLS"), async (req, res) => {
  try {
    const { communityId, id: userId } = req.user;

    const polls = await prisma.poll.findMany({
      where: { communityId },
      include: {
        candidates: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check which polls the user has voted in
    const userVotes = await prisma.pollVote.findMany({
      where: {
        userId,
        pollId: { in: polls.map((p) => p.id) },
      },
      select: { pollId: true, candidateId: true },
    });

    const voteMap = new Map(userVotes.map((v) => [v.pollId, v.candidateId]));

    const data = polls.map((poll) => ({
      id: poll.id,
      title: poll.title,
      description: poll.description,
      startDate: poll.startDate,
      endDate: poll.endDate,
      createdAt: poll.createdAt,
      totalVotes: poll._count.votes,
      hasVoted: voteMap.has(poll.id),
      userVotedFor: voteMap.get(poll.id) || null,
      candidates: poll.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        votes: c._count.votes,
      })),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).json({ success: false, message: "Failed to fetch polls" });
  }
});

// ─── GET single poll ────────────────────────────────────────
router.get("/polls/:id", checkFeature("ELECTION_POLLS"), async (req, res) => {
  try {
    const { communityId, id: userId, role } = req.user;
    const { id } = req.params;

    const isAdmin = role === "ADMIN";

    const poll = await prisma.poll.findFirst({
      where: { id, communityId },
      include: {
        candidates: {
          include: {
            _count: { select: { votes: true } },
            // Include voter details for admin
            ...(isAdmin && {
              votes: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      unit: {
                        select: {
                          number: true,
                          block: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },
        _count: { select: { votes: true } },
      },
    });

    if (!poll) {
      return res
        .status(404)
        .json({ success: false, message: "Poll not found" });
    }

    const userVote = await prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId: id, userId } },
    });

    res.json({
      success: true,
      data: {
        ...poll,
        totalVotes: poll._count.votes,
        hasVoted: !!userVote,
        userVotedFor: userVote?.candidateId || null,
        candidates: poll.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          votes: c._count.votes,
          ...(isAdmin && {
            voters: (c.votes || []).map((v) => ({
              id: v.user.id,
              name: v.user.name,
              email: v.user.email,
              unit: v.user.unit?.number || null,
              block: v.user.unit?.block?.name || null,
            })),
          }),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({ success: false, message: "Failed to fetch poll" });
  }
});

router.post(
  "/polls/:id/vote",
  checkFeature("ELECTION_POLLS"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { candidateId } = req.body;
      const userId = req.user.id;

      if (!candidateId) {
        return res
          .status(400)
          .json({ success: false, message: "candidateId is required" });
      }

      // Verify poll exists and belongs to user's community
      const poll = await prisma.poll.findFirst({
        where: { id, communityId: req.user.communityId },
      });

      if (!poll) {
        return res
          .status(404)
          .json({ success: false, message: "Poll not found" });
      }

      // Check if poll is still open
      if (new Date() > new Date(poll.endDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Poll has ended" });
      }

      if (new Date() < new Date(poll.startDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Poll has not started yet" });
      }

      // Check if user already voted
      const existingVote = await prisma.pollVote.findUnique({
        where: { pollId_userId: { pollId: id, userId } },
      });

      if (existingVote) {
        return res.status(400).json({
          success: false,
          message: "You have already voted in this poll",
        });
      }

      // Verify candidate belongs to this poll
      const candidate = await prisma.pollCandidate.findFirst({
        where: { id: candidateId, pollId: id },
      });

      if (!candidate) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid candidate for this poll" });
      }

      const vote = await prisma.pollVote.create({
        data: {
          pollId: id,
          candidateId,
          userId,
        },
      });

      res.status(201).json({ success: true, data: vote });
    } catch (error) {
      console.error("Error casting vote:", error);
      res.status(500).json({ success: false, message: "Failed to cast vote" });
    }
  },
);

// ─── Vehicle Management (Admin) ──────────────────────────────

// GET /admin/vehicles?communityId&status
router.get(
  "/vehicles",
  checkFeature("VEHICLE_MANAGEMENT"),
  async (req, res) => {
    const { communityId, status } = req.query;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    const where = { communityId };
    if (status) where.status = status.toUpperCase();

    try {
      const vehicles = await prisma.vehicle.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
      });

      const result = vehicles.map((v) => ({
        ...v,
        user: {
          name: v.user?.name || "Unknown",
          unitNumber: v.user?.unit?.number || "N/A",
          blockName: v.user?.unit?.block?.name || "N/A",
        },
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /admin/vehicles/:id
router.patch(
  "/vehicles/:id",
  checkFeature("VEHICLE_MANAGEMENT"),
  async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ["APPROVED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: "status must be APPROVED or REJECTED" });
    }

    try {
      const data = { status };
      if (status === "REJECTED" && rejectionReason) {
        data.rejectionReason = rejectionReason;
      }
      const vehicle = await prisma.vehicle.update({ where: { id }, data });
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ─── Parking Management (Admin) ──────────────────────────────

// GET /admin/parking/spots?communityId
router.get(
  "/parking/spots",
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { communityId } = req.query;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    try {
      const spots = await prisma.parkingSpot.findMany({
        where: { communityId },
        orderBy: { spotNumber: "asc" },
      });
      res.json(spots);
    } catch (error) {
      console.error("Error fetching parking spots:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// POST /admin/parking/spots
router.post(
  "/parking/spots",
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const {
      spotNumber,
      spotType,
      floor,
      block,
      pricePerDay,
      isAvailable,
      communityId,
    } = req.body;

    if (!spotNumber || !spotType || !communityId || pricePerDay === undefined) {
      return res.status(400).json({
        error: "spotNumber, spotType, pricePerDay and communityId are required",
      });
    }

    const validTypes = ["TWO_WHEELER", "FOUR_WHEELER", "EV"];
    if (!validTypes.includes(spotType)) {
      return res.status(400).json({ error: `Invalid spotType: ${spotType}` });
    }

    try {
      const spot = await prisma.parkingSpot.create({
        data: {
          spotNumber,
          spotType,
          floor,
          block,
          pricePerDay: parseFloat(pricePerDay),
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
          communityId,
        },
      });
      res.status(201).json(spot);
    } catch (error) {
      console.error("Error creating parking spot:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// PATCH /admin/parking/spots/:id
router.patch(
  "/parking/spots/:id",
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({ error: "isAvailable is required" });
    }

    try {
      const spot = await prisma.parkingSpot.update({
        where: { id },
        data: { isAvailable: Boolean(isAvailable) },
      });
      res.json(spot);
    } catch (error) {
      console.error("Error updating parking spot:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// DELETE /admin/parking/spots/:id
router.delete(
  "/parking/spots/:id",
  checkFeature("RENT_A_PARKING"),
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.parkingSpot.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

// ── GET /admin/visitors (all visitors, no date filter) ─────────
router.get(
  "/visitors",
  checkFeature("VISITOR_MANAGEMENT"),
  async (req, res) => {
    const { communityId } = req.query;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    try {
      const visitors = await prisma.visitor.findMany({
        where: { communityId },
        include: {
          user: {
            select: {
              name: true,
              id: true,
              unit: {
                select: {
                  id: true,
                  number: true,
                  block: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { visitDate: "desc" },
      });
      return res.status(200).json({ visitors });
    } catch (e) {
      console.error("Error fetching visitors:", e);
      res.status(500).json({ error: "Failed to get visitors" });
    }
  },
);

// ── POST /admin/residents/:userId/action (approve / reject) ────
router.post("/residents/:userId/action", async (req, res) => {
  const { userId } = req.params;
  const { action } = req.body;

  if (!action || !["approve", "reject"].includes(action)) {
    return res
      .status(400)
      .json({ error: "action must be 'approve' or 'reject'" });
  }

  try {
    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    const subject =
      action === "approve"
        ? "GateZen Account Approved"
        : "GateZen Account Rejected";
    const text =
      action === "approve"
        ? `Hello ${updatedUser.name},\n\nYour account has been approved. You can now log in to your GateZen account.\n\nThank you,\nGateZen Team`
        : `Hello ${updatedUser.name},\n\nWe regret to inform you that your account has been rejected. For more information, please contact support.\n\nThank you,\nGateZen Team`;

    await transporter
      .sendMail({
        from: process.env.EMAIL_ID,
        to: updatedUser.email,
        subject,
        text,
      })
      .catch((err) => console.error("Email send error:", err));

    res.status(200).json({ message: `Resident ${action}d`, user: updatedUser });
  } catch (e) {
    console.error("Error performing resident action:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /admin/residents/:id ─────────────────────────────────
router.patch("/residents/:id", async (req, res) => {
  const { id } = req.params;
  const { status, unitId } = req.body;
  try {
    const data = {};
    if (status) data.status = status;
    if (unitId !== undefined) data.unitId = unitId || null;

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        unitId: true,
        unit: { select: { id: true, number: true } },
      },
    });
    res.status(200).json({ user: updatedUser });
  } catch (e) {
    console.error("Error updating resident:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /admin/maintenance/:ticketId ────────────────────────
router.patch(
  "/maintenance/:ticketId",
  checkFeature("HELPDESK"),
  async (req, res) => {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ALLOWED_TRANSITIONS = {
      SUBMITTED: ["IN_PROGRESS"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["CLOSED"],
      CLOSED: [],
    };

    try {
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      if (!currentTicket)
        return res.status(404).json({ error: "Ticket not found" });

      if (status) {
        const allowed = ALLOWED_TRANSITIONS[currentTicket.status] || [];
        if (!allowed.includes(status)) {
          return res.status(400).json({
            error: `Invalid transition: cannot move from ${currentTicket.status} to ${status}`,
          });
        }
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ...(status && { status }) },
        include: {
          user: { select: { name: true, email: true, pushToken: true } },
        },
      });

      if (status && updatedTicket.user?.pushToken) {
        await sendPushNotification(
          updatedTicket.user.pushToken,
          "🔧 Maintenance Update",
          `Your ticket "${updatedTicket.title}" status changed to ${updatedTicket.status.replace("_", " ")}`,
          { type: "TICKET_UPDATE", ticketId: updatedTicket.id },
        );
      }

      res.status(200).json({ ticket: updatedTicket });
    } catch (e) {
      console.error("Error updating maintenance ticket:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── PATCH /admin/bookings/:bookingId ─────────────────────────
router.patch(
  "/bookings/:bookingId",
  checkFeature("AMENITY_BOOKING"),
  async (req, res) => {
    const { bookingId } = req.params;
    try {
      const booking = await prisma.booking.update({
        where: { id: bookingId },
        data: req.body,
        include: {
          user: { select: { name: true, email: true } },
          facility: { select: { name: true } },
        },
      });
      res.status(200).json({ booking });
    } catch (e) {
      console.error("Error updating booking:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── Meetings CRUD ─────────────────────────────────────────────
router.get("/meetings", async (req, res) => {
  try {
    const { communityId } = req.query;
    if (!communityId)
      return res.status(400).json({ error: "communityId is required" });

    const meetings = await prisma.meeting.findMany({
      where: { communityId },
      include: {
        rsvps: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { rsvps: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    res.status(200).json({ meetings });
  } catch (e) {
    console.error("Error fetching meetings:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/meetings", async (req, res) => {
  try {
    const { title, description, location, scheduledAt, agenda, communityId } =
      req.body;

    if (!title || !scheduledAt || !communityId) {
      return res
        .status(400)
        .json({ error: "title, scheduledAt, and communityId are required" });
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        scheduledAt: new Date(scheduledAt),
        agenda: Array.isArray(agenda) ? agenda : [],
        communityId,
      },
    });

    const residents = await prisma.user.findMany({
      where: {
        communityId,
        role: "RESIDENT",
        status: "APPROVED",
        pushToken: { not: null },
      },
      select: { pushToken: true },
    });
    if (residents.length > 0) {
      await sendBulkPushNotifications(
        residents.map((r) => r.pushToken),
        "📅 New Meeting Scheduled",
        title,
        { type: "MEETING", meetingId: meeting.id },
      );
    }

    res.status(201).json({ meeting });
  } catch (e) {
    console.error("Error creating meeting:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description, location, scheduledAt, agenda } = req.body;

    const data = {};
    if (title) data.title = title.trim();
    if (description !== undefined)
      data.description = description?.trim() || null;
    if (location !== undefined) data.location = location?.trim() || null;
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (agenda !== undefined) data.agenda = Array.isArray(agenda) ? agenda : [];

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data,
    });
    res.status(200).json({ meeting });
  } catch (e) {
    console.error("Error updating meeting:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    await prisma.meeting.delete({ where: { id: meetingId } });
    res.status(200).json({ message: "Meeting deleted" });
  } catch (e) {
    console.error("Error deleting meeting:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Overstay Routes ────────────────────────────────────────────
router.get(
  "/overstay",
  checkFeature("VISITOR_MANAGEMENT"),
  async (req, res) => {
    try {
      const { communityId } = req.query;
      if (!communityId)
        return res.status(400).json({ error: "communityId is required" });

      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { overstayLimits: true },
      });

      const limits = community?.overstayLimits || {};
      const defaultLimitHours = limits.defaultHours ?? 4;
      const cutoff = new Date(Date.now() - defaultLimitHours * 60 * 60 * 1000);

      const visitors = await prisma.visitor.findMany({
        where: {
          communityId,
          checkInAt: { lte: cutoff },
          checkOutAt: null,
        },
        include: {
          user: {
            select: {
              name: true,
              id: true,
              unit: {
                select: {
                  number: true,
                  block: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { checkInAt: "asc" },
      });

      res.status(200).json({ visitors });
    } catch (e) {
      console.error("Error fetching overstay visitors:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/overstay-settings", async (req, res) => {
  try {
    const { communityId } = req.query;
    if (!communityId)
      return res.status(400).json({ error: "communityId is required" });

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { overstayLimits: true },
    });
    if (!community)
      return res.status(404).json({ error: "Community not found" });

    res.status(200).json({ settings: community.overstayLimits || {} });
  } catch (e) {
    console.error("Error fetching overstay settings:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/overstay-settings", async (req, res) => {
  try {
    const { communityId, ...settings } = req.body;
    if (!communityId)
      return res.status(400).json({ error: "communityId is required" });

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { overstayLimits: true },
    });
    if (!community)
      return res.status(404).json({ error: "Community not found" });

    const updated = await prisma.community.update({
      where: { id: communityId },
      data: {
        overstayLimits: { ...(community.overstayLimits || {}), ...settings },
      },
    });

    res.status(200).json({ settings: updated.overstayLimits });
  } catch (e) {
    console.error("Error updating overstay settings:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/overstay/:visitorId/dismiss",
  checkFeature("VISITOR_MANAGEMENT"),
  async (req, res) => {
    try {
      const { visitorId } = req.params;
      const visitor = await prisma.visitor.findUnique({
        where: { id: visitorId },
      });
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });

      const updated = await prisma.visitor.update({
        where: { id: visitorId },
        data: { checkOutAt: new Date() },
      });

      res
        .status(200)
        .json({ message: "Overstay alert dismissed", visitor: updated });
    } catch (e) {
      console.error("Error dismissing overstay alert:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
