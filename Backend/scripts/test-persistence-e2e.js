import axios from "axios";
import { WebSocket } from "ws";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, "..");

const API_BASE = "http://localhost:5000";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uniqueSuffix = Date.now().toString().slice(-6);
const TEST_USER = {
  name: "Persistence QA User",
  email: `qa_persisted_${uniqueSuffix}@cloudforge.io`,
  password: "StrongPassword123!",
};

let authToken = null;
let testProjectId = null;
let appPyFileId = null;
let notesFileId = null;
let commitSha = null;

async function runStep(stepNumber, stepName, fn) {
  console.log(`\n======================================================`);
  console.log(`[Step ${stepNumber}] ${stepName}`);
  console.log(`======================================================`);
  try {
    const result = await fn();
    console.log(`PASS: [Step ${stepNumber}] ${stepName}`);
    return result;
  } catch (err) {
    console.error(`FAIL: [Step ${stepNumber}] ${stepName}:`, err.response?.data || err.message);
    throw err;
  }
}

async function verifyCollaboration(projectId, fileId, token) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to Collaboration Gateway for file ${fileId}...`);
    const wsUrl = `ws://localhost:5000/ws/collaboration?projectId=${projectId}&token=${token}`;
    const ws = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Collaboration handshake timed out"));
    }, 8000);

    ws.on("open", () => {
      console.log("WebSocket opened. Sending join message...");
      ws.send(JSON.stringify({
        type: "join",
        projectId,
        fileId,
        userId: "test_verifier",
        userName: "Persistence QA",
      }));
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "room_state" || msg.type === "joined" || msg.type === "sync_step2" || msg.type === "activity_history") {
          console.log(`Received collaboration response: ${msg.type}`);
          clearTimeout(timer);
          ws.close();
          resolve(true);
        }
      } catch {
        // Binary sync messages or raw buffers are also valid
        clearTimeout(timer);
        ws.close();
        resolve(true);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  console.log("================================================================================");
  console.log("CLOUDFORGE COMPREHENSIVE PERSISTENCE & LIFECYCLE VERIFICATION TEST");
  console.log("================================================================================");

  // 1. Create User Account
  await runStep(1, "Create New User Account", async () => {
    const res = await axios.post(`${API_BASE}/api/auth/register`, TEST_USER);
    authToken = res.data.token;
    if (!authToken && res.headers["set-cookie"]) {
      const cookie = res.headers["set-cookie"].find((c) => c.startsWith("token="));
      if (cookie) authToken = cookie.split(";")[0].split("=")[1];
    }
    console.log(`User created: ${TEST_USER.email} (ID: ${res.data.user.id})`);
  });

  const authHeaders = () => ({
    headers: {
      Authorization: `Bearer ${authToken}`,
      Cookie: `token=${authToken}`,
    },
  });

  // 2. Create Project
  await runStep(2, "Create Test Project", async () => {
    const res = await axios.post(
      `${API_BASE}/api/projects`,
      {
        name: `Durable Project ${uniqueSuffix}`,
        description: "Testing persistence across multiple backend restarts",
      },
      authHeaders()
    );
    testProjectId = res.data.project._id;
    console.log(`Project created: "${res.data.project.name}" (ID: ${testProjectId})`);
  });

  // 3. Create Folder and Files
  await runStep(3, "Create Folders and Files Inside Project", async () => {
    // A. Folder: /src
    const dirRes = await axios.post(
      `${API_BASE}/api/projects/${testProjectId}/files`,
      { name: "src", path: "/src", type: "directory" },
      authHeaders()
    );
    console.log(`Created directory: /src (ID: ${dirRes.data.file._id})`);

    // B. File: /src/app.py
    const appPyRes = await axios.post(
      `${API_BASE}/api/projects/${testProjectId}/files`,
      {
        name: "app.py",
        path: "/src/app.py",
        type: "file",
        content: "def compute():\n    return 'CloudForge Persistence Verified!'\n",
      },
      authHeaders()
    );
    appPyFileId = appPyRes.data.file._id;
    console.log(`Created file: /src/app.py (ID: ${appPyFileId})`);

    // C. File: /notes.txt
    const notesRes = await axios.post(
      `${API_BASE}/api/projects/${testProjectId}/files`,
      {
        name: "notes.txt",
        path: "/notes.txt",
        type: "file",
        content: "Persistence verification test file content.\nLine 2.\n",
      },
      authHeaders()
    );
    notesFileId = notesRes.data.file._id;
    console.log(`Created file: /notes.txt (ID: ${notesFileId})`);
  });

  // 4. Create Git commit
  await runStep(4, "Create Git Commit Snapshot", async () => {
    const commitRes = await axios.post(
      `${API_BASE}/api/projects/${testProjectId}/workspace/commits`,
      { message: "feat: persistent test initial commit" },
      authHeaders()
    );
    commitSha = commitRes.data.commit.sha;
    console.log(`Commit created successfully with SHA: ${commitSha}`);
  });

  // 5. Verify pre-restart state
  await runStep(5, "Verify Pre-Restart Data State", async () => {
    const wsRes = await axios.get(`${API_BASE}/api/projects/${testProjectId}/workspace`, authHeaders());
    const files = wsRes.data.files;
    if (files.length !== 3) {
      throw new Error(`Expected 3 files/folders before restart, got ${files.length}`);
    }
    console.log(`Confirmed 3 items in workspace prior to restart.`);
  });

  const testState = {
    email: TEST_USER.email,
    password: TEST_USER.password,
    projectId: testProjectId,
    appPyFileId,
    notesFileId,
    commitSha,
  };
  const fs = (await import("fs")).default;
  fs.writeFileSync(path.resolve(__dirname, "test-state.json"), JSON.stringify(testState, null, 2));
  console.log("\nPhase 1 (Creation & Initial Verification) Complete! State saved to test-state.json.");
  console.log(JSON.stringify(testState, null, 2));
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
