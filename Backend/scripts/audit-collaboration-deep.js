import WebSocket from "ws";
import axios from "axios";
import * as Y from "yjs";
import jwt from "jsonwebtoken";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Test tracker
const results = [];
function record(testName, passed, details = "") {
  results.push({ testName, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${testName}] ${details}`);
}

async function runDeepAudit() {
  console.log("================================================================");
  console.log("🔬 CLOUDFORGE REAL-TIME COLLABORATION SYSTEM: DEEP AUDIT SUITE");
  console.log("================================================================");

  const ts = Date.now();

  // -------------------------------------------------------------
  // TEST 1: Backend Startup & /health Check
  // -------------------------------------------------------------
  try {
    const healthRes = await axios.get(`${BASE_URL}/health`);
    if (healthRes.status === 200 && healthRes.data.status === "healthy") {
      record("1. Backend /health Check", true, `Status: ${healthRes.data.status}, Env: ${healthRes.data.environment}`);
    } else {
      record("1. Backend /health Check", false, `Unexpected status: ${healthRes.status}`);
    }
  } catch (err) {
    record("1. Backend /health Check", false, err.message);
  }

  // -------------------------------------------------------------
  // Setup Users & Projects
  // -------------------------------------------------------------
  console.log("\n--- Provisioning Test Users & Projects ---");
  const userAData = { name: "Alice Core", email: `alice_audit_${ts}@cloudforge.test`, password: "Password123!" };
  const userBData = { name: "Bob Core", email: `bob_audit_${ts}@cloudforge.test`, password: "Password123!" };
  const userCData = { name: "Charlie Core", email: `charlie_audit_${ts}@cloudforge.test`, password: "Password123!" };
  const userUnauthData = { name: "Eve Intruder", email: `eve_audit_${ts}@cloudforge.test`, password: "Password123!" };

  const regA = await axios.post(`${BASE_URL}/api/auth/register`, userAData);
  const tokenA = extractToken(regA);
  const userA = regA.data.user;

  const regB = await axios.post(`${BASE_URL}/api/auth/register`, userBData);
  const tokenB = extractToken(regB);
  const userB = regB.data.user;

  const regC = await axios.post(`${BASE_URL}/api/auth/register`, userCData);
  const tokenC = extractToken(regC);
  const userC = regC.data.user;

  const regEve = await axios.post(`${BASE_URL}/api/auth/register`, userUnauthData);
  const tokenEve = extractToken(regEve);
  const userEve = regEve.data.user;

  // User A creates Project 1
  const proj1Res = await axios.post(
    `${BASE_URL}/api/projects`,
    { name: `Audit Project 1 ${ts}`, description: "Primary Audit Workspace", template: "react" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const project1Id = proj1Res.data.project._id;

  // Eve creates Project 2 (for cross-project isolation tests)
  const proj2Res = await axios.post(
    `${BASE_URL}/api/projects`,
    { name: `Audit Project 2 ${ts}`, description: "Isolated Private Workspace", template: "react" },
    { headers: { Authorization: `Bearer ${tokenEve}` } }
  );
  const project2Id = proj2Res.data.project._id;

  // Invite Bob and Charlie to Project 1
  await axios.post(`${BASE_URL}/api/projects/${project1Id}/collaborators`, { email: userB.email }, { headers: { Authorization: `Bearer ${tokenA}` } });
  await axios.post(`${BASE_URL}/api/projects/${project1Id}/collaborators`, { email: userC.email }, { headers: { Authorization: `Bearer ${tokenA}` } });

  // Get active test file in Project 1
  const wsRes = await axios.get(`${BASE_URL}/api/projects/${project1Id}/workspace`, { headers: { Authorization: `Bearer ${tokenA}` } });
  let targetFile = (wsRes.data.files || []).find((f) => f.type === "file");
  if (!targetFile) {
    const fRes = await axios.post(
      `${BASE_URL}/api/projects/${project1Id}/files`,
      { name: "main.ts", path: "src/main.ts", content: "export const initial = 'CloudForge';\n" },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    targetFile = fRes.data.file;
  }

  // Get or create a file in Project 2
  const ws2Res = await axios.get(`${BASE_URL}/api/projects/${project2Id}/workspace`, { headers: { Authorization: `Bearer ${tokenEve}` } });
  let fileInProject2 = (ws2Res.data.files || []).find((f) => f.type === "file");
  if (!fileInProject2) {
    const f2Res = await axios.post(
      `${BASE_URL}/api/projects/${project2Id}/files`,
      { name: "secret.ts", path: "src/secret.ts", content: "const secret = 'TOP_SECRET';\n" },
      { headers: { Authorization: `Bearer ${tokenEve}` } }
    );
    fileInProject2 = f2Res.data.file;
  }

  console.log(`Initialized Project 1 (${project1Id}) with active file: ${targetFile.name} (${targetFile._id})`);
  console.log(`Initialized Project 2 (${project2Id}) for isolation testing`);

  // -------------------------------------------------------------
  // TEST 2: Security & Authentication Rejections
  // -------------------------------------------------------------
  console.log("\n--- Executing Security & Adversarial Authentication Tests ---");

  // 2.1: Missing JWT
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?projectId=${project1Id}`);
    ws.on("close", (code) => {
      record("2.1 Missing JWT Token Rejection", code === 1008, `Close code: ${code}`);
      resolve();
    });
    ws.on("open", () => setTimeout(() => { ws.close(); resolve(); }, 400));
  });

  // 2.2: Invalid / Malformed JWT
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=completely-invalid-jwt-signature`);
    ws.on("close", (code) => {
      record("2.2 Invalid JWT Rejection", code === 1008, `Close code: ${code}`);
      resolve();
    });
    ws.on("open", () => setTimeout(() => { ws.close(); resolve(); }, 400));
  });

  // 2.3: Expired JWT
  await new Promise((resolve) => {
    const expiredToken = jwt.sign({ userId: userA._id }, process.env.JWT_SECRET || "cloudforge_dev_secret_key_change_in_prod", { expiresIn: "-10s" });
    const ws = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${expiredToken}`);
    ws.on("close", (code) => {
      record("2.3 Expired JWT Rejection", code === 1008, `Close code: ${code}`);
      resolve();
    });
    ws.on("open", () => setTimeout(() => { ws.close(); resolve(); }, 400));
  });

  // 2.4: Unauthorized User Project Access (Eve has valid JWT, but no access to Project 1)
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${tokenEve}`);
    ws.on("close", (code) => {
      record("2.4 Unauthorized Project Access Rejection", code === 1008, `Eve rejected with code: ${code}`);
      resolve();
    });
    ws.on("open", () => setTimeout(() => { ws.close(); resolve(); }, 400));
  });

  // 2.5: Malformed Project ID Rejection
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?projectId=not-a-valid-object-id&token=${tokenA}`);
    ws.on("close", (code) => {
      record("2.5 Malformed ProjectId Rejection", code === 1008, `Close code: ${code}`);
      resolve();
    });
    ws.on("open", () => setTimeout(() => { ws.close(); resolve(); }, 400));
  });

  // -------------------------------------------------------------
  // TEST 3: 3-User Presence, Cursors & Color Palette
  // -------------------------------------------------------------
  console.log("\n--- Testing 3-User Presence, Multi-Cursor Tracking & Colors ---");
  const wsA = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${tokenA}`);
  const wsB = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${tokenB}`);
  const wsC = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${tokenC}`);

  const msgsA = [], msgsB = [], msgsC = [];
  wsA.on("message", (raw) => msgsA.push(JSON.parse(raw.toString())));
  wsB.on("message", (raw) => msgsB.push(JSON.parse(raw.toString())));
  wsC.on("message", (raw) => msgsC.push(JSON.parse(raw.toString())));

  await Promise.all([
    new Promise((r) => wsA.on("open", r)),
    new Promise((r) => wsB.on("open", r)),
    new Promise((r) => wsC.on("open", r)),
  ]);

  await sleep(400);

  const initA = msgsA.find((m) => m.type === "connected");
  const initB = msgsB.find((m) => m.type === "connected");
  const initC = msgsC.find((m) => m.type === "connected");

  const colors = [initA?.user?.color, initB?.user?.color, initC?.user?.color];
  const allColorsAssigned = colors.every((c) => typeof c === "string" && c.startsWith("#"));
  record("3.1 3-User Presence Initialization & Colors", allColorsAssigned, `Assigned colors: ${colors.join(", ")}`);

  // User B updates cursor
  wsB.send(
    JSON.stringify({
      type: "presence_update",
      data: {
        currentFileId: targetFile._id,
        currentFileName: targetFile.name,
        cursor: { line: 42, col: 10 },
        selection: { startLine: 42, startCol: 1, endLine: 42, endCol: 10 },
      },
    })
  );

  await sleep(250);

  const bCursorSeenByA = msgsA.find((m) => m.type === "presence_updated" && m.data?.cursor?.line === 42);
  const bCursorSeenByC = msgsC.find((m) => m.type === "presence_updated" && m.data?.cursor?.line === 42);

  const presenceSynced = !!bCursorSeenByA && !!bCursorSeenByC;
  record("3.2 3-User Cursor & Selection Synchronization", presenceSynced, `User A and C received B's cursor at line 42`);

  // -------------------------------------------------------------
  // TEST 4: Cross-Project File Isolation (Security)
  // -------------------------------------------------------------
  console.log("\n--- Testing Cross-Project Document Isolation ---");
  if (fileInProject2) {
    wsA.send(JSON.stringify({ type: "document_subscribe", fileId: fileInProject2._id }));
    await sleep(250);
    const errorMsg = msgsA.find((m) => m.type === "error" && m.fileId === fileInProject2._id);
    record(
      "4.1 Cross-Project File Access Prevention",
      !!errorMsg,
      errorMsg ? `Server rejected with: "${errorMsg.message}"` : "Failed: server did not reject cross-project fileId"
    );
  } else {
    record("4.1 Cross-Project File Access Prevention", true, "Skipped (no secondary file)");
  }

  // -------------------------------------------------------------
  // TEST 5: Simultaneous First Document Opening & Handshake
  // -------------------------------------------------------------
  console.log("\n--- Testing Simultaneous First Document Opening by 3 Users ---");
  const docA = new Y.Doc();
  const ytextA = docA.getText("monaco");
  const docB = new Y.Doc();
  const ytextB = docB.getText("monaco");
  const docC = new Y.Doc();
  const ytextC = docC.getText("monaco");

  // Hook sync listeners
  const hookDoc = (ws, doc, label) => {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.fileId !== targetFile._id) return;
      if (msg.type === "document_sync_ready") {
        const sv = Y.encodeStateVector(doc);
        ws.send(JSON.stringify({ type: "document_sync_step_1", fileId: targetFile._id, stateVector: toBase64(sv) }));
      } else if (msg.type === "document_sync_step_2" && msg.update) {
        Y.applyUpdate(doc, fromBase64(msg.update), "remote");
      } else if (msg.type === "document_update" && msg.update) {
        Y.applyUpdate(doc, fromBase64(msg.update), "remote");
      }
    });
  };

  hookDoc(wsA, docA, "User A");
  hookDoc(wsB, docB, "User B");
  hookDoc(wsC, docC, "User C");

  // Send simultaneous subscriptions
  wsA.send(JSON.stringify({ type: "document_subscribe", fileId: targetFile._id }));
  wsB.send(JSON.stringify({ type: "document_subscribe", fileId: targetFile._id }));
  wsC.send(JSON.stringify({ type: "document_subscribe", fileId: targetFile._id }));

  await sleep(400);

  const initialLengthsEqual = ytextA.length > 0 && ytextA.length === ytextB.length && ytextB.length === ytextC.length;
  record(
    "5.1 Simultaneous First Open Race Handling",
    initialLengthsEqual,
    `Initial lengths: A=${ytextA.length}, B=${ytextB.length}, C=${ytextC.length}`
  );

  // -------------------------------------------------------------
  // TEST 6: 3-User Genuine Concurrent CRDT Editing & Convergence
  // -------------------------------------------------------------
  console.log("\n--- Testing Genuine 3-User Concurrent CRDT Editing & Convergence ---");
  docA.on("update", (update, origin) => {
    if (origin !== "remote") wsA.send(JSON.stringify({ type: "document_update", fileId: targetFile._id, update: toBase64(update) }));
  });
  docB.on("update", (update, origin) => {
    if (origin !== "remote") wsB.send(JSON.stringify({ type: "document_update", fileId: targetFile._id, update: toBase64(update) }));
  });
  docC.on("update", (update, origin) => {
    if (origin !== "remote") wsC.send(JSON.stringify({ type: "document_update", fileId: targetFile._id, update: toBase64(update) }));
  });

  // Execute concurrent edits
  const editMarkerA = `// [Header injected by Alice at ${ts}]\n`;
  const editMarkerB = `\n// [Middle block by Bob at ${ts}]\n`;
  const editMarkerC = `\n// [Footer appended by Charlie at ${ts}]\n`;

  ytextA.insert(0, editMarkerA);
  const midPoint = Math.floor(ytextB.length / 2);
  ytextB.insert(midPoint, editMarkerB);
  ytextC.insert(ytextC.length, editMarkerC);

  await sleep(700);

  const textA = ytextA.toString();
  const textB = ytextB.toString();
  const textC = ytextC.toString();

  const perfectlyConverged = textA === textB && textB === textC;
  const allEditsRetained = textA.includes(editMarkerA) && textA.includes(editMarkerB) && textA.includes(editMarkerC);

  record(
    "6.1 3-User Concurrent CRDT Convergence",
    perfectlyConverged && allEditsRetained,
    `Converged: ${perfectlyConverged}, All 3 edits preserved: ${allEditsRetained} (Length: ${textA.length})`
  );

  // -------------------------------------------------------------
  // TEST 7: Disconnect During Edit & Reconnect After Edit
  // -------------------------------------------------------------
  console.log("\n--- Testing Disconnect During Edit & Reconnection Recovery ---");
  // Charlie drops connection abruptly
  wsC.close();
  await sleep(300);

  // Alice performs additional edit while Charlie is offline
  const offlineMarker = `// [Alice edit during Charlie offline: ${Date.now()}]\n`;
  ytextA.insert(0, offlineMarker);

  await sleep(300);
  const textBeforeReconnect = ytextA.toString();

  // Charlie reconnects with a fresh socket
  const wsC2 = new WebSocket(`${WS_URL}?projectId=${project1Id}&token=${tokenC}`);
  const docC2 = new Y.Doc();
  const ytextC2 = docC2.getText("monaco");

  hookDoc(wsC2, docC2, "User C2");
  await new Promise((r) => {
    wsC2.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "connected") r();
      } catch (e) {}
    });
  });
  wsC2.send(JSON.stringify({ type: "document_subscribe", fileId: targetFile._id }));

  await sleep(600);

  const reconnectedStateMatched = ytextC2.toString() === textBeforeReconnect;
  console.log(`[DEBUG Charlie2] ytextC2 length: ${ytextC2.length}, textBeforeReconnect length: ${textBeforeReconnect.length}`);
  if (!reconnectedStateMatched) {
    console.log(`[DEBUG Charlie2] ytextC2:\n---${ytextC2.toString()}---\ntextBeforeReconnect:\n---${textBeforeReconnect}---`);
  }
  record(
    "7.1 Reconnect Synchronization After Offline Edits",
    reconnectedStateMatched,
    `Charlie2 reconstructed state matches Alice: ${reconnectedStateMatched}`
  );

  // -------------------------------------------------------------
  // TEST 8: Document Persistence & MongoDB Reload
  // -------------------------------------------------------------
  console.log("\n--- Testing Document Persistence to MongoDB & Disk Workspace ---");
  // Explicitly trigger document save via WebSocket
  wsA.send(JSON.stringify({ type: "save_document", fileId: targetFile._id }));
  await sleep(500);

  // Read back via REST API
  const reloadedWs = await axios.get(`${BASE_URL}/api/projects/${project1Id}/workspace`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const reloadedFile = (reloadedWs.data.files || []).find((f) => f._id === targetFile._id);

  const persistenceMatches = reloadedFile?.content === textBeforeReconnect;
  record(
    "8.1 Persistence & Database Reload Verification",
    persistenceMatches,
    `MongoDB stored content length: ${reloadedFile?.content?.length}, converged text length: ${textBeforeReconnect.length}`
  );

  // -------------------------------------------------------------
  // TEST 9: Real-time File System Operations Broadcast
  // -------------------------------------------------------------
  console.log("\n--- Testing Real-Time File System Broadcasts ---");
  // User A creates new file
  const testNewFileName = `audit_sync_${ts}.ts`;
  const createRes = await axios.post(
    `${BASE_URL}/api/projects/${project1Id}/files`,
    { name: testNewFileName, path: `src/${testNewFileName}`, content: "export const ok = true;\n" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const createdFile = createRes.data.file;

  await sleep(300);
  const createdSeenByB = msgsB.find((m) => m.type === "file_created" && m.file?.name === testNewFileName);
  record("9.1 Real-Time file_created Broadcast", !!createdSeenByB, `Bob received file_created for ${testNewFileName}`);

  // User A renames file
  const renamedName = `audit_renamed_${ts}.ts`;
  await axios.put(
    `${BASE_URL}/api/projects/${project1Id}/files/${createdFile._id}/rename`,
    { newName: renamedName },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  await sleep(300);
  const renameSeenByB = msgsB.find((m) => m.type === "file_renamed" && m.newName === renamedName);
  record("9.2 Real-Time file_renamed Broadcast", !!renameSeenByB, `Bob received file_renamed to ${renamedName}`);

  // User A deletes file
  await axios.delete(`${BASE_URL}/api/projects/${project1Id}/files/${createdFile._id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  await sleep(300);
  const deleteSeenByB = msgsB.find((m) => m.type === "file_deleted" && m.fileId === createdFile._id);
  record("9.3 Real-Time file_deleted Broadcast & Eviction", !!deleteSeenByB, `Bob received file_deleted for ${createdFile._id}`);

  // -------------------------------------------------------------
  // TEST 10: Git / VCS Broadcasts & Underlying Git Execution
  // -------------------------------------------------------------
  console.log("\n--- Testing VCS Commit & Branch Operation Synchronization ---");
  const commitRes = await axios.post(
    `${BASE_URL}/api/projects/${project1Id}/git/commit`,
    { message: `audit: Commit at ${ts}`, stagedOnly: false },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  await sleep(300);
  const commitSeenByB = msgsB.find((m) => m.type === "commit_created");
  const commitValid = !!commitSeenByB && commitRes.data.commit?.sha?.length === 7;
  record(
    "10.1 VCS Commit Broadcast & Integrity",
    commitValid,
    `Commit SHA: ${commitRes.data.commit?.sha}, Bob received event: ${!!commitSeenByB}`
  );

  // Switch Branch
  const branchRes = await axios.post(
    `${BASE_URL}/api/projects/${project1Id}/git/branches`,
    { branchName: `audit-branch-${ts}`, createNew: true },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );

  await sleep(300);
  const branchSeenByB = msgsB.find((m) => m.type === "branch_changed");
  record(
    "10.2 VCS Branch Switch Broadcast",
    !!branchSeenByB && branchRes.status === 200,
    `Branch switched and broadcast received by collaborators`
  );

  // -------------------------------------------------------------
  // TEST 11: Terminal WebSocket Isolation Under High Traffic
  // -------------------------------------------------------------
  console.log("\n--- Testing Terminal WebSocket (/ws/terminal) Independence Under Traffic ---");
  let terminalReceivedData = false;
  const termWs = new WebSocket(`ws://127.0.0.1:5000/ws/terminal?token=${tokenA}&projectId=${project1Id}`);

  await new Promise((resolve) => {
    termWs.on("open", () => {
      // Send active collaboration updates while terminal is open
      for (let i = 0; i < 20; i++) {
        wsA.send(JSON.stringify({ type: "presence_update", data: { cursor: { line: i, col: 1 } } }));
      }

      // Send terminal command
      termWs.send(JSON.stringify({ type: "input", data: "echo CLOUDFORGE_TERMINAL_TEST_OK\r" }));

      termWs.on("message", (data) => {
        const str = data.toString();
        if (str.includes("CLOUDFORGE_TERMINAL_TEST_OK") || str.length > 0) {
          terminalReceivedData = true;
        }
      });

      setTimeout(() => {
        termWs.close();
        resolve();
      }, 500);
    });

    termWs.on("error", (err) => {
      console.warn("Terminal socket error:", err.message);
      resolve();
    });
  });

  // Verify collaboration socket is still connected and alive
  const collabAlive = wsA.readyState === WebSocket.OPEN && wsB.readyState === WebSocket.OPEN;
  record(
    "11.1 Terminal & Collaboration WebSocket Independence",
    collabAlive,
    `Collaboration sockets remain OPEN after concurrent terminal activity`
  );

  // Clean up remaining sockets
  wsA.close();
  wsB.close();
  wsC2.close();

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n================================================================");
  console.log("📊 DEEP AUDIT RESULTS SUMMARY");
  console.log("================================================================");
  let totalPass = 0, totalFail = 0;
  for (const r of results) {
    if (r.passed) totalPass++;
    else totalFail++;
  }
  console.log(`Total Checks Executed: ${results.length}`);
  console.log(`Passed: ${totalPass}`);
  console.log(`Failed: ${totalFail}`);
  console.log("================================================================");

  if (totalFail > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDeepAudit().catch((err) => {
  console.error("❌ CRITICAL UNHANDLED ERROR IN DEEP AUDIT:", err);
  process.exit(1);
});
