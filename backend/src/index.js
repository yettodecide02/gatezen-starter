import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import residentRoutes from "./routes/resident/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to the GateZen backend!");
});

// Route configurations
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/resident", residentRoutes);

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`GateZen backend running on http://192.168.0.103:${port}`);
});
