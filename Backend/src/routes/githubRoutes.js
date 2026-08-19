import express from "express";

import {
  connectGitHub,
  getGitHubAuthUrl,
  githubCallback,
  getGitHubStatus,
  getGitHubRepositories,
  getGitHubRepository,
  disconnectGitHub,
} from "../controllers/githubController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/auth-url", protect, getGitHubAuthUrl);

router.get("/connect", protect, connectGitHub);

router.get("/callback", githubCallback);

router.get("/status", protect, getGitHubStatus);

router.get("/repos", protect, getGitHubRepositories);

router.get(
  "/repos/:owner/:repo",
  protect,
  getGitHubRepository
);

router.delete(
  "/disconnect",
  protect,
  disconnectGitHub
);

export default router;