import express from "express";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import { UserStatus, FacilityType, PriceType } from "@prisma/client";
import { authMiddleware } from "../../middleware/auth.js";

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
          select: { id: true, name: true, email: true },
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
router.get("/bookings", async (req, res) => {
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
router.get("/maintenance", async (req, res) => {
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
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ maintenance });
  } catch (e) {
    console.error("Error fetching maintenance requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance/update", async (req, res) => {
  const { ticketId, status } = req.body;

  try {
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
      include: { user: { select: { name: true, email: true } } },
    });

    res
      .status(200)
      .json({ message: "Maintenance request updated", ticket: updatedTicket });
  } catch (e) {
    console.error("Error updating maintenance request:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Announcements management
router.get("/announcements", async (req, res) => {
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
});

router.post("/create-announcement", async (req, res) => {
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

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (e) {
    console.error("Error creating announcement:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/announcements/:id", async (req, res) => {
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
});

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
      })
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
    const { name, description, address, facilities, communityId } = req.body;

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
        })
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
      })
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
          }))
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
  }
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
  }
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

router.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.booking.delete({ where: { id } });
    broadcastEvent("booking", { action: "deleted", bookingId: id });
    res.json({ message: "Booking deleted" });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

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
      select: { id: true, name: true, email: true, status: true },
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
      process.env.JWT_SECRET
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

router.get("/visitor", async (req, res) => {
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

router.post("/pdf", upload.single("file"), async (req, res) => {
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

    if (!pdf) return res.status(404).send("PDF not found");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${pdf.name}.pdf"`);

    res.end(pdf.content); // IMPORTANT!!!
  } catch (e) {
    console.error("Error fetching PDFs:", e);
    res.status(500).json({ error: "Server error" });
  }
});


router.delete("/pdf/:id", async (req, res) => {
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
});


export default router;
