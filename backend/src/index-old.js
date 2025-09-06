import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { UserStatus } from "@prisma/client";

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
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status === "REJECTED") {
      return res.status(403).json({ error: "Account has been rejected" });
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
      data: { name, email, password, role: "RESIDENT", status: "PENDING" },
      select: { id: true, name: true, email: true, role: true, status: true },
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
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    const jwttoken = jwt.sign({ userId: existingUser.id }, token);

    if (existingUser) {
      return res
        .status(200)
        .json({ exists: true, user: existingUser, jwttoken });
    }
    return res.status(200).json({ exists: false });
  } catch (e) {
    return res.status(200).json({ exists: false });
  }
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

app.get("/dashboard", authMiddleware, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res
      .status(400)
      .json({ error: "Missing userId in query parameters" });
  }
  try {
    const announcements = await prisma.announcements.findMany({
      where: { userId: userId },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    const tickets = await prisma.ticket.findMany({
      where: { userId: userId },
      select: { id: true, title: true, description: true, status: true },
    });
    const payments = await prisma.payments.findMany({
      where: { userId: userId },
      select: { id: true, amount: true, status: true },
    });
    const bookings = await prisma.booking.findMany({
      where: { userId: userId },
      select: { id: true, facility: true, status: true },
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

// Admin endpoints
app.get("/admin/resident-requests", authMiddleware, async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: { id: true, name: true, email: true },
    });

    res.status(200).json(pendingUsers);
  } catch (e) {
    console.error("Error fetching resident requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/approve-resident", authMiddleware, async (req, res) => {
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

app.post("/admin/reject-resident", authMiddleware, async (req, res) => {
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

app.post("/admin/create-announcement", authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  const { userId } = req.user;

  try {
    const announcement = await prisma.announcements.create({
      data: { title, content, userId },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (e) {
    console.error("Error creating announcement:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all data for admin dashboard
app.get("/admin/dashboard", authMiddleware, async (req, res) => {
  try {
    const announcements = await prisma.announcements.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, content: true, createdAt: true },
    });

    const payments = await prisma.payments.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const maintenance = await prisma.ticket.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { name: true } },
        facility: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    const pendingRequests = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: { id: true, name: true, email: true },
    });

    res.status(200).json({
      announcements,
      payments,
      maintenance,
      bookings,
      pendingRequests,
    });
  } catch (e) {
    console.error("Error fetching admin dashboard data:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/residents", authMiddleware, async (req, res) => {
  try {
    const residents = await prisma.user.findMany({
      where: { role: "RESIDENT" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    res.status(200).json({ residents });
  } catch (e) {
    console.error("Error fetching residents:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
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

app.get("/admin/maintenance", authMiddleware, async (req, res) => {
  try {
    const maintenance = await prisma.ticket.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ maintenance });
  } catch (e) {
    console.error("Error fetching maintenance requests:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/admin/maintenance/update", authMiddleware, async (req, res) => {
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

app.get("/admin/announcements", authMiddleware, async (req, res) => {
  try {
    const announcements = await prisma.announcements.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ announcements });
  } catch (e) {
    console.error("Error fetching announcements:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/admin/announcements/:id", authMiddleware, async (req, res) => {
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
