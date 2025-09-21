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

// Global event store for SSE
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

// Make broadcastEvent available globally
global.broadcastEvent = broadcastEvent;

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to the GateZen backend!");
});

// Route configurations
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/resident", residentRoutes);

// Server-Sent Events endpoint
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Add client to global list
  global.eventClients.push(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", data: {} })}\n\n`);

  // Remove client when connection closes
  req.on("close", () => {
    const index = global.eventClients.indexOf(res);
    if (index !== -1) {
      global.eventClients.splice(index, 1);
    }
  });
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`GateZen backend running on http://192.168.0.103:${port}`);
});
