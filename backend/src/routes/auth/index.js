import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import axios from "axios";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const otps = {};

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email, password },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        communityId: true,
        unit: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status === "REJECTED") {
      return res.status(403).json({ error: "Account has been rejected" });
    }

    const community = await prisma.community.findUnique({
      where: { id: user.communityId },
      select: { id: true, name: true },
    });

    const jwttoken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    const data = {
      ...user,
      communityName: community?.name,
      unitNumber: user.unit?.number,
      blockName: user.unit?.block?.name,
    };

    return res.status(200).json({ user: data, jwttoken });
  } catch (e) {
    console.error("Error logging in:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/community-signup", async (req, res) => {
  console.log("Community signup request received:", {
    ...req.body,
    password: "[HIDDEN]",
  });

  const { name, email, password, communityName, address } = req.body;

  // Validate required fields
  if (!name || !email || !password || !communityName) {
    console.log("Missing required fields:", {
      name: !!name,
      email: !!email,
      password: !!password,
      communityName: !!communityName,
    });
    return res
      .status(400)
      .json({ error: "All required fields must be filled" });
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });
    const existingCommunity = await prisma.community.findUnique({
      where: { name: communityName },
    });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin with this email exists" });
    }
    if (existingCommunity) {
      return res.status(400).json({ error: "Community with this name exists" });
    }
    const community = await prisma.community.create({
      data: { name: communityName, address },
    });
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role: "ADMIN",
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

    const jwttoken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET);
    return res.status(201).json({ user: admin, jwttoken });
  } catch (e) {
    console.error("Error during community signup:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res) => {
  const { name, email, password, communityId, blockId, unitId } = req.body;

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

    // Validate block and unit if provided
    if (blockId) {
      const block = await prisma.block.findFirst({
        where: {
          id: blockId,
          communityId: communityId,
        },
      });

      if (!block) {
        return res.status(400).json({
          error: "Selected block not found in this community.",
        });
      }
    }

    if (unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId,
          communityId: communityId,
          ...(blockId && { blockId: blockId }),
        },
      });

      if (!unit) {
        return res.status(400).json({
          error: "Selected unit not found in this community/block.",
        });
      }

      const users = await prisma.user.findMany({
        where: {
          unitId: unitId,
        },
        select: {
          id: true,
        },
      });

      console.log(users);

      if (users.length > 4)
        return res.status(400).json({
          error: "The maximum limit of users for this unit is reached",
        });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role: "RESIDENT",
        status: "PENDING",
        communityId: community.id,
        unitId: unitId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        communityId: true,
        unit: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const jwttoken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    const data = { ...user, communityName: community.name };

    return res.status(201).json({ user: data, jwttoken });
  } catch (e) {
    console.error("Error signing up:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/existing-user", async (req, res) => {
  const { email } = req.query;
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        communityId: true,
        unit: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (existingUser) {
      const community = await prisma.community.findUnique({
        where: { id: existingUser.communityId },
        select: { id: true, name: true },
      });
      const jwttoken = jwt.sign(
        { userId: existingUser.id },
        process.env.JWT_SECRET,
      );
      const data = {
        ...existingUser,
        communityName: community?.name,
        unitNumber: existingUser.unit?.number,
        blockName: existingUser.unit?.block?.name,
      };
      return res.status(200).json({ exists: true, user: data, jwttoken });
    }
    return res.status(200).json({ exists: false });
  } catch (e) {
    return res.status(200).json({ exists: false });
  }
});

router.post("/send-otp", async (req, res) => {
  const { email, operation } = req.body;
  if ((!email, !operation)) {
    return res.status(400).send("Email and operation are required");
  }

  const userOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = userOtp;
  if (operation != "Sign-up") {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (!existingUser) {
        return res.status(404).send("User not found");
      }
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: email,
        subject: "Your GateZen password reset code",
        text: "Your OTP code is: " + userOtp,
      });
      res.send("OTP sent successfully");
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).send("Error sending OTP");
    }
  } else {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: email,
        subject: "Your GateZen email verification code",
        text: "Your OTP code is: " + userOtp,
      });
      res.send({ message: "OTP sent successfully", success: true });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).send("Error sending OTP");
    }
  }
});

router.post("/check-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    return res
      .status(200)
      .json({ message: "OTP verified successfully.", success: true });
  }
  return res.status(400).json({ message: "Invalid OTP." });
});

router.post("/password-reset", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  try {
    const result = await prisma.user.update({
      where: { email },
      data: { password },
    });

    if (!result) {
      return res.status(400).json({ message: "Password reset failed." });
    }

    return res.status(200).json({ message: "Password reset successful." });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Get all communities for dropdown selection
router.get("/communities", async (req, res) => {
  try {
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        blocks: {
          select: {
            id: true,
            name: true,
            units: {
              select: {
                id: true,
                number: true,
              },
              orderBy: {
                number: "asc",
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: communities,
    });
  } catch (error) {
    console.error("Error fetching communities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch communities",
      error: error.message,
    });
  }
});

// Get blocks for a specific community
router.get("/communities/:communityId/blocks", async (req, res) => {
  const { communityId } = req.params;

  try {
    const blocks = await prisma.block.findMany({
      where: {
        communityId: communityId,
      },
      select: {
        id: true,
        name: true,
        communityId: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: blocks,
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blocks",
      error: error.message,
    });
  }
});

// Get units for a specific block
router.get("/blocks/:blockId/units", async (req, res) => {
  const { blockId } = req.params;

  try {
    const units = await prisma.unit.findMany({
      where: {
        blockId: blockId,
      },
      select: {
        id: true,
        number: true,
        blockId: true,
        communityId: true,
      },
      orderBy: {
        number: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error("Error fetching units:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch units",
      error: error.message,
    });
  }
});

// Get units for a specific community (all units across all blocks)
router.get("/communities/:communityId/units", async (req, res) => {
  const { communityId } = req.params;

  try {
    const units = await prisma.unit.findMany({
      where: {
        communityId: communityId,
      },
      select: {
        id: true,
        number: true,
        blockId: true,
        communityId: true,
        block: {
          select: {
            id: true,
            name: true,
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

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error("Error fetching units:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch units",
      error: error.message,
    });
  }
});

export default router;
