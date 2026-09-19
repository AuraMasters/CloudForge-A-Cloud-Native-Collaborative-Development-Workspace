/**
 * test-activity-feed.js
 * Comprehensive validation of the CloudForge Live Activity Feed & Collaborator Presence
 * Tests all 12 scenarios specified in user instructions using live REST & WebSocket APIs.
 */

import WebSocket from "ws";
import axios from "axios";
import * as Y from "yjs";

const BASE_URL = "http://127.0.0.1:5000";
const WS_URL = "ws://127.0.0.1:5000/ws/collaboration";

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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("==================================================================");
  console.log("CLOUDFORGE LIVE ACTIVITY FEED & PRESENCE 12-TEST VERIFICATION SUITE");
  console.log("==================================================================");

  const ts = Date.now();

  // 1. Setup two test users via REST
  const userAData = {
    name: "Kushal",
    email: `kushal_${ts}@cloudforge.test`,
    password: "Password123!",
  };
  const userBData = {
    name: "Naveen",
    email: `naveen_${ts}@cloudforge.test`,
    password: "Password123!",
  };

  const regARes = await axios.post(`${BASE_URL}/api/auth/register`, userAData);
  const tokenA = extractToken(regARes);
  const userA = regARes.data.user;
  const userAId = (userA._id || userA.id).toString();

  const regBRes = await axios.post(`${BASE_URL}/api/auth/register`, userBData);
  const tokenB = extractToken(regBRes);
  const userB = regBRes.data.user;
  const userBId = (userB._id || userB.id).toString();

  console.log(`Registered User A: ${userA.name} (ID: ${userAId})`);
  console.log(`Registered User B: ${userB.name} (ID: ${userBId})`);

  // 2. User A creates project
  const projRes = await axios.post(
    `${BASE_URL}/api/projects`,
    {
      name: `Activity Test ${ts}`,
      description: "Testing live activity feed",
      template: "node",
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const projectId = projRes.data.project._id;
  console.log(`Created Project: ${projectId}`);

  // 3. User A invites User B
  await axios.post(
    `${BASE_URL}/api/projects/${projectId}/collaborators`,
    { email: userB.email },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  console.log(`Invited User B (${userB.email}) as collaborator`);

  // 4. Create `first.py`
  const fileRes = await axios.post(
    `${BASE_URL}/api/projects/${projectId}/files`,
    {
      name: "first.py",
      path: "first.py",
      fileType: "python",
      content: 'print("Hello from first.py")\n',
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const firstPy = fileRes.data.file || fileRes.data;
  const firstPyId = (firstPy._id || firstPy.id).toString();
  console.log(`Created first.py (ID: ${firstPyId})`);

  const passedTests = [];
  const failedTests = [];

  function recordPass(testNum, desc) {
    console.log(`\n✅ [TEST ${testNum} PASSED]: ${desc}`);
    passedTests.push(`TEST ${testNum}: ${desc}`);
  }

  function recordFail(testNum, desc, err) {
    console.error(`\n❌ [TEST ${testNum} FAILED]: ${desc}\n`, err);
    failedTests.push(`TEST ${testNum}: ${desc} - ${err.message}`);
  }

  let wsA1, wsB;
  const messagesA = [];
  const messagesB = [];
  const activitiesA = [];
  const activitiesB = [];

  function attachListeners(ws, msgStore, actStore) {
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        msgStore.push(msg);
        if (msg.type === "activity_event" && msg.activity) {
          actStore.push(msg.activity);
        }
      } catch (e) {
        console.error("Message parse error:", e);
      }
    });
  }

  try {
    // =========================================================
    // TEST 1: Two users connect.
    // Expected: 2 online users, exactly one meaningful join event per user
    // =========================================================
    console.log("\n--- Executing TEST 1: Two users connect ---");
    wsA1 = new WebSocket(`${WS_URL}?token=${tokenA}&projectId=${projectId}`);
    attachListeners(wsA1, messagesA, activitiesA);
    await new Promise((resolve, reject) => {
      wsA1.on("open", resolve);
      wsA1.on("error", reject);
    });

    await sleep(200);

    wsB = new WebSocket(`${WS_URL}?token=${tokenB}&projectId=${projectId}`);
    attachListeners(wsB, messagesB, activitiesB);
    await new Promise((resolve, reject) => {
      wsB.on("open", resolve);
      wsB.on("error", reject);
    });

    await sleep(500);

    const connectMsgB = messagesB.find((m) => m.type === "connected");
    // Connect msg collaborators contains other users in room + self = total online
    const totalOnlineB = (connectMsgB?.collaborators?.length || 0) + 1;

    // User A should receive exactly 1 activity event for User B joining
    const joinEventsForB = activitiesA.filter(
      (a) => a.type === "user_joined" && a.userId === userBId
    );

    if (totalOnlineB === 2 && joinEventsForB.length === 1) {
      recordPass(
        1,
        `Two users connected: 2 unique online users present, exactly 1 join event recorded for ${userB.name}`
      );
    } else {
      throw new Error(
        `Expected 2 online users (got ${totalOnlineB}), exactly 1 join event (got ${joinEventsForB.length})`
      );
    }
  } catch (err) {
    recordFail(1, "Two users connect", err);
  }

  try {
    // =========================================================
    // TEST 2: User A refreshes / reconnects.
    // Expected: still 2 online users, NO duplicate join event, NO false leave event
    // =========================================================
    console.log("\n--- Executing TEST 2: User A refreshes/reconnects ---");
    const preActivitiesCountB = activitiesB.length;

    wsA1.close();
    await sleep(200);

    const wsA2 = new WebSocket(`${WS_URL}?token=${tokenA}&projectId=${projectId}`);
    const messagesA2 = [];
    const activitiesA2 = [];
    attachListeners(wsA2, messagesA2, activitiesA2);
    await new Promise((resolve, reject) => {
      wsA2.on("open", resolve);
      wsA2.on("error", reject);
    });

    // Update reference to active socket immediately
    wsA1 = wsA2;

    // Wait past the 1200ms grace period
    await sleep(1500);

    const leaveEventsForA = activitiesB
      .slice(preActivitiesCountB)
      .filter((a) => a.type === "user_left" && a.userId === userAId);
    const duplicateJoinEventsForA = activitiesB
      .slice(preActivitiesCountB)
      .filter((a) => a.type === "user_joined" && a.userId === userAId);

    const connectMsgA2 = messagesA2.find((m) => m.type === "connected");
    const totalOnlineAfterReconnect = (connectMsgA2?.collaborators?.length || 0) + 1;

    if (
      leaveEventsForA.length === 0 &&
      duplicateJoinEventsForA.length === 0 &&
      totalOnlineAfterReconnect === 2
    ) {
      recordPass(
        2,
        "User A reconnect within grace period produced NO false leave, NO duplicate join, exactly 2 online users"
      );
    } else {
      throw new Error(
        `Leave events: ${leaveEventsForA.length}, Duplicate joins: ${duplicateJoinEventsForA.length}, Total online: ${totalOnlineAfterReconnect}`
      );
    }
  } catch (err) {
    recordFail(2, "User A refreshes/reconnects", err);
  }

  try {
    // =========================================================
    // TEST 3: User A opens `first.py`.
    // Expected: "Kushal opened first.py" event
    // =========================================================
    console.log("\n--- Executing TEST 3: User A opens first.py ---");
    const preCountB = activitiesB.length;

    wsA1.send(
      JSON.stringify({
        type: "presence_update",
        data: {
          currentFileId: firstPyId,
          currentFileName: "first.py",
        },
      })
    );

    await sleep(400);

    const openEvent = activitiesB
      .slice(preCountB)
      .find((a) => a.type === "file_opened" && (a.fileName === "first.py" || a.metadata?.fileName === "first.py"));

    if (openEvent && openEvent.message.includes("opened first.py")) {
      recordPass(3, `File open event recorded: "${openEvent.message}"`);
    } else {
      throw new Error(
        `Expected file_opened event for first.py, got: ${JSON.stringify(
          activitiesB.slice(preCountB)
        )}`
      );
    }
  } catch (err) {
    recordFail(3, "User A opens first.py", err);
  }

  try {
    // =========================================================
    // TEST 4: User A edits `first.py` with rapid typing.
    // Expected: User B sees "Kushal edited first.py", throttled (not dozens of entries)
    // =========================================================
    console.log("\n--- Executing TEST 4: User A edits first.py (burst typing) ---");
    const preCountB = activitiesB.length;

    for (let i = 0; i < 10; i++) {
      const doc = new Y.Doc();
      const text = doc.getText("content");
      text.insert(0, `code edit ${i}\n`);
      const update = Y.encodeStateAsUpdate(doc);
      wsA1.send(
        JSON.stringify({
          type: "document_update",
          fileId: firstPyId,
          update: Buffer.from(update).toString("base64"),
        })
      );
      await sleep(40);
    }

    await sleep(500);

    const editEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "file_edited" && (a.fileName === "first.py" || a.metadata?.fileName === "first.py"));

    if (
      editEvents.length === 1 &&
      editEvents[0].message.includes("edited first.py")
    ) {
      recordPass(
        4,
        `Burst edits correctly throttled to exactly 1 activity event: "${editEvents[0].message}"`
      );
    } else {
      throw new Error(`Expected exactly 1 throttled edit event, got ${editEvents.length}`);
    }
  } catch (err) {
    recordFail(4, "User A edits first.py", err);
  }

  let createdFileId = null;
  try {
    // =========================================================
    // TEST 5: User A creates a file.
    // Expected: exactly one creation event.
    // =========================================================
    console.log("\n--- Executing TEST 5: User A creates a file ---");
    const preCountB = activitiesB.length;

    const res = await axios.post(
      `${BASE_URL}/api/projects/${projectId}/files`,
      {
        name: "test.py",
        path: "test.py",
        fileType: "python",
        content: 'print("created file")\n',
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    createdFileId = (res.data.file?._id || res.data._id || res.data.file?.id || res.data.id).toString();
    await sleep(400);

    const createEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "file_created" && (a.fileName === "test.py" || a.metadata?.fileName === "test.py"));

    if (
      createEvents.length === 1 &&
      createEvents[0].message.includes("created test.py")
    ) {
      recordPass(5, `File creation event verified: "${createEvents[0].message}"`);
    } else {
      throw new Error(`Expected 1 creation event, got ${createEvents.length}`);
    }
  } catch (err) {
    recordFail(5, "User A creates a file", err);
  }

  try {
    // =========================================================
    // TEST 6: User A renames the file.
    // Expected: exactly one rename event.
    // =========================================================
    console.log("\n--- Executing TEST 6: User A renames the file ---");
    const preCountB = activitiesB.length;

    await axios.put(
      `${BASE_URL}/api/projects/${projectId}/files/${createdFileId}/rename`,
      {
        newName: "demo.py",
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    await sleep(400);

    const renameEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "file_renamed" && (a.fileName === "demo.py" || a.metadata?.fileName === "demo.py"));

    if (
      renameEvents.length === 1 &&
      renameEvents[0].message.includes("demo.py")
    ) {
      recordPass(6, `File rename event verified: "${renameEvents[0].message}"`);
    } else {
      throw new Error(`Expected 1 rename event, got ${renameEvents.length}`);
    }
  } catch (err) {
    recordFail(6, "User A renames the file", err);
  }

  try {
    // =========================================================
    // TEST 7: User A deletes the file.
    // Expected: exactly one delete event.
    // =========================================================
    console.log("\n--- Executing TEST 7: User A deletes the file ---");
    const preCountB = activitiesB.length;

    await axios.delete(
      `${BASE_URL}/api/projects/${projectId}/files/${createdFileId}`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    await sleep(400);

    const deleteEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "file_deleted" && (a.fileName === "demo.py" || a.metadata?.fileName === "demo.py"));

    if (
      deleteEvents.length === 1 &&
      deleteEvents[0].message.includes("demo.py")
    ) {
      recordPass(7, `File delete event verified: "${deleteEvents[0].message}"`);
    } else {
      throw new Error(`Expected 1 delete event, got ${deleteEvents.length}`);
    }
  } catch (err) {
    recordFail(7, "User A deletes the file", err);
  }

  try {
    // =========================================================
    // TEST 8: User A makes a Git commit.
    // Expected: exactly one commit activity event.
    // =========================================================
    console.log("\n--- Executing TEST 8: User A makes a Git commit ---");
    const preCountB = activitiesB.length;

    const commitRes = await axios.post(
      `${BASE_URL}/api/projects/${projectId}/git/commit`,
      {
        message: "feat: add real-time activity tracking",
        stagedOnly: false,
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    await sleep(400);

    const commitEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "commit_created");

    if (
      commitEvents.length === 1 &&
      commitEvents[0].message &&
      commitEvents[0].message.includes("feat: add real-time activity tracking")
    ) {
      recordPass(8, `Commit activity event verified: "${commitEvents[0].message}"`);
    } else {
      throw new Error(`Expected 1 commit event, got ${commitEvents.length}`);
    }
  } catch (err) {
    recordFail(8, "User A makes a Git commit", err);
  }

  let wsA_tab2 = null;
  try {
    // =========================================================
    // TEST 9: User A opens two tabs (second socket).
    // Expected: still one collaborator for User A, no duplicate join activity.
    // =========================================================
    console.log("\n--- Executing TEST 9: User A opens two tabs ---");
    const preCountB = activitiesB.length;

    wsA_tab2 = new WebSocket(`${WS_URL}?token=${tokenA}&projectId=${projectId}`);
    const messagesTab2 = [];
    attachListeners(wsA_tab2, messagesTab2, []);
    await new Promise((resolve, reject) => {
      wsA_tab2.on("open", resolve);
      wsA_tab2.on("error", reject);
    });

    await sleep(400);

    const tab2JoinEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "user_joined" && a.userId === userAId);

    const connectTab2 = messagesTab2.find((m) => m.type === "connected");
    const totalOnlineTab2 = (connectTab2?.collaborators?.length || 0) + 1;

    if (tab2JoinEvents.length === 0 && totalOnlineTab2 === 2) {
      recordPass(
        9,
        `Second tab for User A opened without duplicate join event. Total online collaborators: ${totalOnlineTab2}`
      );
    } else {
      throw new Error(
        `Expected 0 duplicate join events (got ${tab2JoinEvents.length}), expected 2 online (got ${totalOnlineTab2})`
      );
    }
  } catch (err) {
    recordFail(9, "User A opens two tabs", err);
  }

  try {
    // =========================================================
    // TEST 10: Close one of User A's tabs while another remains open.
    // Expected: User A remains online, NO leave event.
    // =========================================================
    console.log("\n--- Executing TEST 10: Close one of User A's tabs ---");
    const preCountB = activitiesB.length;

    wsA_tab2.close();
    await sleep(1600); // longer than 1200ms grace period

    const leaveEventsTab = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "user_left" && a.userId === userAId);

    if (leaveEventsTab.length === 0) {
      recordPass(
        10,
        "Closing one tab while second remains open produced NO leave event for User A"
      );
    } else {
      throw new Error(
        `False leave event was triggered when closing secondary tab: ${JSON.stringify(
          leaveEventsTab
        )}`
      );
    }
  } catch (err) {
    recordFail(10, "Close one of User A's tabs", err);
  }

  try {
    // =========================================================
    // TEST 11: Close User A's final active session.
    // Expected: User A disappears from presence, exactly one leave event.
    // =========================================================
    console.log("\n--- Executing TEST 11: Close User A's final active session ---");
    const preCountB = activitiesB.length;

    wsA1.close();
    await sleep(1600); // grace period expires

    const leaveEventsFinal = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "user_left" && a.userId === userAId);

    const userLeftWSMsg = messagesB.filter(
      (m) => m.type === "user_left" && m.userId === userAId
    );

    if (leaveEventsFinal.length === 1 && userLeftWSMsg.length >= 1) {
      recordPass(
        11,
        `Final session closed: presence updated and exactly one leave activity recorded: "${leaveEventsFinal[0].message}"`
      );
    } else {
      throw new Error(`Expected exactly 1 leave event, got ${leaveEventsFinal.length}`);
    }
  } catch (err) {
    recordFail(11, "Close User A's final active session", err);
  }

  try {
    // =========================================================
    // TEST 12: Reconnect User A.
    // Expected: presence restored, no false leave/join spam.
    // =========================================================
    console.log("\n--- Executing TEST 12: Reconnect User A ---");
    const preCountB = activitiesB.length;

    const wsA_reconnected = new WebSocket(`${WS_URL}?token=${tokenA}&projectId=${projectId}`);
    const messagesA_rec = [];
    attachListeners(wsA_reconnected, messagesA_rec, []);
    await new Promise((resolve, reject) => {
      wsA_reconnected.on("open", resolve);
      wsA_reconnected.on("error", reject);
    });

    await sleep(400);

    const connectMsgRec = messagesA_rec.find((m) => m.type === "connected");
    const totalOnlineRec = (connectMsgRec?.collaborators?.length || 0) + 1;

    const newJoinEvents = activitiesB
      .slice(preCountB)
      .filter((a) => a.type === "user_joined" && a.userId === userAId);

    if (totalOnlineRec === 2 && newJoinEvents.length === 1) {
      recordPass(
        12,
        `User A reconnected: presence restored (2 online users), exactly 1 join event recorded`
      );
      wsA_reconnected.close();
    } else {
      throw new Error(
        `Expected 2 online (got ${totalOnlineRec}), exactly 1 join event (got ${newJoinEvents.length})`
      );
    }
  } catch (err) {
    recordFail(12, "Reconnect User A", err);
  }

  // Cleanup
  wsB.close();

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedTests.length} PASSED / ${failedTests.length} FAILED`);
  console.log("==================================================================");
  passedTests.forEach((t) => console.log("  " + t));
  if (failedTests.length > 0) {
    failedTests.forEach((t) => console.log("  " + t));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 12 ACTIVITY FEED & PRESENCE TESTS PASSED FLAWLESSLY!\n");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Fatal test suite error:", err);
  process.exit(1);
});
