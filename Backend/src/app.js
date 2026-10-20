import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import previewRoutes from "./routes/previewRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin) return callback(null, true);

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all Vercel deployments and preview URLs
      if (origin.endsWith(".vercel.app") || origin.includes(".vercel.app")) {
        return callback(null, true);
      }

      // Allow any localhost origin during dev
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Default allow for deployed frontend flexibility
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "CloudForge Unified Monorepo API",
    version: "1.2.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    environment: process.env.NODE_ENV || (process.env.VERCEL ? "production" : "development"),
    timestamp: new Date().toISOString(),
  });
});

// Dual mounting: support both /api/... and direct path rewrites seamlessly
app.use("/api/projects/:id/preview", previewRoutes);
app.use("/projects/:id/preview", previewRoutes);

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/projects", projectRoutes);
app.use("/projects", projectRoutes);

export default app;
