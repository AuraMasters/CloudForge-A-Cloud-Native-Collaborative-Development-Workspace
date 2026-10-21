import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB, { disconnectDB } from "./config/db.js";

import terminalGateway from "./services/terminalGateway.js";
import collaborationGateway from "./services/collaborationGateway.js";
import collaborationService from "./services/collaborationService.js";

dotenv.config();

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const connected = await connectDB();

  if (!connected) {
    console.error("Server startup aborted because MongoDB connection failed.");
    process.exit(1);
  }

  // Ensure default developer user exists
  try {
    const User = (await import("./models/User.js")).default;
    const bcrypt = (await import("bcryptjs")).default;
    const seedEmail = "developer@cloudforge.io";
    const existingSeed = await User.findOne({ email: seedEmail });
    if (!existingSeed) {
      const hashedPassword = await bcrypt.hash("Password123!", 12);
      await User.create({
        name: "Cloud Developer",
        email: seedEmail,
        password: hashedPassword,
      });
      console.log("Default developer account seeded: developer@cloudforge.io / Password123!");
    }
  } catch (seedErr) {
    console.warn("User auto-seed check skipped:", seedErr.message);
  }

  // Initialize Terminal WebSocket Gateway
  terminalGateway.init(server);

  // Initialize Collaboration WebSocket Gateway
  collaborationGateway.init();

  server.listen(PORT, async () => {
    console.log(`CloudForge backend running on port ${PORT} [Env: ${process.env.NODE_ENV || "development"}]`);
    console.log(`Terminal WebSocket Gateway listening on ws://localhost:${PORT}/ws/terminal`);
    console.log(`Collaboration WebSocket Gateway listening on ws://localhost:${PORT}/ws/collaboration`);

    // Auto-boot local CloudForge Runner Service if configured on localhost:5050
    if (process.env.CLOUD_RUNNER_API_URL && process.env.CLOUD_RUNNER_API_URL.includes("5050")) {
      try {
        const net = (await import("net")).default;
        const isRunning = await new Promise((res) => {
          const s = new net.Socket();
          s.setTimeout(500);
          s.once("connect", () => { s.destroy(); res(true); });
          s.once("timeout", () => { s.destroy(); res(false); });
          s.once("error", () => { s.destroy(); res(false); });
          s.connect(5050, "127.0.0.1");
        });

        if (!isRunning) {
          await import("./runner/server.js");
          console.log("Local CloudForge Container Runner Service auto-started on port 5050");
        } else {
          console.log("Local CloudForge Container Runner Service connected on port 5050");
        }
      } catch (err) {
        console.warn("Local Cloud Runner startup note:", err.message);
      }
    }
  });
};

const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Flushing collaboration documents...`);
  try {
    await collaborationService.destroy();
  } catch (err) {
    console.error("Error flushing documents on shutdown:", err.message);
  }
  try {
    await disconnectDB();
  } catch (err) {
    console.error("Error disconnecting database on shutdown:", err.message);
  }
  process.exit(0);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.once("SIGUSR2", async () => {
  await handleShutdown("SIGUSR2");
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION in server:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION in server:", reason);
});

process.on("exit", (code) => {
  console.log(`[SERVER LIFECYCLE] Node.js server process exiting with code: ${code}`);
});

startServer();