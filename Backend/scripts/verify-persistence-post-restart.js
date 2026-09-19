import axios from "axios";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, "test-state.json");
const API_BASE = "http://localhost:5000";

async function verifyCollaboration(projectId, fileId, token) {
  return new Promise((resolve, reject) => {
    console.log(`Testing Collaboration WebSocket at ws://localhost:5000/ws/collaboration...`);
    const wsUrl = `ws://localhost:5000/ws/collaboration?projectId=${projectId}&token=${token}`;
    const ws = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Collaboration WebSocket handshake timed out"));
    }, 8000);

    ws.on("open", () => {
      console.log("Collaboration WebSocket connected! Sending join request...");
      ws.send(
        JSON.stringify({
          type: "join",
          projectId,
          fileId,
          userId: "qa_verifier",
          userName: "Persistence Verifier",
        })
      );
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log(`Received collaboration WebSocket event: ${msg.type}`);
        if (
          msg.type === "connected" ||
          msg.type === "activity_event" ||
          msg.type === "room_state" ||
          msg.type === "joined" ||
          msg.type === "sync_step2" ||
          msg.type === "activity_history" ||
          msg.type === "presence_sync"
        ) {
          console.log(`Verified collaboration message received: ${msg.type}`);
          clearTimeout(timer);
          ws.close();
          resolve(true);
        }
      } catch {
        // Binary sync messages (Uint8Array)
        console.log("Received binary sync frame from collaboration gateway");
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
  console.log("CLOUDFORGE POST-RESTART PERSISTENCE VERIFICATION");
  console.log("================================================================================");

  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`State file not found at ${STATE_FILE}. Please run Phase 1 first.`);
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  const { email, password, projectId, commitSha } = state;

  console.log(`Verifying persistence for:`);
  console.log(`- Account: ${email}`);
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Expected Commit: ${commitSha}`);

  // 1. Log in with previously created account
  console.log("\n[Check 1] Attempting login with previously created user account...");
  const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
    email,
    password,
  });

  let token = loginRes.data.token;
  if (!token && loginRes.headers["set-cookie"]) {
    const cookie = loginRes.headers["set-cookie"].find((c) => c.startsWith("token="));
    if (cookie) token = cookie.split(";")[0].split("=")[1];
  }

  if (!loginRes.data.user?.id) {
    throw new Error("Login failed: User data missing in response");
  }
  console.log(`✅ [Check 1] User successfully logged in after restart! User ID: ${loginRes.data.user.id}`);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `token=${token}`,
    },
  };

  // 2. Verify project exists in user's projects list
  console.log("\n[Check 2] Verifying project list for user...");
  const projectsRes = await axios.get(`${API_BASE}/api/projects`, authHeaders);
  const matchedProject = projectsRes.data.projects.find((p) => String(p._id) === String(projectId));
  if (!matchedProject) {
    throw new Error(`Project ${projectId} not found in user's project list after restart!`);
  }
  console.log(`✅ [Check 2] Project survived restart! Name: "${matchedProject.name}" (ID: ${matchedProject._id})`);

  // 3. Verify workspace folders, files, and contents
  console.log("\n[Check 3] Verifying workspace folders, files, and contents...");
  const wsRes = await axios.get(`${API_BASE}/api/projects/${projectId}/workspace`, authHeaders);
  const files = wsRes.data.files || [];

  console.log(`Found ${files.length} items in workspace after restart:`);
  files.forEach((f) => console.log(`  - [${f.type}] ${f.path}`));

  const srcDir = files.find((f) => f.path === "/src" && f.type === "directory");
  if (!srcDir) {
    throw new Error("Directory '/src' is missing after restart!");
  }
  console.log(`✅ [Check 3A] Directory '/src' survived restart intact.`);

  const appPy = files.find((f) => f.path === "/src/app.py" && f.type === "file");
  if (!appPy) {
    throw new Error("File '/src/app.py' is missing after restart!");
  }
  const expectedAppPyContent = "def compute():\n    return 'CloudForge Persistence Verified!'\n";
  if (appPy.content !== expectedAppPyContent) {
    throw new Error(`File '/src/app.py' content mismatch! Expected: ${JSON.stringify(expectedAppPyContent)}, Got: ${JSON.stringify(appPy.content)}`);
  }
  console.log(`✅ [Check 3B] File '/src/app.py' survived restart with 100% exact content match.`);

  const notesTxt = files.find((f) => f.path === "/notes.txt" && f.type === "file");
  if (!notesTxt) {
    throw new Error("File '/notes.txt' is missing after restart!");
  }
  const expectedNotesContent = "Persistence verification test file content.\nLine 2.\n";
  if (notesTxt.content !== expectedNotesContent) {
    throw new Error(`File '/notes.txt' content mismatch! Expected: ${JSON.stringify(expectedNotesContent)}, Got: ${JSON.stringify(notesTxt.content)}`);
  }
  console.log(`✅ [Check 3C] File '/notes.txt' survived restart with 100% exact content match.`);

  // 4. Verify Git commit metadata
  console.log("\n[Check 4] Verifying Git commits metadata...");
  const commitsRes = await axios.get(`${API_BASE}/api/projects/${projectId}/workspace/commits`, authHeaders);
  const commits = commitsRes.data.commits || [];
  const foundCommit = commits.find((c) => c.sha === commitSha);
  if (!foundCommit) {
    throw new Error(`Commit SHA ${commitSha} not found in project commit history after restart!`);
  }
  console.log(`✅ [Check 4] Git commit survived restart! SHA: ${foundCommit.sha} - "${foundCommit.message}"`);

  // 5. Verify Real-Time Collaboration Gateway
  console.log("\n[Check 5] Verifying real-time collaboration after restart...");
  await verifyCollaboration(projectId, appPy._id, token);
  console.log(`✅ [Check 5] Real-time collaboration WebSocket successfully connected and synched!`);

  console.log("\n================================================================================");
  console.log("🎉 ALL PERSISTENCE VERIFICATION CHECKS PASSED!");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err.response?.data || err.message);
  process.exit(1);
});
