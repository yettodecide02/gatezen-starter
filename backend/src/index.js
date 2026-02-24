import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import residentRoutes from "./routes/resident/index.js";
import gatekeeperRoutes from "./routes/gatekeeper/index.js";
import notificationsRoutes from "./routes/notifications/index.js";
import cronRoutes from "./routes/cron/index.js";

import { limiter } from "./middleware/auth.js";

dotenv.config();

const app = express();

app.use(
  cors({
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());
app.use(limiter);

app.use((req, res, next) => {
  console.log(`From ${req.ip} - ${req.method} ${req.url}`);
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
app.use("/notifications", notificationsRoutes);
app.use("/cron", cronRoutes);

export default app;

if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 5000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`GateZen backend running on port ${port}`);
  });
}
