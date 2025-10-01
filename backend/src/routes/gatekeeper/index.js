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
        expectedAt:{
          gte: new Date(new Date().setHours(0,0,0,0)), // Start of today
          lt: new Date(new Date().setHours(23,59,59,999)), // End of today
        }
      },
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
      // unitNumber: visitor.residentId, // Using residentId as unit reference for now
      status: visitor.status.toLowerCase(), // Convert PENDING to pending, CHECKED_IN to checked_in, etc.
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

  // Convert frontend status to database enum format
  const statusMap = {
    pending: "PENDING",
    approved: "PENDING", // Keep as PENDING since APPROVED doesn't exist in schema
    declined: "CANCELLED",
    cancelled: "CANCELLED", // Add mapping for 'cancelled' status
    checked_in: "CHECKED_IN",
    checked_out: "CHECKED_OUT",
  };

  const dbStatus = statusMap[status?.toLowerCase()] || "PENDING";
  
  try {
    const visitor = await prisma.visitor.update({
      where: { id: String(id) },
      data: {
        status: dbStatus,
        updatedAt: new Date(),
      },
      select: {
        name: true,
        email: true,
        type: true,
        status: true,
        expectedAt: true,
        resident: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    if(visitor.type == "GUEST" && dbStatus === "CANCELLED") {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_ID,
          to: visitor.email,
          subject: "Visit Cancelled",
          text: `Dear ${visitor.name},\n\nYour visit scheduled on ${new Date(
            visitor.expectedAt
          ).toLocaleString()} has been cancelled.\n\nRegards,\nGateZen Team`,
        });
      } catch (error) {
        console.error("Error sending cancellation email:", error);
      }
    }

    // Transform response to match frontend expectations
    const transformedVisitor = {
      ...visitor,
      hostName: visitor.resident?.name || "Unknown",
      visitDate: visitor.expectedAt,
      unitNumber: visitor.residentId,
      status: visitor.status.toLowerCase(),
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

    // Get today's visitor counts by status
    const [pending, checkedIn, checkedOut, cancelled] = await Promise.all([
      prisma.visitor.count({
        where: {
          status: "PENDING",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.visitor.count({
        where: {
          status: "CHECKED_IN",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.visitor.count({
        where: {
          status: "CHECKED_OUT",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.visitor.count({
        where: {
          status: "CANCELLED",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ]);

    const total = pending + checkedIn + checkedOut + cancelled;

    res.json({
      today: {
        pending,
        checkedIn,
        checkedOut,
        cancelled,
        total,
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
        resident: {
          select: {
            name: true,
            id: true,
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
      hostName: visitor.resident?.name || "Unknown",
      visitDate: visitor.expectedAt,
      unitNumber: visitor.residentId,
      status: visitor.status.toLowerCase(),
    };

    return res.status(200).json({ visitor: transformedVisitor });
  } catch (error) {
    console.error("Error fetching visitor:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
