import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Deployment from "../models/Deployment.js";
import Project from "../models/Project.js";
import ProjectFile from "../models/ProjectFile.js";
import containerService from "./containerService.js";
import runtimeRegistry from "./runtimeRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEPLOYMENTS_ROOT = path.resolve(__dirname, "../../storage/deployments");

if (!fs.existsSync(DEPLOYMENTS_ROOT)) {
  fs.mkdirSync(DEPLOYMENTS_ROOT, { recursive: true });
}

// MIME types for static site serving
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".wasm": "application/wasm",
  ".map": "application/json",
};

class DeploymentService {
  constructor() {
    this.activeDeploys = new Map();
  }

  /**
   * Recursive directory copy helper
   */
  _copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this._copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Append log entry to a deployment
   */
  async _appendLog(deployId, stream, message) {
    try {
      await Deployment.updateOne(
        { deployId },
        {
          $push: {
            logs: {
              timestamp: new Date(),
              stream,
              message: message.trim(),
            },
          },
        }
      );
    } catch {
      // ignore
    }
  }

  /**
   * Start a new deployment pipeline
   */
  async startDeploy(projectId, options = {}, userId = null) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const deployId = `dep_${crypto.randomBytes(6).toString("hex")}`;
    const detected = await runtimeRegistry.detectProjectFramework(projectId);

    const target = options.target || "static";
    const buildCommand = options.buildCommand || detected.buildCommand || "npm run build";
    const outputDir = options.outputDir || detected.outputDir || "dist";
    const runtime = detected.runtime || "node";

    const deployment = await Deployment.create({
      projectId,
      deployId,
      status: "queued",
      target,
      buildCommand,
      outputDir,
      runtime,
      framework: {
        id: detected.id,
        name: detected.name,
        icon: detected.icon,
      },
      branch: project.currentBranch || "main",
      commitSha: project.lastCommitSha || null,
      triggeredBy: userId,
      startedAt: new Date(),
      siteUrl: `/api/projects/${projectId}/deploy/${deployId}/site/`,
      logs: [
        {
          timestamp: new Date(),
          stream: "system",
          message: `Deployment queued: Framework detected as ${detected.name}`,
        },
      ],
    });

    // Run build process asynchronously in background
    this._runBuildPipeline(projectId, deployment).catch((err) => {
      console.error(`Build pipeline uncaught error for ${deployId}:`, err);
    });

