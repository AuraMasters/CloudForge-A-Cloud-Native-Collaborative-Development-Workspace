import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";

dotenv.config();

const app = express();

// Trust reverse proxy (Render, Heroku, AWS ELB, Cloudflare)
app.set("trust proxy", 1);

// Flexible cross-origin resource sharing for Vercel + Local development
const clientUrl = (process.env.CLIENT_URL || "").replace(/\/$/, "");
const allowedOrigins = [
  clientUrl,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".vercel.app") ||
        cleanOrigin.endsWith(".onrender.com")
      ) {
        return callback(null, true);
      }

      // Permissive fallback so any Vercel preview domain can connect
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Root & Health Check Endpoints
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "CloudForge API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/github", githubRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const connected = await connectDB();

  if (!connected) {
    console.error("Server startup aborted because MongoDB connection failed.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`CloudForge backend running on port ${PORT} [Env: ${process.env.NODE_ENV || "development"}]`);
  });
};

startServer();