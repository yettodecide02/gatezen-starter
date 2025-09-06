import express from "express";
import { v4 as uuid } from "uuid";
import qrcode from "qrcode";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const visitors = [];

// Get visitors for a resident
router.get("/visitors", authMiddleware, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let filteredVisitors = [...visitors];

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

// Create visitor
router.post("/visitors", authMiddleware, async (req, res) => {
  try {
    const { name, phone, expectedAt, purpose, vehicle, notes } = req.body;
    const { userId } = req.user;

    if (!name || !phone || !purpose) {
      return res
        .status(400)
        .json({ error: "Name, phone and purpose are required" });
    }

    const id = uuid();
    const newVisitor = {
      id,
      name,
      phone,
      expectedAt,
      purpose,
      vehicle,
      notes,
      residentId: userId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    visitors.push(newVisitor);

    // Generate QR code and send email (similar to visitor-creation)
    const qrPngBuffer = await qrcode.toBuffer(
      "http://192.168.0.103:4000/resident/scan?id=" + id,
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
      to: phone, // Assuming phone can receive emails, or you can add an email field
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

    return res.status(201).json(newVisitor);
  } catch (err) {
    console.error("Error creating visitor:", err);
    return res.status(500).json({ error: "Failed to create visitor" });
  }
});

// Update visitor status
router.patch("/visitors/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const visitorIndex = visitors.findIndex((v) => v.id === id);
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

// Maintenance routes for residents
router.get("/maintenance", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "Missing userId in query parameters" });
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: userId },
      include: {
        user: { select: { name: true, email: true } },
        comments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        images: true,
        history: { orderBy: { at: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(tickets);
  } catch (e) {
    console.error("Error fetching maintenance tickets:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance", authMiddleware, async (req, res) => {
  try {
    const { title, category, description } = req.body;
    const { userId } = req.user;

    if (!title || !category) {
      return res.status(400).json({ error: "Title and category are required" });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        category,
        description,
        userId,
        status: "SUBMITTED",
      },
      include: {
        user: { select: { name: true, email: true } },
        comments: true,
        images: true,
        history: true,
      },
    });

    res.status(201).json(ticket);
  } catch (e) {
    console.error("Error creating maintenance ticket:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance/:id/images", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const image = await prisma.image.create({
      data: {
        url,
        ticketId: id,
      },
    });

    res.status(201).json(image);
  } catch (e) {
    console.error("Error adding image to ticket:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const { userId } = req.user;

    if (!text) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        userId,
        ticketId: id,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    res.status(201).json(comment);
  } catch (e) {
    console.error("Error adding comment to ticket:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/maintenance/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ...updateData } = req.body;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true } },
        comments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        images: true,
        history: { orderBy: { at: "desc" } },
      },
    });

    res.status(200).json(ticket);
  } catch (e) {
    console.error("Error updating maintenance ticket:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard", authMiddleware, async (req, res) => {
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

router.post("/visitor-creation", authMiddleware, async (req, res) => {
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

router.get("/scan", (req, res) => {
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

export default router;
