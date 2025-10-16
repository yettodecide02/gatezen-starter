import express from "express";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Apply auth middleware first, then check role
router.use(authMiddleware);
router.use(checkAuth);

function checkAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  if (req.user.role !== "GATEKEEPER") {
    return res.status(403).json({
      error: "Forbidden",
      userRole: req.user.role,
      requiredRole: "GATEKEEPER",
    });
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

router.get("/", async (req, res) => {
  try {
    const visitors = await prisma.visitor.findMany({
      where: {
        communityId: req.user.communityId,
        visitDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
          lt: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
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

    // Transform data to match frontend expectations
    const transformedVisitors = visitors.map((visitor) => ({
      ...visitor,
      hostName: visitor.user?.name || "Unknown",
      unitNumber: visitor.user?.unit?.number || "N/A",
      blockName: visitor.user?.unit?.block?.name || "N/A",
      // Determine status based on check-in/out times
      status: visitor.checkOutAt
        ? "checked_out"
        : visitor.checkInAt
        ? "checked_in"
        : "pending",
    }));

    res.json(transformedVisitors);
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Visitor ID is required" });
  }

  try {
    let updateData = { updatedAt: new Date() };

    // Handle different status updates
    switch (status?.toLowerCase()) {
      case "checked_in":
        updateData.checkInAt = new Date();
        break;
      case "checked_out":
        updateData.checkOutAt = new Date();
        break;
      case "pending":
        // Reset check-in/out times for pending status
        updateData.checkInAt = null;
        updateData.checkOutAt = null;
        break;
      default:
        // For any other status, just update the timestamp
        break;
    }

    const visitor = await prisma.visitor.update({
      where: { id: String(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        contact: true,
        vehicleNo: true,
        visitorType: true,
        visitDate: true,
        checkInAt: true,
        checkOutAt: true,
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
    });

    // Send notification email for GUEST type visitors when checked out
    if (
      visitor.visitorType === "GUEST" &&
      status?.toLowerCase() === "checked_out"
    ) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_ID,
          to: visitor.contact, // Assuming contact field contains email
          subject: "Visit Completed",
          text: `Dear ${visitor.name},\n\nYour visit on ${new Date(
            visitor.visitDate
          ).toLocaleString()} has been completed. Thank you for visiting.\n\nRegards,\nGateZen Team`,
        });
      } catch (error) {
        console.error("Error sending completion email:", error);
      }
    }

    // Transform response to match frontend expectations
    const transformedVisitor = {
      ...visitor,
      hostName: visitor.user?.name || "Unknown",
      unitNumber: visitor.user?.unit?.number || "N/A",
      blockName: visitor.user?.unit?.block?.name || "N/A",
      status: visitor.checkOutAt
        ? "checked_out"
        : visitor.checkInAt
        ? "checked_in"
        : "pending",
    };

    res.json(transformedVisitor);
  } catch (error) {
    console.error("Error updating visitor status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's visitor counts by status (based on check-in/out times)
    const [totalToday, checkedIn, checkedOut, pending] = await Promise.all([
      prisma.visitor.count({
        where: {
          communityId: req.user.communityId,
          visitDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.visitor.count({
        where: {
          communityId: req.user.communityId,
          visitDate: {
            gte: today,
            lt: tomorrow,
          },
          checkInAt: { not: null },
          checkOutAt: null,
        },
      }),
      prisma.visitor.count({
        where: {
          communityId: req.user.communityId,
          visitDate: {
            gte: today,
            lt: tomorrow,
          },
          checkOutAt: { not: null },
        },
      }),
      prisma.visitor.count({
        where: {
          communityId: req.user.communityId,
          visitDate: {
            gte: today,
            lt: tomorrow,
          },
          checkInAt: null,
          checkOutAt: null,
        },
      }),
    ]);

    // Get visitor type breakdown for today
    const visitorTypeStats = await prisma.visitor.groupBy({
      by: ["visitorType"],
      where: {
        communityId: req.user.communityId,
        visitDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      _count: {
        id: true,
      },
    });

    const typeBreakdown = {
      GUEST: 0,
      DELIVERY: 0,
      CAB_AUTO: 0,
    };

    visitorTypeStats.forEach((stat) => {
      typeBreakdown[stat.visitorType] = stat._count.id;
    });

    res.json({
      today: {
        pending,
        checkedIn,
        checkedOut,
        total: totalToday,
        typeBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching gatekeeper stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/scan", async (req, res) => {
  const { id, communityId } = req.query;

  if (!id || !communityId) {
    return res.status(400).json({ error: "Missing visitor ID or communityId" });
  }

  try {
    const visitor = await prisma.visitor.findFirst({
      where: {
        id: String(id), // Use String since schema uses UUID
        communityId: String(communityId), // Use String since schema uses UUID
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
    });

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    // Transform response to match frontend expectations
    const transformedVisitor = {
      ...visitor,
      hostName: visitor.user?.name || "Unknown",
      unitNumber: visitor.user?.unit?.number || "N/A",
      blockName: visitor.user?.unit?.block?.name || "N/A",
      status: visitor.checkOutAt
        ? "checked_out"
        : visitor.checkInAt
        ? "checked_in"
        : "pending",
    };

    return res.status(200).json({ visitor: transformedVisitor });
  } catch (error) {
    console.error("Error fetching visitor:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all visitors for a specific date range
router.get("/visitors", async (req, res) => {
  try {
    const { startDate, endDate, status, visitorType } = req.query;

    let whereClause = {
      communityId: req.user.communityId,
    };

    // Date range filter
    if (startDate || endDate) {
      whereClause.visitDate = {};
      if (startDate) {
        whereClause.visitDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.visitDate.lte = new Date(endDate);
      }
    }

    // Status filter based on check-in/out times
    if (status) {
      switch (status.toLowerCase()) {
        case "checked_in":
          whereClause.checkInAt = { not: null };
          whereClause.checkOutAt = null;
          break;
        case "checked_out":
          whereClause.checkOutAt = { not: null };
          break;
        case "pending":
          whereClause.checkInAt = null;
          whereClause.checkOutAt = null;
          break;
      }
    }

    // Visitor type filter
    if (visitorType) {
      whereClause.visitorType = visitorType.toUpperCase();
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

    // Transform data to include block and unit information
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

    res.json(transformedVisitors);
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Check in a visitor
router.post("/checkin/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findFirst({
      where: {
        id: String(id),
        communityId: req.user.communityId,
      },
    });

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    if (visitor.checkInAt) {
      return res.status(400).json({ error: "Visitor already checked in" });
    }

    const updatedVisitor = await prisma.visitor.update({
      where: { id: String(id) },
      data: {
        checkInAt: new Date(),
        updatedAt: new Date(),
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
    });

    const transformedVisitor = {
      ...updatedVisitor,
      hostName: updatedVisitor.user?.name || "Unknown",
      unitNumber: updatedVisitor.user?.unit?.number || "N/A",
      blockName: updatedVisitor.user?.unit?.block?.name || "N/A",
      status: "checked_in",
    };

    res.json({
      message: "Visitor checked in successfully",
      visitor: transformedVisitor,
    });
  } catch (error) {
    console.error("Error checking in visitor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Check out a visitor
router.post("/checkout/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findFirst({
      where: {
        id: String(id),
        communityId: req.user.communityId,
      },
    });

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    if (visitor.checkOutAt) {
      return res.status(400).json({ error: "Visitor already checked out" });
    }

    if (!visitor.checkInAt) {
      return res
        .status(400)
        .json({ error: "Visitor must be checked in first" });
    }

    const updatedVisitor = await prisma.visitor.update({
      where: { id: String(id) },
      data: {
        checkOutAt: new Date(),
        updatedAt: new Date(),
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
    });

    const transformedVisitor = {
      ...updatedVisitor,
      hostName: updatedVisitor.user?.name || "Unknown",
      unitNumber: updatedVisitor.user?.unit?.number || "N/A",
      blockName: updatedVisitor.user?.unit?.block?.name || "N/A",
      status: "checked_out",
    };

    res.json({
      message: "Visitor checked out successfully",
      visitor: transformedVisitor,
    });
  } catch (error) {
    console.error("Error checking out visitor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get current visitors (checked in but not checked out)
router.get("/current", async (req, res) => {
  try {
    const currentVisitors = await prisma.visitor.findMany({
      where: {
        communityId: req.user.communityId,
        checkInAt: { not: null },
        checkOutAt: null,
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
        checkInAt: "desc",
      },
    });

    // Transform data to include block and unit information
    const transformedVisitors = currentVisitors.map((visitor) => ({
      ...visitor,
      hostName: visitor.user?.name || "Unknown",
      unitNumber: visitor.user?.unit?.number || "N/A",
      blockName: visitor.user?.unit?.block?.name || "N/A",
      status: "checked_in",
    }));

    res.json(transformedVisitors);
  } catch (error) {
    console.error("Error fetching current visitors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
