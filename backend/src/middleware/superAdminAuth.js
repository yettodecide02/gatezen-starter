import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";

export const superAdminAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error("SuperAdmin JWT verification error:", err);
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!decoded.superAdminId) {
      return res.status(403).json({ error: "Forbidden: not a super admin" });
    }

    try {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: decoded.superAdminId },
      });

      if (!superAdmin) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      req.superAdmin = superAdmin;
      next();
    } catch (e) {
      console.error("SuperAdmin DB lookup error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};
