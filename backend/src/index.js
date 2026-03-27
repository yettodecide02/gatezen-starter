import "dotenv/config";

import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import residentRoutes from "./routes/resident/index.js";
import gatekeeperRoutes from "./routes/gatekeeper/index.js";
import intercomRoutes from "./routes/intercom/index.js";
import notificationsRoutes from "./routes/notifications/index.js";
import cronRoutes from "./routes/cron/index.js";
import superAdminRoutes from "./routes/superadmin/index.js";

import { limiter } from "./middleware/auth.js";

const app = express();

app.use(
  cors({
    allowedHeaders: ["Authorization", "Content-Type", "x-setup-secret"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());
app.use(limiter);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const locationCountsFile = path.join(__dirname, "locations.json");
const logFile = path.join(__dirname, "logs.txt");


app.set("trust proxy", true); 

const cache = new Map();
const MAX_CACHE_SIZE = 1000;

let locationCounts = {};
let pendingWrites = false;

// Load file safely
try {
  if (fs.existsSync(locationCountsFile)) {
    locationCounts = JSON.parse(fs.readFileSync(locationCountsFile, "utf-8"));
  }
} catch {
  locationCounts = {};
}

// 🧠 Batch write (every 5 sec)
setInterval(() => {
  if (!pendingWrites) return;

  fs.writeFile(
    locationCountsFile,
    JSON.stringify(locationCounts, null, 2),
    (err) => {
      if (err) console.error("Error writing locations:", err);
    },
  );

  pendingWrites = false;
}, 5000);

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

    if (ip?.includes("::ffff:")) {
      ip = ip.split(":").pop();
    }

    const userAgent = req.headers["user-agent"] || "Unknown";

    const logBase = `[${new Date().toISOString()}] ${req.method} ${
      req.url
    } | ${res.statusCode} | ${Date.now() - start}ms | IP: ${ip}`;

    const writeLog = (extra) => {
      const finalLog = `${logBase} | ${extra} | UA: ${userAgent}\n`;

      fs.appendFile(logFile, finalLog, (err) => {
        if (err) console.error("Log write error:", err);
      });

      console.log(finalLog.trim());
    };

    const updateLocationCount = (locationKey) => {
      locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1;

      pendingWrites = true;
    };

    // ✅ Cache hit
    if (cache.has(ip)) {
      const { city, country } = cache.get(ip);
      const locationKey = `${city}, ${country}`;

      updateLocationCount(locationKey);
      writeLog(locationKey);
      return;
    }

    writeLog("resolving location...");

    (async () => {
      let city = "Unknown";
      let country = "";

      try {
        if (ip === "127.0.0.1" || ip === "::1") {
          city = "Localhost";
        } else {
          const { data } = await axios.get(`http://ip-api.com/json/${ip}`, {
            timeout: 2000,
          });

          if (data.status === "success") {
            city = data.city;
            country = data.country;

            // 🧠 Limit cache size
            if (cache.size > MAX_CACHE_SIZE) {
              const firstKey = cache.keys().next().value;
              cache.delete(firstKey);
            }

            cache.set(ip, { city, country });
          }
        }
      } catch (err) {
        console.error("Geo lookup failed:", err.message);
      }

      const locationKey = `${city}, ${country}`;
      updateLocationCount(locationKey);
      writeLog(locationKey);
    })();
  });

  next();
});

app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Welcome to the GateZen backend!");
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/resident", residentRoutes);
app.use("/gatekeeper", gatekeeperRoutes);
app.use("/intercom", intercomRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/cron", cronRoutes);
app.use("/superadmin", superAdminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(
    `[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.url}:`,
    err,
  );
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;

if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 5000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`GateZen backend running on port ${port}`);
  });
}
