import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

dotenv.config();

const token = process.env.JWT_SECRET;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const visitors = [];
const otps = {};

const app = express();

app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Welcome to the GateZen backend!");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  try {
    const user = await prisma.user.findUnique({
      where: { email, password },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const jwttoken = jwt.sign({ userId: user.id }, token);

    return res.status(200).json({ user, jwttoken });
  } catch (e) {
    console.error("Error logging in:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await prisma.user.create({
      data: { name, email, password },
      select: { id: true, name: true, email: true },
    });

    const jwttoken = jwt.sign({ userId: user.id }, token);

    return res.status(201).json({ user, jwttoken });
  } catch (e) {
    console.error("Error signing up:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/existing-user", async (req, res) => {
  const { email } = req.query;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  const jwttoken = jwt.sign({ userId: existingUser.id }, token);

  if (existingUser) {
    return res.status(200).json({ exists: true, user: existingUser, jwttoken });
  }

  return res.status(200).json({ exists: false });
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send("Email is required");
  }
  console.log(email);
  
  const userOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = userOtp;
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
});

app.post("/check-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    return res.status(200).json({ message: "OTP verified successfully." });
  }
  return res.status(400).json({ message: "Invalid OTP." });
});

app.post("/password-reset", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
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

app.get("/dashboard", (req, res) => {
  const { userId } = req.params;
  console.log("User ID from query:", userId);
  // database call for getting users maintance details, payments, bookings and any new announcements
  const dummyData = {
    announcements: [
      {
        id: 1,
        title: "New Feature Release",
        body: "We are excited to announce a new feature release...",
        createdAt: "2025-08-25T10:00:00Z",
      },
      {
        id: 2,
        title: "New Pool opened",
        body: "We are excited to announce the opening of a new pool...",
        createdAt: "2025-08-26T10:00:00Z",
      },
    ],
    maintenance: [
      {
        id: 1,
        title: "Leakage Repair",
        description: "Fixing a leakage issue in the community center.",
        status: "in_progress",
      },
      {
        id: 2,
        title: "Electrical Issue",
        description: "Fixing a faulty light in the parking lot.",
        status: "submitted",
      },
      {
        id: 3,
        title: "Plumbing Issue",
        description: "Fixing a leaking pipe in the restroom.",
        status: "resolved",
      },
      {
        id: 4,
        title: "HVAC Issue",
        description: "Fixing the heating system in the community center.",
        status: "in_progress",
      },
    ],
    payments: [
      {
        id: 1,
        amount: 10000,
        status: "completed",
      },
      {
        id: 2,
        amount: 500,
        status: "pending",
      },
      {
        id: 3,
        amount: 2000,
        status: "pending",
      },
    ],
    bookings: [
      {
        id: 1,
        title: "Gym",
        status: "approved",
      },
      {
        id: 2,
        title: "Jacuzzi",
        status: "pending",
      },
      {
        id: 3,
        title: "Swimming Pool",
        status: "approved",
      },
    ],
  };

  res.status(200).json(dummyData);
});

app.post("/visitor-creation", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name and email" });
    }

    const id = uuid();
    const newVisitor = { id, name, email };

    visitors.push(newVisitor);

    const qrPngBuffer = await qrcode.toBuffer(
      "http://localhost:4000/scan?id=" + id,
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

app.get("/scan", (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing visitor ID" });
  }

  const visitor = visitors.find((v) => v.id === id);

  if (!visitor) {
    return res.status(404).json({ error: "Visitor not found" });
  }

  return res.status(200).json({ visitor });
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`GateZen backend running on http://192.168.0.103:${port}`);
});
