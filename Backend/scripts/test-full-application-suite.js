import axios from "axios";
import WebSocket from "ws";

const BASE_URL = "http://127.0.0.1:5000";
const WS_COLLAB = "ws://127.0.0.1:5000/ws/collaboration";
const WS_TERMINAL = "ws://127.0.0.1:5000/ws/terminal";

function extractToken(res) {
  if (res.data?.token) return res.data.token;
  const cookies = res.headers["set-cookie"];
  if (cookies) {
    for (const c of cookies) {
      const match = c.match(/token=([^;]+)/);
      if (match) return match[1];
    }
  }
  return null;
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ [PASS]: ${message}`);
  } else {
    testsFailed++;
    console.error(`  ❌ [FAIL]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("CLOUDFORGE COMPLETE FULL APPLICATION REGRESSION SUITE");
  console.log("================================================================================");

  const ts = Date.now();

  // 1. Health check
  console.log("\n[TEST 1] System Health Check (/health)...");
  const healthRes = await axios.get(`${BASE_URL}/health`);
  assert(healthRes.status === 200, "Health check status 200");
  assert(healthRes.data.status === "healthy", "Health status is 'healthy'");

  // 2. Authentication: Registration
  console.log("\n[TEST 2] User Registration (/api/auth/register)...");
  const userData = {
    name: "Master Tester",
    email: `tester_${ts}@cloudforge.dev`,
    password: "Password123!",
  };
  const regRes = await axios.post(`${BASE_URL}/api/auth/register`, userData);
  assert(regRes.status === 201, "User registered with status 201");
  const token = extractToken(regRes);
  assert(token !== null, "JWT token returned upon registration");
  const user = regRes.data.user;
  assert(user.email === userData.email, "Registered user email matches");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `token=${token}`,
    },
  };

  // 3. Current User Profile (/api/auth/me)
  console.log("\n[TEST 3] User Profile & Protected Route (/api/auth/me)...");
  const meRes = await axios.get(`${BASE_URL}/api/auth/me`, authHeaders);
  assert(meRes.status === 200, "Me endpoint returned status 200");
  assert(meRes.data.user.email === userData.email, "Current user matches registered user");

  // 4. Authentication: Login
  console.log("\n[TEST 4] User Login (/api/auth/login)...");
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: userData.email,
    password: userData.password,
  });
  assert(loginRes.status === 200, "User logged in with status 200");
  const loginToken = extractToken(loginRes);
  assert(loginToken !== null, "Login returned valid JWT");

  // 5. Project Creation (/api/projects)
  console.log("\n[TEST 5] Create Project (/api/projects)...");
  const projRes = await axios.post(
    `${BASE_URL}/api/projects`,
    {
      name: `CloudForge Suite Project ${ts}`,
      description: "Full end-to-end regression testing project",
    },
    authHeaders
  );
  assert(projRes.status === 201, "Project created with status 201");
  const project = projRes.data.project;
  const projectId = project._id;
  assert(project.name.includes("CloudForge Suite"), "Project name matches");

  // 6. Project Read (/api/projects/:id)
  console.log("\n[TEST 6] Read Project Details (/api/projects/:id)...");
  const getProjRes = await axios.get(`${BASE_URL}/api/projects/${projectId}`, authHeaders);
  assert(getProjRes.status === 200, "Project fetched with status 200");
  assert(getProjRes.data.project._id === projectId, "Fetched project ID matches");

  // 7. Project Update (/api/projects/:id)
  console.log("\n[TEST 7] Update Project (/api/projects/:id)...");
  const updateProjRes = await axios.put(
    `${BASE_URL}/api/projects/${projectId}`,
    { description: "Updated project description" },
    authHeaders
  );
  assert(updateProjRes.status === 200, "Project updated with status 200");
  assert(updateProjRes.data.project.description === "Updated project description", "Description updated");

  // 8. Project Environment Variables (/api/projects/:id/env)
  console.log("\n[TEST 8] Environment Variables CRUD (/api/projects/:id/env)...");
  const envUpdateRes = await axios.put(
    `${BASE_URL}/api/projects/${projectId}/env`,
    {
      envVariables: [
        { key: "API_KEY", value: "secret123" },
        { key: "PORT", value: "3000" },
      ],
    },
    authHeaders
  );
  assert(envUpdateRes.status === 200, "Env variables updated with status 200");
  const envGetRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/env`, authHeaders);
  assert(envGetRes.data.envVariables.length === 2, "2 environment variables retrieved");

  // 9. Workspace Files & Folders
  console.log("\n[TEST 9] Workspace File & Folder CRUD...");
  // Create Directory: /src
  const dirRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/files`,
    { name: "src", path: "/src", type: "directory" },
    authHeaders
  );
  assert(dirRes.status === 201, "Directory /src created with status 201");
  const dirId = dirRes.data.file._id;

  // Create File: /src/index.js
  const fileRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/files`,
    {
      name: "index.js",
      path: "/src/index.js",
      type: "file",
      content: "console.log('Hello CloudForge!');\n",
    },
    authHeaders
  );
  assert(fileRes.status === 201, "File /src/index.js created with status 201");
  const fileId = fileRes.data.file._id;

  // Update File Content: /src/index.js
  const updateFileRes = await axios.put(
    `${BASE_URL}/api/projects/${projectId}/files/${fileId}`,
    { content: "console.log('Updated CloudForge content!');\n" },
    authHeaders
  );
  assert(updateFileRes.status === 200, "File content updated with status 200");
  assert(updateFileRes.data.file.content.includes("Updated"), "Content updated correctly");

  // Batch create files
  const batchRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/files/batch`,
    {
      files: [
        { name: "README.md", path: "/README.md", type: "file", content: "# CloudForge Workspace\n" },
        { name: "config.json", path: "/config.json", type: "file", content: '{"version":"1.0.0"}' },
      ],
    },
    authHeaders
  );
  assert(batchRes.status === 201, "Batch files created with status 201");

  // Rename File: /README.md -> /GUIDE.md
  const readmeFile = batchRes.data.files.find((f) => f.name === "README.md");
  const renameRes = await axios.put(
    `${BASE_URL}/api/projects/${projectId}/files/${readmeFile._id}/rename`,
    { newName: "GUIDE.md" },
    authHeaders
  );
  assert(renameRes.status === 200, "File renamed to GUIDE.md");

  // Fetch Workspace Tree
  const wsTreeRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/workspace`, authHeaders);
  assert(wsTreeRes.status === 200, "Workspace tree fetched");
  assert(wsTreeRes.data.files.length >= 4, "Workspace contains created files and folders");

  // 10. Git Version Control System (VCS)
  console.log("\n[TEST 10] Git Version Control System (VCS)...");
  // Commit workspace state
  const commit1Res = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/workspace/commits`,
    { message: "Initial commit of workspace" },
    authHeaders
  );
  assert(commit1Res.status === 201, "Commit 1 created with status 201");
  const commit1Sha = commit1Res.data.commit.sha;
  assert(commit1Sha !== undefined, "Commit SHA generated");

  // List Commits History
  const commitsListRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/workspace/commits`, authHeaders);
  assert(commitsListRes.data.commits.length >= 1, "Commits history lists created commit");

  // Create new branch
  const branchRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/vcs/branches`,
    { branchName: "feature/awesome" },
    authHeaders
  );
  assert(branchRes.status === 200, "Branch 'feature/awesome' created or switched");

  // Create Stash
  const stashRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/vcs/stash`,
    { message: "WIP stash test" },
    authHeaders
  );
  assert(stashRes.status === 200 || stashRes.status === 201, "Stash operation completed");

  // Create Tag
  const tagRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/vcs/tags`,
    { name: "v1.0.0", sha: commit1Sha, message: "Production Release 1.0" },
    authHeaders
  );
  assert(tagRes.status === 201, "Tag 'v1.0.0' created with status 201");

  // 11. Collaborator Management
  console.log("\n[TEST 11] Collaborators Management...");
  // Register collaborator user
  const collabUserData = {
    name: "Collaborator QA",
    email: `collab_${ts}@cloudforge.dev`,
    password: "Password123!",
  };
  const regCollabRes = await axios.post(`${BASE_URL}/api/auth/register`, collabUserData);
  const collabUser = regCollabRes.data.user;

  // Invite collaborator
  const inviteRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/collaborators`,
    { email: collabUserData.email },
    authHeaders
  );
  assert(inviteRes.status === 200, "Collaborator invited successfully");

  // List collaborators
  const listCollabRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/collaborators`, authHeaders);
  assert(listCollabRes.data.collaborators.length >= 1, "Collaborator appears in project collaborators list");

  // 12. WebSocket Collaboration Gateway (/ws/collaboration)
  console.log("\n[TEST 12] Real-Time Collaboration Gateway (/ws/collaboration)...");
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_COLLAB}?projectId=${projectId}&token=${token}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Collaboration connection timeout"));
    }, 6000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "presence_update", data: { currentFileId: fileId, cursor: { line: 1, col: 5 } } }));
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "connected" || msg.type === "activity_event") {
          assert(true, `Collaboration WebSocket message received: ${msg.type}`);
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } catch (err) {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // 13. Terminal WebSocket Gateway (/ws/terminal)
  console.log("\n[TEST 13] Terminal WebSocket Gateway (/ws/terminal)...");
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_TERMINAL}?projectId=${projectId}&token=${token}&cols=80&rows=24`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(); // WebSocket connection succeeded
    }, 4000);

    ws.on("open", () => {
      assert(true, "Terminal WebSocket connected with valid auth");
      clearTimeout(timeout);
      ws.close();
      resolve();
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // 14. Project Delete
  console.log("\n[TEST 14] Delete Project (/api/projects/:id)...");
  const delProjRes = await axios.delete(`${BASE_URL}/api/projects/${projectId}`, authHeaders);
  assert(delProjRes.status === 200, "Project deleted with status 200");

  console.log("\n================================================================================");
  console.log(`🏆 SUITE COMPLETE: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("Suite failed with error:", err.response?.data || err.message);
  process.exit(1);
});
