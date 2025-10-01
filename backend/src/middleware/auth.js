import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";

export const authMiddleware =  (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = decoded;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if(!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user;
    next();
  });
};

const requestCount = {};
const limitTime = 600000; // 10 minutes
const maxRequests = 100;

export const limiter = (req, res, next) => {
  const ip = req.ip;
  const currentTime = Date.now();

  if (!requestCount[ip]) {
    requestCount[ip] = { count: 1, startTime: currentTime };
  } else {
    const timePassed = currentTime - requestCount[ip].startTime;

    if (timePassed < limitTime) {
      requestCount[ip].count++;
      if (requestCount[ip].count > maxRequests) {
        return res.status(429).send("Too many requests");
      }
    } else {
      requestCount[ip] = { count: 1, startTime: currentTime };
    }
  }

  next();
};