    return deployment;
  }

  /**
   * Internal build execution pipeline
   */
  async _runBuildPipeline(projectId, deployment) {
    const deployId = deployment.deployId;
    const deployArtifactDir = path.join(DEPLOYMENTS_ROOT, deployId);

    try {
      await Deployment.updateOne({ deployId }, { status: "building" });
      await this._appendLog(deployId, "system", "Starting workspace synchronization and build process...");

      // 1. Sync workspace files to ensure local disk/container has latest code
      await containerService.syncFilesToWorkspace(projectId);
      const workspaceDir = containerService.getProjectWorkspaceDir(projectId);

      await this._appendLog(deployId, "system", `Workspace ready at ${workspaceDir}`);

      // Check if project is pure static (e.g. index.html without package.json)
      const hasPackageJson = fs.existsSync(path.join(workspaceDir, "package.json"));
      const hasIndexHtml = fs.existsSync(path.join(workspaceDir, "index.html"));

      if (!hasPackageJson && hasIndexHtml) {
        // Pure static HTML/CSS/JS project — no build command needed!
        await this._appendLog(deployId, "system", "Detected static site without build step. Packaging artifacts...");
        this._copyDir(workspaceDir, deployArtifactDir);
      } else {
        // Execute framework build command
        await this._appendLog(deployId, "stdout", `$ ${deployment.buildCommand}`);

        // If package.json exists and node_modules does not, install first
        if (hasPackageJson && !fs.existsSync(path.join(workspaceDir, "node_modules"))) {
          await this._appendLog(deployId, "system", "Installing project dependencies ($ npm install)...");
          const installRes = await containerService.execCommand(projectId, "npm install");
          if (installRes.stdout) await this._appendLog(deployId, "stdout", installRes.stdout);
          if (installRes.stderr) await this._appendLog(deployId, "stderr", installRes.stderr);
          if (!installRes.success) {
            throw new Error(`Dependency installation failed: ${installRes.stderr}`);
          }
        }

        const buildRes = await containerService.execCommand(projectId, deployment.buildCommand, {
          NODE_ENV: "production",
        });

        if (buildRes.stdout) await this._appendLog(deployId, "stdout", buildRes.stdout);
        if (buildRes.stderr) await this._appendLog(deployId, "stderr", buildRes.stderr);

        if (!buildRes.success) {
          throw new Error(`Build failed with exit code ${buildRes.exitCode}: ${buildRes.stderr || "Unknown error"}`);
        }

        // Locate build output directory (e.g., dist, build, out, or workspace root)
        let resolvedOutputDir = path.join(workspaceDir, deployment.outputDir);
        if (!fs.existsSync(resolvedOutputDir)) {
          // Fallback checks
          if (fs.existsSync(path.join(workspaceDir, "build"))) {
            resolvedOutputDir = path.join(workspaceDir, "build");
          } else if (fs.existsSync(path.join(workspaceDir, "dist"))) {
            resolvedOutputDir = path.join(workspaceDir, "dist");
          } else if (fs.existsSync(path.join(workspaceDir, "out"))) {
            resolvedOutputDir = path.join(workspaceDir, "out");
          } else {
            resolvedOutputDir = workspaceDir;
          }
        }

        await this._appendLog(deployId, "system", `Packaging build output from ${resolvedOutputDir}...`);
        this._copyDir(resolvedOutputDir, deployArtifactDir);
      }

      // Verify that index.html exists in artifacts
      const artifactIndex = path.join(deployArtifactDir, "index.html");
      if (!fs.existsSync(artifactIndex)) {
        // Check if index.html is located in a subfolder or root
        const files = fs.readdirSync(deployArtifactDir);
        const htmlFile = files.find((f) => f.endsWith(".html"));
        if (!htmlFile) {
          // Create fallback index.html listing files
          fs.writeFileSync(
            artifactIndex,
            `<!DOCTYPE html><html><head><title>Deployed Application</title><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:2rem;"><h1>Application Deployed Successfully</h1><p>Deploy ID: ${deployId}</p></body></html>`
          );
        }
      }

      // Mark previous current deployments as not current
      await Deployment.updateMany({ projectId, isCurrent: true }, { isCurrent: false });

      await Deployment.updateOne(
        { deployId },
        {
          status: "ready",
          isCurrent: true,
          artifactPath: deployArtifactDir,
          finishedAt: new Date(),
        }
      );

      await this._appendLog(deployId, "system", "Deployment completed successfully! Site is live.");
    } catch (err) {
      console.error(`Deployment ${deployId} failed:`, err);
      await this._appendLog(deployId, "stderr", `Build error: ${err.message}`);
      await Deployment.updateOne(
        { deployId },
        {
          status: "failed",
          error: err.message,
          finishedAt: new Date(),
        }
      );
    }
  }

  /**
   * Serve static site file with SPA fallback
   */
  async serveDeployedFile(projectId, deployId, requestPath = "", res) {
    const deployment = await Deployment.findOne({ deployId, projectId });
    if (!deployment) {
      return res.status(404).send("Deployment not found");
    }

    if (deployment.status !== "ready") {
      return res.status(503).send(`Deployment is ${deployment.status}. Please wait or check logs.`);
    }

    const artifactDir = path.join(DEPLOYMENTS_ROOT, deployId);
    if (!fs.existsSync(artifactDir)) {
      return res.status(404).send("Deployment artifacts not found on storage.");
    }

    let cleanPath = requestPath.replace(/^\/+/, "");
    if (!cleanPath || cleanPath === "") {
      cleanPath = "index.html";
    }

    let filePath = path.resolve(artifactDir, cleanPath);

    // Prevent directory traversal
    if (!filePath.startsWith(artifactDir)) {
      return res.status(403).send("Forbidden access.");
    }

    // If directory requested, check for index.html inside it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    // SPA fallback: If file does not exist and doesn't have an asset extension, serve index.html
    if (!fs.existsSync(filePath)) {
      const ext = path.extname(cleanPath).toLowerCase();
      if (!ext || ext === ".html") {
        filePath = path.join(artifactDir, "index.html");
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  /**
   * List all deployments for a project
   */
  async listDeployments(projectId) {
    return Deployment.find({ projectId }).sort({ createdAt: -1 }).select("-artifactPath");
  }

  /**
   * Get single deployment details
   */
  async getDeployment(projectId, deployId) {
    return Deployment.findOne({ projectId, deployId }).select("-artifactPath");
  }

  /**
   * Get logs for a deployment
   */
  async getDeploymentLogs(projectId, deployId) {
    const deployment = await Deployment.findOne({ projectId, deployId }).select("logs status deployId");
    if (!deployment) {
      throw new Error("Deployment not found");
    }
    return deployment;
  }

  /**
   * Redeploy an existing deployment
   */
  async redeploy(projectId, deployId, userId = null) {
    const existing = await Deployment.findOne({ projectId, deployId });
    if (!existing) {
      throw new Error("Deployment not found");
    }

    return this.startDeploy(
      projectId,
      {
        target: existing.target,
        buildCommand: existing.buildCommand,
        outputDir: existing.outputDir,
      },
      userId
    );
  }

  /**
   * Delete a deployment and its artifacts
   */
  async deleteDeployment(projectId, deployId) {
    const deployment = await Deployment.findOne({ projectId, deployId });
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const artifactDir = path.join(DEPLOYMENTS_ROOT, deployId);
    if (fs.existsSync(artifactDir)) {
      fs.rmSync(artifactDir, { recursive: true, force: true });
    }

    await Deployment.deleteOne({ deployId, projectId });
    return { success: true, message: "Deployment deleted successfully" };
  }
}

export const deploymentService = new DeploymentService();
export default deploymentService;
