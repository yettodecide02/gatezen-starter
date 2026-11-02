import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

const requestCount = new Map();
const LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 1000; // 1000 requests per 10 minutes per IP
const MAX_TRACKED_IPS = 5000;

// Periodic cleanup to prevent unbounded memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCount.entries()) {
      if (now - record.startTime > LIMIT_WINDOW_MS) {
        requestCount.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export const limiter = (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const currentTime = Date.now();

  const record = requestCount.get(ip);
  if (!record || currentTime - record.startTime > LIMIT_WINDOW_MS) {
    if (requestCount.size >= MAX_TRACKED_IPS) {
      const oldestKey = requestCount.keys().next().value;
      requestCount.delete(oldestKey);
    }
    requestCount.set(ip, { count: 1, startTime: currentTime });
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS) {
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }
  }

  next();
};
