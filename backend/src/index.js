import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import residentRoutes from "./routes/resident/index.js";
import gatekeeperRoutes from "./routes/gatekeeper/index.js";

import { limiter } from "./middleware/auth.js"

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(limiter);

app.use((req, res, next) => {
  console.log(`From ${req.ip} - ${req.method} ${req.url}`);
  next();
});


app.get("/", (req, res) => {
  res.send("Welcome to the GateZen backend!");
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/resident", residentRoutes);
app.use("/gatekeeper", gatekeeperRoutes);

global.eventClients = [];

function broadcastEvent(type, data) {
  global.eventClients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch (error) {
      console.error("Error broadcasting event:", error);
    }
  });
}

global.broadcastEvent = broadcastEvent;

app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  global.eventClients.push(res);

  res.write(`data: ${JSON.stringify({ type: "connected", data: {} })}\n\n`);

  req.on("close", () => {
    const index = global.eventClients.indexOf(res);
    if (index !== -1) {
      global.eventClients.splice(index, 1);
    }
  });
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`GateZen backend running`);
});
