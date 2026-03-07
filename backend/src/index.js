import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import residentRoutes from "./routes/resident/index.js";
import gatekeeperRoutes from "./routes/gatekeeper/index.js";
import intercomRoutes from "./routes/intercom/index.js";
import notificationsRoutes from "./routes/notifications/index.js";
import cronRoutes from "./routes/cron/index.js";
import superAdminRoutes from "./routes/superadmin/index.js";
import vehiclesRoutes from "./routes/vehicles/index.js";
import parkingRoutes from "./routes/parking/index.js";
import meetingsRoutes from "./routes/meetings/index.js";
import homePlannerRoutes from "./routes/home-planner/index.js";
import emergencyRoutes from "./routes/emergency/index.js";

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
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} | ${res.statusCode} | ${Date.now() - start}ms | IP: ${req.ip}`,
    );
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
app.use("/vehicles", vehiclesRoutes);
app.use("/parking", parkingRoutes);
app.use("/meetings", meetingsRoutes);
app.use("/home-planner", homePlannerRoutes);
app.use("/emergency", emergencyRoutes);

export default app;

if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 5000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`GateZen backend running on port ${port}`);
  });
}
