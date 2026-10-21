import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNNER_STORAGE = path.resolve(__dirname, "../../storage/runner_workspaces");

if (!fs.existsSync(RUNNER_STORAGE)) {
  fs.mkdirSync(RUNNER_STORAGE, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const RUNNER_PORT = process.env.RUNNER_PORT || 5050;
const RUNNER_API_KEY = process.env.CLOUD_RUNNER_API_KEY || "cf_live_sec_your_secret_runner_key";
const RUNNER_REGION = process.env.CLOUD_RUNNER_REGION || "us-east-1 (Cloud)";

// In-memory active workspaces registry
const activeWorkspaces = new Map();

/**
 * Authentication Middleware
 */
const requireApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!RUNNER_API_KEY) return next();

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.substring(7).trim();
  if (token !== RUNNER_API_KEY) {
    return res.status(403).json({ success: false, error: "Forbidden: Invalid runner API key" });
  }

  next();
};

/**
 * Health & Capabilities Check
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    activeWorkspaces: activeWorkspaces.size,
    version: "2.1.0-cloud",
    region: RUNNER_REGION,
    service: "CloudForge Dedicated Container Runner",
  });
});

/**
 * Provision / Synchronize Workspace
 * POST /v1/workspaces
 */
app.post("/v1/workspaces", requireApiKey, async (req, res) => {
  try {
    const { projectId, projectName = "Workspace", runtime = "node", envVariables = {}, files = [] } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const workspaceDir = path.join(RUNNER_STORAGE, projectId.toString());
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Write incoming files to disk workspace
    for (const file of files) {
      let relPath = file.path || file.name || "";
      if (relPath.startsWith("/")) relPath = relPath.substring(1);
      if (!relPath) continue;

      const fullPath = path.resolve(workspaceDir, relPath);
      // Path traversal security check
      if (!fullPath.startsWith(workspaceDir)) continue;

      if (file.type === "directory") {
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      } else {
        const parent = path.dirname(fullPath);
        if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
        fs.writeFileSync(fullPath, file.content || "", "utf8");
      }
    }

    const containerId = `cf-runner-${projectId.toString().substring(0, 8)}`;
    activeWorkspaces.set(projectId.toString(), {
      projectId: projectId.toString(),
      projectName,
      runtime,
      workspaceDir,
      envVariables,
      startedAt: new Date(),
      status: "running",
    });

    res.json({
      success: true,
      containerId,
      machineId: containerId,
      status: "running",
      region: RUNNER_REGION,
      message: `Workspace provisioned on CloudForge Dedicated Runner (${RUNNER_REGION}).`,
    });
  } catch (err) {
    console.error("Workspace provision error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Stop Workspace
 * POST /v1/workspaces/:id/stop
 */
app.post("/v1/workspaces/:id/stop", requireApiKey, (req, res) => {
  const { id } = req.params;
  if (activeWorkspaces.has(id)) {
    activeWorkspaces.delete(id);
  }
  res.json({ success: true, status: "stopped", message: `Workspace ${id} stopped.` });
});

/**
 * Execute Command
 * POST /v1/workspaces/:id/exec
 */
app.post("/v1/workspaces/:id/exec", requireApiKey, (req, res) => {
  const { id } = req.params;
  const { command, env = {}, timeout = 60000 } = req.body;

  if (!command) {
    return res.status(400).json({ success: false, error: "command is required" });
  }

  const workspaceDir = path.join(RUNNER_STORAGE, id.toString());
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  const isWindows = process.platform === "win32";
  const shell = isWindows ? "cmd.exe" : "/bin/sh";
  const args = isWindows ? ["/c", command] : ["-c", command];

  let stdout = "";
  let stderr = "";
  let settled = false;

  const child = spawn(shell, args, {
    cwd: workspaceDir,
    env: {
      ...process.env,
      WORKSPACE: workspaceDir,
      ...env,
    },
  });

  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    try {
      if (isWindows && child.pid) {
        spawn("taskkill", ["/pid", child.pid.toString(), "/f", "/t"]);
      } else {
        child.kill("SIGKILL");
      }
    } catch {
      // ignore
    }
    return res.json({
      success: false,
      exitCode: 124,
      stdout,
      stderr: (stderr ? stderr + "\n" : "") + `Command timed out after ${timeout}ms`,
      timedOut: true,
    });
  }, timeout);

  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("close", (code) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    return res.json({
      success: code === 0,
      exitCode: code ?? 0,
      stdout,
      stderr,
      command,
    });
  });

  child.on("error", (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    return res.status(500).json({
      success: false,
      exitCode: 1,
      stdout,
      stderr: err.message,
    });
  });
});

app.listen(RUNNER_PORT, () => {
  console.log(`CloudForge Dedicated Container Runner Service running on port ${RUNNER_PORT}`);
  console.log(`Region: ${RUNNER_REGION} | Health: http://localhost:${RUNNER_PORT}/health`);
});
