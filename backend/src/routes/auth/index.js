import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import prisma from "../../../lib/prisma.js";

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

    const jwttoken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    return res.status(200).json({ user, jwttoken });
  } catch (e) {
    console.error("Error logging in:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await prisma.user.create({
      data: { name, email, password, role: "RESIDENT", status: "PENDING" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    const jwttoken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    return res.status(201).json({ user, jwttoken });
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
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (existingUser) {
      const jwttoken = jwt.sign(
        { userId: existingUser.id },
        process.env.JWT_SECRET
      );
      return res
        .status(200)
        .json({ exists: true, user: existingUser, jwttoken });
    }
    return res.status(200).json({ exists: false });
  } catch (e) {
    return res.status(200).json({ exists: false });
  }
});

router.post("/send-otp", async (req, res) => {
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

router.post("/check-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    return res.status(200).json({ message: "OTP verified successfully." });
  }
  return res.status(400).json({ message: "Invalid OTP." });
});

router.post("/password-reset", async (req, res) => {
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

export default router;
