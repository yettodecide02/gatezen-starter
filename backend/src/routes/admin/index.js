import express from "express";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";
import { UserStatus } from "@prisma/client";
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

// Resident management routes
router.get("/resident-requests", authMiddleware, async (req, res) => {
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

// Bookings management
router.get("/bookings", authMiddleware, async (req, res) => {
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

// Maintenance management
router.get("/maintenance", authMiddleware, async (req, res) => {
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
    const announcements = await prisma.announcements.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ announcements });
  } catch (e) {
    console.error("Error fetching announcements:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create-announcement", authMiddleware, async (req, res) => {
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

export default router;
