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

// Get GitHub OAuth authorization URL via API (recommended for cross-origin setups)
router.get("/auth-url", protect, getGitHubAuthUrl);

// Direct browser navigation endpoint to start GitHub OAuth.
// User must already be logged into CloudForge.
router.get("/connect", protect, connectGitHub);

// GitHub redirects here after authorization.
// Do NOT use protect here.
// The CloudForge user is recovered from the OAuth state.
router.get("/callback", githubCallback);

// Check whether the current CloudForge user
// has connected a GitHub account.
router.get("/status", protect, getGitHubStatus);

// Get repositories from the connected GitHub account.
router.get("/repos", protect, getGitHubRepositories);

// Get a specific repository.
router.get(
  "/repos/:owner/:repo",
  protect,
  getGitHubRepository
);

// Disconnect GitHub from the CloudForge account.
router.delete(
  "/disconnect",
  protect,
  disconnectGitHub
);

export default router;