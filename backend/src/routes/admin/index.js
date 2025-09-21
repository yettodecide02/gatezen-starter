import express from "express";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import { UserStatus, FacilityType, PriceType } from "@prisma/client";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Get all data for admin dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const { communityId } = req.query;
    // First, get the community (assuming single community for now)
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

    // Get bookings through facilities
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

// Resident management routes
router.get("/resident-requests", authMiddleware, async (req, res) => {
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
      select: { id: true, name: true, email: true },
    });

    res.status(200).json(pendingUsers);
  } catch (e) {
    console.error("Error fetching resident requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/approve-resident", authMiddleware, async (req, res) => {
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

router.post("/reject-resident", authMiddleware, async (req, res) => {
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

router.get("/residents", authMiddleware, async (req, res) => {
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
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    res.status(200).json({ residents });
  } catch (e) {
    console.error("Error fetching residents:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bookings management
router.get("/bookings", authMiddleware, async (req, res) => {
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
router.get("/maintenance", authMiddleware, async (req, res) => {
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

router.post("/maintenance/update", authMiddleware, async (req, res) => {
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
router.get("/announcements", authMiddleware, async (req, res) => {
  try {
    const { communityId } = req.query;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return res.status(404).json({ error: "No community found" });
    }

    const announcements = await prisma.announcements.findMany({
      where: { communityId: community.id },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ announcements });
  } catch (e) {
    console.error("Error fetching announcements:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create-announcement", authMiddleware, async (req, res) => {
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

    const announcement = await prisma.announcements.create({
      data: {
        title,
        content,
        userId,
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

router.delete("/announcements/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.announcements.delete({
      where: { id: id },
    });

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (e) {
    console.error("Error deleting announcement:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// === COMMUNITY CONFIGURATION ROUTES ===

// Get community configuration
router.get("/community", authMiddleware, async (req, res) => {
  try {
    // Get the user's community ID from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { communityId: true },
    });

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
router.post("/community", authMiddleware, async (req, res) => {
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

      // Delete existing facility configurations
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

      await prisma.facilityConfiguration.createMany({
        data: facilityData,
      });
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
router.get("/community/facilities", authMiddleware, async (req, res) => {
  try {
    // Get the user's community ID from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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

// Save facility configurations
router.post("/community/facilities", authMiddleware, async (req, res) => {
  try {
    const { facilities } = req.body;

    // Get the user's community ID from the authenticated user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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

    // Delete existing facility configurations
    await prisma.facilityConfiguration.deleteMany({
      where: { communityId: community.id },
    });

    // Create new facility configurations
    if (facilities && Array.isArray(facilities) && facilities.length > 0) {
      const facilityData = facilities.map((facility) => ({
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
      }));

      await prisma.facilityConfiguration.createMany({
        data: facilityData,
      });
    }

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
        where: { id: req.user.userId },
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
          },
        },
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community configuration not found",
        });
      }

      // Convert facility types to string and create actual facility records if they don't exist
      const enabledFacilities = [];

      for (const facilityConfig of community.facilityConfigs) {
        // Check if actual facilities exist for this configuration
        let existingFacilities = await prisma.facility.findMany({
          where: {
            facilityType: facilityConfig.facilityType,
            configurationId: facilityConfig.id,
          },
        });

        // If no facilities exist, create them based on quantity
        if (existingFacilities.length === 0) {
          const facilitiesToCreate = [];
          for (let i = 1; i <= facilityConfig.quantity; i++) {
            facilitiesToCreate.push({
              name: `${facilityConfig.facilityType
                .replace("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
              facilityType: facilityConfig.facilityType,
              open: facilityConfig.operatingHours.split("-")[0] || "09:00",
              close: facilityConfig.operatingHours.split("-")[1] || "21:00",
              slotMins: 60, // Default slot duration
              configurationId: facilityConfig.id,
            });
          }

          await prisma.facility.createMany({
            data: facilitiesToCreate,
          });

          // Fetch the newly created facilities
          existingFacilities = await prisma.facility.findMany({
            where: {
              facilityType: facilityConfig.facilityType,
              configurationId: facilityConfig.id,
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

        // Create missing facilities if quantity increased
        const currentCount = existingFacilities.length;
        const targetCount = facilityData.quantity || 1;

        if (currentCount < targetCount) {
          const facilitiesToCreate = [];
          for (let i = currentCount + 1; i <= targetCount; i++) {
            facilitiesToCreate.push({
              name: `${facilityTypeEnum
                .replace("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())} ${i}`,
              facilityType: facilityTypeEnum,
              open: facilityData.operatingHours?.split("-")[0] || "09:00",
              close: facilityData.operatingHours?.split("-")[1] || "21:00",
              slotMins: 60,
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
router.delete("/community", authMiddleware, async (req, res) => {
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
router.get("/community/facility-types", authMiddleware, async (req, res) => {
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

export default router;
