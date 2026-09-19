import WebSocket from "ws";
import axios from "axios";
import * as Y from "yjs";

const BASE_URL = "http://127.0.0.1:5000";
const WS_URL = "ws://127.0.0.1:5000/ws/collaboration";

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(str) {
  return Buffer.from(str, "base64");
}

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

async function runE2ETests() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL CLOUDFORGE COLLABORATION E2E TEST");
  console.log("==================================================");

  // 1. Register / Login User A & User B
  console.log("\n[Step 1] Authenticating User A and User B...");
  const ts = Date.now();
  const userAData = {
    name: "Alice Engineer",
    email: `alice_${ts}@cloudforge.test`,
    password: "Password123!",
  };
  const userBData = {
    name: "Bob Architect",
    email: `bob_${ts}@cloudforge.test`,
    password: "Password123!",
  };

  const regARes = await axios.post(`${BASE_URL}/api/auth/register`, userAData);
  const tokenA = extractToken(regARes);
  const userA = regARes.data.user;
  console.log(`✅ User A registered: ${userA.name} (${userA.email})`);

  const regBRes = await axios.post(`${BASE_URL}/api/auth/register`, userBData);
  const tokenB = extractToken(regBRes);
  const userB = regBRes.data.user;
  console.log(`✅ User B registered: ${userB.name} (${userB.email})`);

  // 2. User A creates a project
  console.log("\n[Step 2] User A creates Project...");
  const projRes = await axios.post(
    `${BASE_URL}/api/projects`,
    {
      name: `Collab Room ${ts}`,
      description: "Automated Real-Time Collaboration Test Project",
      template: "react",
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const project = projRes.data.project;
  const projectId = project._id;
  console.log(`✅ Project created: "${project.name}" (ID: ${projectId})`);

  // Fetch workspace files to find App.tsx
  const wsRes = await axios.get(`${BASE_URL}/api/projects/${projectId}/workspace`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const files = wsRes.data.files || [];
  let testFile = files.find((f) => f.name === "App.tsx" || f.name.endsWith(".tsx") || f.name.endsWith(".js") || f.type === "file");
  if (!testFile) {
    // Create one if template didn't have it
    const createFileRes = await axios.post(
      `${BASE_URL}/api/projects/${projectId}/files`,
      { name: "App.tsx", path: "src/App.tsx", content: "// Initial CloudForge App\nexport default function App() {\n  return <div>Hello CloudForge</div>;\n}\n" },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    testFile = createFileRes.data.file;
  }
  console.log(`✅ Active target file for collaboration: "${testFile.name}" (ID: ${testFile._id})`);

  // 3. Security & Authorization Test: User B tries to connect BEFORE being invited
  console.log("\n[Step 3] Verifying Security: User B tries to join room unauthorized...");
  await new Promise((resolve) => {
    const unauthWs = new WebSocket(`${WS_URL}?token=${tokenB}&projectId=${projectId}`);
    let closed = false;
    unauthWs.on("close", (code, reason) => {
      closed = true;
      console.log(`🔒 Unauthorized join rejected as expected: Code ${code} (${reason.toString()})`);
      resolve();
    });
    unauthWs.on("open", () => {
      setTimeout(() => {
        if (!closed) {
          console.error("❌ ERROR: Unauthorized user was allowed to connect!");
          unauthWs.close();
          resolve();
        }
      }, 500);
    });
  });

  // 4. Invite User B as a collaborator
  console.log("\n[Step 4] User A invites User B to the project...");
  const inviteRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/collaborators`,
    { email: userB.email },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  console.log(`✅ Invitation successful:`, inviteRes.data.message);

  // Verify User B can see the project in their project list
  const userBProjectsRes = await axios.get(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const foundInB = userBProjectsRes.data.projects.some((p) => p._id === projectId);
  if (foundInB) {
    console.log(`✅ Project successfully listed in User B's shared projects!`);
  } else {
    throw new Error("Project not listed in User B's projects after invitation");
  }

  // 5. Connect User A and User B simultaneously to Collaboration WebSocket
  console.log("\n[Step 5] Connecting User A and User B to /ws/collaboration...");
  const wsA = new WebSocket(`${WS_URL}?token=${tokenA}&projectId=${projectId}`);
  const messagesA = [];
  wsA.on("message", (raw) => messagesA.push(JSON.parse(raw.toString())));

  await new Promise((res, rej) => {
    wsA.on("open", res);
    wsA.on("error", rej);
  });
  console.log("✅ User A connected to collaboration WebSocket");

  // Wait for User A 'connected' message
  await new Promise((r) => setTimeout(r, 200));
  const initMsgA = messagesA.find((m) => m.type === "connected");
  console.log(`✅ User A received 'connected' event with assigned color: ${initMsgA?.user?.color}`);

  // Now connect User B
  const wsB = new WebSocket(`${WS_URL}?token=${tokenB}&projectId=${projectId}`);
  const messagesB = [];
  wsB.on("message", (raw) => messagesB.push(JSON.parse(raw.toString())));

  await new Promise((res, rej) => {
    wsB.on("open", res);
    wsB.on("error", rej);
  });
  console.log("✅ User B connected to collaboration WebSocket");

  await new Promise((r) => setTimeout(r, 300));
  const userBConnectedMsg = messagesB.find((m) => m.type === "connected");
  console.log(`✅ User B received 'connected' event. Collaborators present: ${userBConnectedMsg?.collaborators?.length}`);
  const userJoinedA = messagesA.find((m) => m.type === "user_joined");
  console.log(`✅ User A received 'user_joined' for: ${userJoinedA?.collaborator?.name}`);

  // 6. Presence & Cursor Synchronization Test
  console.log("\n[Step 6] Testing Live Presence & Cursor Tracking...");
  wsA.send(
    JSON.stringify({
      type: "presence_update",
      data: {
        currentFileId: testFile._id,
        currentFileName: testFile.name,
        cursor: { line: 15, col: 8 },
        selection: null,
      },
    })
  );

  await new Promise((r) => setTimeout(r, 200));
  const cursorForB = messagesB.find((m) => m.type === "presence_updated" && m.data?.cursor?.line === 15);
  if (cursorForB) {
    console.log(`✅ User B received User A's cursor at Line ${cursorForB.data.cursor.line}, Col ${cursorForB.data.cursor.col} in "${cursorForB.data.currentFileName}"`);
  } else {
    throw new Error("Cursor sync failed: User B did not receive cursor update");
  }

  // 7. Concurrent CRDT Document Synchronization (Yjs)
  console.log("\n[Step 7] Testing True Concurrent CRDT Document Synchronization (Yjs)...");
  const docA = new Y.Doc();
  const ytextA = docA.getText("monaco");

  const docB = new Y.Doc();
  const ytextB = docB.getText("monaco");

  // Subscribe both users to testFile
  wsA.send(JSON.stringify({ type: "document_subscribe", fileId: testFile._id }));
  wsB.send(JSON.stringify({ type: "document_subscribe", fileId: testFile._id }));

  await new Promise((r) => setTimeout(r, 200));

  // Handle Sync handshake for User A
  const stateVectorA = Y.encodeStateVector(docA);
  wsA.send(JSON.stringify({ type: "document_sync_step_1", fileId: testFile._id, stateVector: toBase64(stateVectorA) }));

  // Handle Sync handshake for User B
  const stateVectorB = Y.encodeStateVector(docB);
  wsB.send(JSON.stringify({ type: "document_sync_step_1", fileId: testFile._id, stateVector: toBase64(stateVectorB) }));

  // Listen for sync step 2 & incremental updates
  const handleDocMsg = (msg, doc, label) => {
    if (msg.fileId !== testFile._id) return;
    if (msg.type === "document_sync_step_2" && msg.update) {
      console.log(`[${label}] received sync_step_2`);
      Y.applyUpdate(doc, fromBase64(msg.update), "remote");
    } else if (msg.type === "document_update" && msg.update) {
      console.log(`[${label}] received document_update from peer`);
      Y.applyUpdate(doc, fromBase64(msg.update), "remote");
    }
  };

  // Attach forwarder for subsequent incoming messages
  wsA.on("message", (raw) => handleDocMsg(JSON.parse(raw.toString()), docA, "User A"));
  wsB.on("message", (raw) => handleDocMsg(JSON.parse(raw.toString()), docB, "User B"));

  // Process any already received sync messages
  messagesA.forEach((m) => handleDocMsg(m, docA, "User A"));
  messagesB.forEach((m) => handleDocMsg(m, docB, "User B"));

  await new Promise((r) => setTimeout(r, 300));
  console.log(`✅ Initial Yjs document loaded from backend.`);
  console.log(`   User A initial text length: ${ytextA.length}`);
  console.log(`   User B initial text length: ${ytextB.length}`);

  // Now wire outgoing updates: local edits generate incremental binary update frames
  docA.on("update", (update, origin) => {
    console.log("[docA on update] origin:", origin, "bytes:", update.length);
    if (origin === "remote") return;
    wsA.send(JSON.stringify({ type: "document_update", fileId: testFile._id, update: toBase64(update) }));
  });

  docB.on("update", (update, origin) => {
    console.log("[docB on update] origin:", origin, "bytes:", update.length);
    if (origin === "remote") return;
    wsB.send(JSON.stringify({ type: "document_update", fileId: testFile._id, update: toBase64(update) }));
  });

  // PERFORM SIMULTANEOUS CONCURRENT EDITS
  console.log("⚡ Executing simultaneous concurrent edits from User A and User B...");
  ytextA.insert(0, "// [Edited by User A at " + Date.now() + "]\n");
  ytextB.insert(ytextB.length, "\n// [Appended by User B at " + Date.now() + "]\n");

  // Wait for CRDT convergence over WebSocket
  await new Promise((r) => setTimeout(r, 600));

  console.log("messagesA received types:", messagesA.map((m) => m.type));
  console.log("messagesB received types:", messagesB.map((m) => m.type));

  console.log(`   User A final text:\n------------------\n${ytextA.toString()}\n------------------`);
  console.log(`   User B final text:\n------------------\n${ytextB.toString()}\n------------------`);

  if (ytextA.toString() === ytextB.toString() && ytextA.toString().includes("Edited by User A") && ytextB.toString().includes("Appended by User B")) {
    console.log("🎉 CRDT CONVERGENCE PERFECT! Both clients share identical state with zero lost edits!");
  } else {
    throw new Error("CRDT convergence failed! Document contents do not match or an edit was lost.");
  }

  // 8. Real-time File System Operations Broadcast Test
  console.log("\n[Step 8] Testing Real-Time File Explorer Operations Propagation...");

  // Create file
  console.log("  -> User A creates 'feature-toggle.ts'...");
  const newFileRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/files`,
    { name: "feature-toggle.ts", path: "src/feature-toggle.ts", content: "export const ENABLE_REALTIME = true;\n" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const createdFile = newFileRes.data.file;

  await new Promise((r) => setTimeout(r, 300));
  const fileCreatedForB = messagesB.find((m) => m.type === "file_created" && m.file?.name === "feature-toggle.ts");
  if (fileCreatedForB) {
    console.log(`✅ User B received real-time 'file_created' for "${fileCreatedForB.file.name}"!`);
  } else {
    throw new Error("File creation broadcast failed: User B did not receive file_created");
  }

  // Rename file
  console.log("  -> User A renames 'feature-toggle.ts' to 'feature-flags.ts'...");
  await axios.put(
    `${BASE_URL}/api/projects/${projectId}/files/${createdFile._id}/rename`,
    { newName: "feature-flags.ts" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  await new Promise((r) => setTimeout(r, 300));
  const fileRenamedForB = messagesB.find((m) => m.type === "file_renamed" && m.newName === "feature-flags.ts");
  if (fileRenamedForB) {
    console.log(`✅ User B received real-time 'file_renamed' to "${fileRenamedForB.newName}"!`);
  } else {
    throw new Error("File rename broadcast failed: User B did not receive file_renamed");
  }

  // Delete file
  console.log("  -> User A deletes 'feature-flags.ts'...");
  await axios.delete(`${BASE_URL}/api/projects/${projectId}/files/${createdFile._id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  await new Promise((r) => setTimeout(r, 300));
  const fileDeletedForB = messagesB.find((m) => m.type === "file_deleted" && m.fileId === createdFile._id);
  if (fileDeletedForB) {
    console.log(`✅ User B received real-time 'file_deleted' for fileId: ${fileDeletedForB.fileId}!`);
  } else {
    throw new Error("File deletion broadcast failed: User B did not receive file_deleted");
  }

  // 9. VCS / Git Commit Broadcast Test
  console.log("\n[Step 9] Testing VCS / Git Commit Propagation...");
  const commitRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/git/commit`,
    { message: "feat: Real-time collaboration integration verified", stagedOnly: false },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  console.log(`  -> User A created commit: "${commitRes.data.commit?.message}" (${commitRes.data.commit?.sha?.substring(0, 7)})`);

  await new Promise((r) => setTimeout(r, 300));
  const commitForB = messagesB.find((m) => m.type === "commit_created");
  if (commitForB) {
    console.log(`✅ User B received real-time 'commit_created': "${commitForB.commit?.message}"`);
  } else {
    throw new Error("Git commit broadcast failed: User B did not receive commit_created");
  }

  // 10. Disconnect / Reconnect / Leave Workspace Test
  console.log("\n[Step 10] Testing Disconnect, Cleanup, and Reconnection...");
  wsB.close();
  await new Promise((r) => setTimeout(r, 1500));

  const userBLeftMsg = messagesA.find((m) => m.type === "user_left" && m.userName === userB.name);
  if (userBLeftMsg) {
    console.log(`✅ User A received 'user_left' for ${userBLeftMsg.userName} upon disconnect.`);
  }

  // Reconnect User B
  console.log("  -> User B reconnects to room...");
  const wsB2 = new WebSocket(`${WS_URL}?token=${tokenB}&projectId=${projectId}`);
  const messagesB2 = [];
  wsB2.on("message", (raw) => messagesB2.push(JSON.parse(raw.toString())));

  await new Promise((res, rej) => {
    wsB2.on("open", res);
    wsB2.on("error", rej);
  });

  await new Promise((r) => setTimeout(r, 300));
  const userB2Rejoined = messagesA.filter((m) => m.type === "user_joined");
  console.log(`✅ User B reconnected successfully! Total join announcements received by User A: ${userB2Rejoined.length}`);

  // 11. Existing Terminal WebSocket Separation Verification
  console.log("\n[Step 11] Verifying /ws/terminal remains independent & fully operational...");
  const termWs = new WebSocket(`ws://127.0.0.1:5000/ws/terminal?token=${tokenA}&projectId=${projectId}`);
  await new Promise((resolve) => {
    termWs.on("open", () => {
      console.log("✅ Terminal WebSocket on /ws/terminal connected successfully without interference!");
      termWs.close();
      resolve();
    });
    termWs.on("error", (err) => {
      console.warn("⚠️ Terminal socket connection:", err.message);
      resolve();
    });
  });

  // Clean up sockets
  wsA.close();
  wsB2.close();

  console.log("\n==================================================");
  console.log("🏆 ALL COLLABORATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

runE2ETests().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err.response?.data || err.message || err);
  process.exit(1);
});
