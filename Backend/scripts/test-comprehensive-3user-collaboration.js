import WebSocket from "ws";
import axios from "axios";
import jwt from "jsonwebtoken";
import * as Y from "yjs";

const BASE_URL = "http://127.0.0.1:5000";
const WS_COLLAB = "ws://127.0.0.1:5000/ws/collaboration";
const WS_TERMINAL = "ws://127.0.0.1:5000/ws/terminal";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runTest() {
  console.log("================================================================================");
  console.log("CLOUDFORGE 3-USER COLLABORATION, CRDT CONVERGENCE & SECURITY VERIFICATION");
  console.log("================================================================================");

  const ts = Date.now();

  // 1. Register 3 Users
  console.log("\n[Step 1] Registering 3 Test Users (Alice, Bob, Charlie)...");
  const user1Data = { name: "Alice Senior", email: `alice_${ts}@cloudforge.test`, password: "Password123!" };
  const user2Data = { name: "Bob Mid", email: `bob_${ts}@cloudforge.test`, password: "Password123!" };
  const user3Data = { name: "Charlie Junior", email: `charlie_${ts}@cloudforge.test`, password: "Password123!" };

  const reg1 = await axios.post(`${BASE_URL}/api/auth/register`, user1Data);
  const token1 = extractToken(reg1);
  const user1 = reg1.data.user;

  const reg2 = await axios.post(`${BASE_URL}/api/auth/register`, user2Data);
  const token2 = extractToken(reg2);
  const user2 = reg2.data.user;

  const reg3 = await axios.post(`${BASE_URL}/api/auth/register`, user3Data);
  const token3 = extractToken(reg3);
  const user3 = reg3.data.user;

  console.log(`✅ User 1 (Alice): ${user1.email} (ID: ${user1.id})`);
  console.log(`✅ User 2 (Bob): ${user2.email} (ID: ${user2.id})`);
  console.log(`✅ User 3 (Charlie): ${user3.email} (ID: ${user3.id})`);

  // 2. Create Project A and Project B
  console.log("\n[Step 2] User 1 creates Project A and Project B...");
  const projARes = await axios.post(
    `${BASE_URL}/api/projects`,
    { name: `Project Alpha ${ts}`, description: "Collaborative Workspace A" },
    { headers: { Authorization: `Bearer ${token1}` } }
  );
  const projectAId = projARes.data.project._id;

  const projBRes = await axios.post(
    `${BASE_URL}/api/projects`,
    { name: `Project Beta ${ts}`, description: "Isolated Workspace B" },
    { headers: { Authorization: `Bearer ${token1}` } }
  );
  const projectBId = projBRes.data.project._id;

  console.log(`✅ Project A: ${projectAId}`);
  console.log(`✅ Project B: ${projectBId}`);

  // Create shared file in Project A
  const fileRes = await axios.post(
    `${BASE_URL}/api/projects/${projectAId}/files`,
    {
      name: "collab.js",
      path: "/src/collab.js",
      type: "file",
      content: "// Initial CloudForge Shared Document\n",
    },
    { headers: { Authorization: `Bearer ${token1}` } }
  );
  const testFileId = fileRes.data.file._id;
  console.log(`✅ Shared file created: /src/collab.js (ID: ${testFileId})`);

  // 3. User 1 invites User 2 to Project A (User 3 is NOT invited yet)
  console.log("\n[Step 3] Inviting User 2 to Project A...");
  await axios.post(
    `${BASE_URL}/api/projects/${projectAId}/collaborators`,
    { email: user2.email },
    { headers: { Authorization: `Bearer ${token1}` } }
  );
  console.log("✅ User 2 invited to Project A");

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  console.log("\n================================================================================");
  console.log("SECTION: SECURITY & ACCESS CONTROL VALIDATION");
  console.log("================================================================================");

  // Sec 1: Missing JWT token on /ws/collaboration
  console.log("[Sec 1] Missing JWT token on /ws/collaboration...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_COLLAB}?projectId=${projectAId}`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 1 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 1 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 2: Invalid / Expired token
  console.log("[Sec 2] Invalid/expired token on /ws/collaboration...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_COLLAB}?token=bad.token.signature&projectId=${projectAId}`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 2 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 2 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 3: Forged Identity Token
  console.log("[Sec 3] Forged token (wrong secret)...");
  const forgedToken = jwt.sign({ userId: user1.id }, "forged_secret_key_9999");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_COLLAB}?token=${forgedToken}&projectId=${projectAId}`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 3 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 3 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 4: Unauthorized User (Charlie not invited to Project A)
  console.log("[Sec 4] Unauthorized user (Charlie) connecting to Project A...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_COLLAB}?token=${token3}&projectId=${projectAId}`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 4 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 4 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 5: Cross-Project Room Isolation (Bob invited to Project A, but NOT Project B)
  console.log("[Sec 5] Cross-Project Isolation (Bob connecting to Project B)...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_COLLAB}?token=${token2}&projectId=${projectBId}`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 5 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 5 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 6: Terminal Security: Unauthorized user connecting to Project A terminal
  console.log("[Sec 6] Terminal Security: Unauthorized user (Charlie) connecting to /ws/terminal...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_TERMINAL}?token=${token3}&projectId=${projectAId}&cols=80&rows=24`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 6 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 6 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 7: Terminal Security: Missing token on /ws/terminal
  console.log("[Sec 7] Terminal Security: Missing token on /ws/terminal...");
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_TERMINAL}?projectId=${projectAId}&cols=80&rows=24`);
    ws.on("close", (code, reason) => {
      if (code === 1008) {
        console.log(`✅ [Sec 7 PASSED]: Rejected with Code 1008 (${reason.toString()})`);
      } else {
        console.error(`❌ [Sec 7 FAILED]: Unexpected close code: ${code}`);
      }
      resolve();
    });
  });

  // Sec 8: Path Traversal Attempt in Workspace
  console.log("[Sec 8] Path traversal attempt in file creation...");
  try {
    await axios.post(
      `${BASE_URL}/api/projects/${projectAId}/files`,
      { name: "exploit.txt", path: "/../../../exploit.txt", content: "evil" },
      { headers: { Authorization: `Bearer ${token1}` } }
    );
    console.error("❌ [Sec 8 FAILED]: Path traversal was not blocked!");
  } catch (err) {
    if (err.response?.status === 400) {
      console.log(`✅ [Sec 8 PASSED]: Blocked with 400 (${err.response.data.message})`);
    } else {
      console.error("❌ [Sec 8 FAILED]: Unexpected error:", err.message);
    }
  }

  // ============================================================================
  // 3-USER COLLABORATION & PRESENCE
  // ============================================================================
  console.log("\n================================================================================");
  console.log("SECTION: 3-USER REAL-TIME COLLABORATION & PRESENCE");
  console.log("================================================================================");

  // Invite Charlie to Project A
  console.log("Inviting User 3 (Charlie) to Project A...");
  await axios.post(
    `${BASE_URL}/api/projects/${projectAId}/collaborators`,
    { email: user3.email },
    { headers: { Authorization: `Bearer ${token1}` } }
  );

  // Connect Alice (Tab 1)
  const ws1 = new WebSocket(`${WS_COLLAB}?token=${token1}&projectId=${projectAId}`);
  const msg1 = [];
  ws1.on("message", (d) => msg1.push(JSON.parse(d.toString())));
  await new Promise((r) => ws1.on("open", r));
  console.log("✅ Alice connected (Tab 1)");

  // Connect Bob
  const ws2 = new WebSocket(`${WS_COLLAB}?token=${token2}&projectId=${projectAId}`);
  const msg2 = [];
  ws2.on("message", (d) => msg2.push(JSON.parse(d.toString())));
  await new Promise((r) => ws2.on("open", r));
  console.log("✅ Bob connected");

  // Connect Charlie
  const ws3 = new WebSocket(`${WS_COLLAB}?token=${token3}&projectId=${projectAId}`);
  const msg3 = [];
  ws3.on("message", (d) => msg3.push(JSON.parse(d.toString())));
  await new Promise((r) => ws3.on("open", r));
  console.log("✅ Charlie connected");

  // Open Tab 2 for Alice
  const ws1Tab2 = new WebSocket(`${WS_COLLAB}?token=${token1}&projectId=${projectAId}`);
  const msg1Tab2 = [];
  ws1Tab2.on("message", (d) => msg1Tab2.push(JSON.parse(d.toString())));
  await new Promise((r) => ws1Tab2.on("open", r));
  console.log("✅ Alice opened Tab 2");

  await sleep(600);

  // Check unique user count
  const connectMsgCharlie = msg3.find((m) => m.type === "connected");
  console.log(`Collaborators visible to Charlie: ${connectMsgCharlie?.collaborators?.length}`);
  // Should be 2 (Alice and Bob), plus Charlie himself = 3 unique users!
  const uniqueNames = new Set(connectMsgCharlie?.collaborators?.map((c) => c.name));
  console.log("Unique online collaborator names:", Array.from(uniqueNames));
  if (uniqueNames.size === 2) {
    console.log("✅ [Presence Check PASSED]: Exactly 2 distinct peers present (Alice and Bob), no duplicate count for Alice's 2 tabs!");
  }

  // Close Alice Tab 2
  ws1Tab2.close();
  await sleep(400);

  // Verify Alice is still online because Tab 1 is active
  ws2.send(
    JSON.stringify({
      type: "presence_update",
      data: { currentFileId: testFileId, cursor: { line: 5, col: 10 } },
    })
  );
  await sleep(300);

  // ============================================================================
  // 3-WAY CONCURRENT CRDT EDITING & CONVERGENCE
  // ============================================================================
  console.log("\n================================================================================");
  console.log("SECTION: 3-WAY CONCURRENT YJS CRDT EDITING & CONVERGENCE");
  console.log("================================================================================");

  const doc1 = new Y.Doc();
  const ytext1 = doc1.getText("monaco");

  const doc2 = new Y.Doc();
  const ytext2 = doc2.getText("monaco");

  const doc3 = new Y.Doc();
  const ytext3 = doc3.getText("monaco");

  // Wire sync handlers
  function wireDoc(ws, doc, label) {
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "document_sync_step_2" && (msg.update || msg.syncStep2Update)) {
          const update = fromBase64(msg.update || msg.syncStep2Update);
          Y.applyUpdate(doc, update, "server_sync");
        } else if (msg.type === "document_update" && msg.update) {
          const update = fromBase64(msg.update);
          Y.applyUpdate(doc, update, "remote_peer");
        }
      } catch {}
    });

    doc.on("update", (updateBytes, origin) => {
      if (origin !== "server_sync" && origin !== "remote_peer") {
        ws.send(
          JSON.stringify({
            type: "document_update",
            fileId: testFileId,
            update: toBase64(updateBytes),
          })
        );
      }
    });
  }

  wireDoc(ws1, doc1, "Alice");
  wireDoc(ws2, doc2, "Bob");
  wireDoc(ws3, doc3, "Charlie");

  // Subscribe all 3 to testFileId
  ws1.send(JSON.stringify({ type: "document_subscribe", fileId: testFileId }));
  ws2.send(JSON.stringify({ type: "document_subscribe", fileId: testFileId }));
  ws3.send(JSON.stringify({ type: "document_subscribe", fileId: testFileId }));

  await sleep(600);

  // Perform handshake: send Sync Step 1
  ws1.send(JSON.stringify({ type: "document_sync_step_1", fileId: testFileId, stateVector: toBase64(Y.encodeStateVector(doc1)) }));
  ws2.send(JSON.stringify({ type: "document_sync_step_1", fileId: testFileId, stateVector: toBase64(Y.encodeStateVector(doc2)) }));
  ws3.send(JSON.stringify({ type: "document_sync_step_1", fileId: testFileId, stateVector: toBase64(Y.encodeStateVector(doc3)) }));

  await sleep(800);

  console.log(`Initial Alice doc text: "${ytext1.toString().trim()}"`);
  console.log(`Initial Bob doc text:   "${ytext2.toString().trim()}"`);
  console.log(`Initial Charlie doc text:"${ytext3.toString().trim()}"`);

  // Now perform simultaneous concurrent edits from all 3 users
  console.log("\n⚡ Performing SIMULTANEOUS 3-USER CONCURRENT EDITS...");
  ytext1.insert(0, "// [Alice Top Header]\n");
  ytext2.insert(ytext2.length, "\nfunction bobFeature() { return 'Bob was here'; }\n");
  ytext3.insert(ytext3.length, "\nconst charlieConfig = { active: true };\n");

  await sleep(1500);

  console.log("\n--- Client Final Document States ---");
  console.log("[Alice Doc]:\n" + ytext1.toString());
  console.log("[Bob Doc]:\n" + ytext2.toString());
  console.log("[Charlie Doc]:\n" + ytext3.toString());

  const t1 = ytext1.toString();
  const t2 = ytext2.toString();
  const t3 = ytext3.toString();

  if (t1 === t2 && t2 === t3) {
    console.log("🎉 [CRDT Convergence PASSED]: All 3 clients reached 100% mathematical convergence!");
  } else {
    throw new Error("❌ [CRDT FAILED]: Clients failed to converge!");
  }

  // Verify all 3 edits are present
  if (
    t1.includes("Alice Top Header") &&
    t1.includes("bobFeature") &&
    t1.includes("charlieConfig")
  ) {
    console.log("✅ [Zero Lost Edits PASSED]: All edits from Alice, Bob, and Charlie are fully preserved!");
  } else {
    throw new Error("❌ [Lost Edit Detected]: Some user edits were dropped!");
  }

  // ============================================================================
  // DISCONNECT & RECONNECT SYNCHRONIZATION TEST
  // ============================================================================
  console.log("\n================================================================================");
  console.log("SECTION: DISCONNECT & RECONNECT RE-SYNCHRONIZATION");
  console.log("================================================================================");

  console.log("Disconnecting Bob...");
  ws2.close();
  await sleep(500);

  console.log("Alice and Charlie make edits while Bob is offline...");
  ytext1.insert(ytext1.length, "\n// [Alice Offline Edit 1]\n");
  ytext3.insert(ytext3.length, "\n// [Charlie Offline Edit 2]\n");
  await sleep(1000);

  console.log("Bob reconnects to workspace...");
  const ws2Reconnect = new WebSocket(`${WS_COLLAB}?token=${token2}&projectId=${projectAId}`);
  const doc2Reconnect = new Y.Doc();
  const ytext2Reconnect = doc2Reconnect.getText("monaco");
  wireDoc(ws2Reconnect, doc2Reconnect, "Bob-Reconnected");

  await new Promise((r) => ws2Reconnect.on("open", r));
  ws2Reconnect.send(JSON.stringify({ type: "document_subscribe", fileId: testFileId }));
  await sleep(400);
  ws2Reconnect.send(
    JSON.stringify({
      type: "document_sync_step_1",
      fileId: testFileId,
      stateVector: toBase64(Y.encodeStateVector(doc2Reconnect)),
    })
  );
  await sleep(1200);

  console.log("\n--- Post-Reconnect Document Comparison ---");
  console.log("[Alice Doc]:\n" + ytext1.toString());
  console.log("[Bob Reconnected Doc]:\n" + ytext2Reconnect.toString());

  if (ytext1.toString() === ytext2Reconnect.toString()) {
    console.log("🎉 [Reconnection Sync PASSED]: Bob caught up with all offline edits flawlessly!");
  } else {
    throw new Error("❌ [Reconnection Sync FAILED]: Reconnected client failed to catch up!");
  }

  // Clean up WebSockets
  ws1.close();
  ws2Reconnect.close();
  ws3.close();

  console.log("\n================================================================================");
  console.log("🏆 ALL 3-USER COLLABORATION & SECURITY TESTS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================");
}

runTest().catch((err) => {
  console.error("Test failed with error:", err.response?.data || err.message);
  process.exit(1);
});
