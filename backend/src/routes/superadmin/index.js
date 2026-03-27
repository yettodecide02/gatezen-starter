import express from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../../../lib/prisma.js";
import { superAdminAuthMiddleware } from "../../middleware/superAdminAuth.js";
import { invalidateCommunityPlanCache } from "../../middleware/checkFeature.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const locationsFilePath = path.resolve(__dirname, "../../locations.json");

// ─── POST /superadmin/auth/register ────────────────────────
// Bootstrap the first super admin. Protected by a secret header.
// Header: x-setup-secret: <SUPERADMIN_SETUP_SECRET from .env>
router.post("/auth/register", async (req, res) => {
  const secret = req.headers["x-setup-secret"];
  if (!secret || secret !== process.env.SUPERADMIN_SETUP_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email, and password are required" });
  }

  try {
    const existing = await prisma.superAdmin.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Super admin with this email already exists" });
    }

    const superAdmin = await prisma.superAdmin.create({
      data: { name, email, password },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return res.status(201).json({ superAdmin });
  } catch (e) {
    console.error("SuperAdmin register error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /superadmin/auth/login ────────────────────────────
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { email },
      select: { id: true, name: true, email: true, password: true },
    });

    if (!superAdmin || superAdmin.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password: _pw, ...saData } = superAdmin;

    const token = jwt.sign(
      { superAdminId: superAdmin.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({ superAdmin: saData, token });
  } catch (e) {
    console.error("SuperAdmin login error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /superadmin/auth/me ────────────────────────────────
router.get("/auth/me", superAdminAuthMiddleware, (req, res) => {
  const { id, name, email, createdAt } = req.superAdmin;
  return res.status(200).json({ id, name, email, createdAt });
});

// GET /superadmin/location-counts
router.get("/location-counts", superAdminAuthMiddleware, async (req, res) => {
  try {
    if (!fs.existsSync(locationsFilePath)) {
      return res.status(200).json({});
    }

    const raw = await fs.promises.readFile(locationsFilePath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return res.status(200).json({});
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Get location counts error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Plan Management ─────────────────────────────────────────

// GET /superadmin/plans
router.get("/plans", superAdminAuthMiddleware, async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      include: { _count: { select: { communities: true } } },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ plans });
  } catch (e) {
    console.error("Get plans error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /superadmin/plans
router.post("/plans", superAdminAuthMiddleware, async (req, res) => {
  const { name, description, features, price } = req.body;
  if (!name || !Array.isArray(features)) {
    return res.status(400).json({ error: "name and features[] are required" });
  }

  try {
    const plan = await prisma.plan.create({
      data: { name, description, features, price: price ?? null },
    });
    return res.status(201).json(plan);
  } catch (e) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ error: "A plan with this name already exists" });
    }
    console.error("Create plan error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /superadmin/plans/:id
router.put("/plans/:id", superAdminAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, features, price } = req.body;

  try {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Plan not found" });

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(Array.isArray(features) && { features }),
        ...(price !== undefined && { price }),
      },
      include: { communities: { select: { id: true } } },
    });

    // Invalidate cache for every community using this plan
    plan.communities.forEach((c) => invalidateCommunityPlanCache(c.id));

    return res.status(200).json({ ...plan, communities: undefined });
  } catch (e) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ error: "A plan with this name already exists" });
    }
    console.error("Update plan error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /superadmin/plans/:id
router.delete("/plans/:id", superAdminAuthMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { communities: true } } },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (plan._count.communities > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${plan._count.communities} community/communities are using this plan`,
      });
    }

    await prisma.plan.delete({ where: { id } });
    return res.status(200).json({ message: "Plan deleted" });
  } catch (e) {
    console.error("Delete plan error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Community Management ────────────────────────────────────

// GET /superadmin/communities
router.get("/communities", superAdminAuthMiddleware, async (req, res) => {
  try {
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        planId: true,
        plan: { select: { id: true, name: true, features: true } },
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ communities });
  } catch (e) {
    console.error("Get communities error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /superadmin/communities/:id/plan
router.put(
  "/communities/:id/plan",
  superAdminAuthMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const { planId } = req.body; // null to remove plan

    try {
      const community = await prisma.community.findUnique({ where: { id } });
      if (!community)
        return res.status(404).json({ error: "Community not found" });

      if (planId !== null && planId !== undefined) {
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return res.status(404).json({ error: "Plan not found" });
      }

      const updated = await prisma.community.update({
        where: { id },
        data: { planId: planId ?? null },
        select: {
          id: true,
          name: true,
          planId: true,
          plan: { select: { id: true, name: true, features: true } },
        },
      });

      // Invalidate the feature cache for this community so changes take effect immediately
      invalidateCommunityPlanCache(id);

      return res.status(200).json(updated);
    } catch (e) {
      console.error("Assign plan error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
