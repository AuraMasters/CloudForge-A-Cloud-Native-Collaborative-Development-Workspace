import crypto from "crypto";
import jwt from "jsonwebtoken";

import GitHubConnection from "../models/GitHubConnection.js";

import {
  exchangeCodeForToken,
  getGitHubUser,
  getRepositories,
  getRepository,
} from "../services/githubService.js";

import Project from "../models/Project.js";

export const connectGitHub = async (req, res) => {
  try {
    const nonce = crypto.randomBytes(32).toString("hex");

    // Create a signed OAuth state containing the
    // currently authenticated CloudForge user.
    const state = jwt.sign(
      {
        userId: req.user._id.toString(),
        nonce,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

    // Store the nonce separately so we can verify that
    // the callback belongs to the OAuth flow we started.
    res.cookie("github_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
      scope: "read:user user:email repo",
      state,
    });

    const githubAuthorizationUrl =
      `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.redirect(githubAuthorizationUrl);
  } catch (error) {
    console.error("GitHub connect error:", error);

    return res.status(500).json({
      message: "Failed to start GitHub connection",
    });
  }
};

/**
 * GitHub OAuth callback
 * GET /api/github/callback
 */
export const githubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    const storedNonce = req.cookies.github_oauth_nonce;

    if (!code || !state) {
      return res.status(400).json({
        message: "Missing GitHub authorization code or state",
      });
    }

    if (!storedNonce) {
      return res.status(403).json({
        message: "GitHub OAuth session expired",
      });
    }

    // Verify the signed state.
    let decodedState;

    try {
      decodedState = jwt.verify(
        state,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(403).json({
        message: "Invalid or expired GitHub OAuth state",
      });
    }

    // Verify that the state belongs to the OAuth request
    // that was started from this browser.
    if (decodedState.nonce !== storedNonce) {
      return res.status(403).json({
        message: "Invalid GitHub OAuth request",
      });
    }

    const cloudForgeUserId = decodedState.userId;

    // Remove OAuth nonce cookie after successful validation.
    res.clearCookie("github_oauth_nonce");

    // Exchange GitHub authorization code for access token.
    const accessToken = await exchangeCodeForToken(code);

    // Get the authenticated GitHub user.
    const githubUser = await getGitHubUser(accessToken);

    // Check whether this CloudForge user already has
    // a GitHub connection.
    const existingConnection =
      await GitHubConnection.findOne({
        user: cloudForgeUserId,
      });

    if (existingConnection) {
      existingConnection.githubUserId =
        String(githubUser.id);

      existingConnection.githubUsername =
        githubUser.login;

      existingConnection.githubEmail =
        githubUser.email || null;

      existingConnection.accessToken =
        accessToken;

      await existingConnection.save();
    } else {
      await GitHubConnection.create({
        user: cloudForgeUserId,
        githubUserId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubEmail: githubUser.email || null,
        accessToken,
      });
    }

    return res.redirect(
      `${process.env.CLIENT_URL}/github?connected=true`
    );
  } catch (error) {
    console.error("GitHub callback error:", error);

    return res.redirect(
      `${process.env.CLIENT_URL}/github?connected=false`
    );
  }
};

/**
 * Get GitHub connection status
 * GET /api/github/status
 */
export const getGitHubStatus = async (req, res) => {
  try {
    const connection =
      await GitHubConnection.findOne({
        user: req.user._id,
      }).select("-accessToken");

    if (!connection) {
      return res.json({
        connected: false,
      });
    }

    return res.json({
      connected: true,
      github: {
        id: connection.githubUserId,
        username: connection.githubUsername,
        email: connection.githubEmail,
        connectedAt: connection.connectedAt,
      },
    });
  } catch (error) {
    console.error("GitHub status error:", error);

    return res.status(500).json({
      message: "Failed to get GitHub connection status",
    });
  }
};

export const getGitHubRepositories = async (req, res) => {
  try {
    const connection =
      await GitHubConnection.findOne({
        user: req.user._id,
      });

    if (!connection) {
      return res.status(404).json({
        message: "GitHub account is not connected",
      });
    }

    const repositories = await getRepositories(
      connection.accessToken
    );

    const projects = await Project.find({
      owner: req.user._id,
      "source.type": "github",
    }).select("source.github.repositoryId");

    const importedProjects = new Map();

    projects.forEach((project) => {
      const repositoryId =
        project.source?.github?.repositoryId;

      if (repositoryId) {
        importedProjects.set(
          String(repositoryId),
          String(project._id)
        );
      }
    });

    const formattedRepositories = repositories.map(
      (repository) => {
        const repositoryId = String(repository.id);

        const projectId =
          importedProjects.get(repositoryId);

        return {
          id: repositoryId,
          name: repository.name,
          fullName: repository.full_name,
          description: repository.description || "",
          language: repository.language || "Unknown",
          private: repository.private,
          owner: repository.owner.login,
          defaultBranch:
            repository.default_branch || "main",
          url: repository.html_url,
          cloneUrl: repository.clone_url,
          alreadyImported: Boolean(projectId),
          projectId: projectId || null,
        };
      }
    );

    return res.json({
      repositories: formattedRepositories,
    });
  } catch (error) {
    console.error(
      "GitHub repositories controller error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch GitHub repositories",
    });
  }
};

/**
 * Get a specific GitHub repository
 * GET /api/github/repos/:owner/:repo
 */
export const getGitHubRepository = async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const connection =
      await GitHubConnection.findOne({
        user: req.user._id,
      });

    if (!connection) {
      return res.status(404).json({
        message: "GitHub account is not connected",
      });
    }

    const repository = await getRepository(
      connection.accessToken,
      owner,
      repo
    );

    return res.json({
      repository,
    });
  } catch (error) {
    console.error(
      "GitHub repository controller error:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch GitHub repository",
    });
  }
};

/**
 * Disconnect GitHub
 * DELETE /api/github/disconnect
 */
export const disconnectGitHub = async (req, res) => {
  try {
    const connection =
      await GitHubConnection.findOneAndDelete({
        user: req.user._id,
      });

    if (!connection) {
      return res.status(404).json({
        message: "GitHub account is not connected",
      });
    }

    return res.json({
      message: "GitHub account disconnected successfully",
    });
  } catch (error) {
    console.error(
      "GitHub disconnect error:",
      error
    );

    return res.status(500).json({
      message: "Failed to disconnect GitHub account",
    });
  }
};