/**
 * Targeted Test Suite: Unique User Presence & Session Lifecycle
 * Tests multi-tab connections, reconnects, temporary socket drops, and activity feed deduplication.
 */

import axios from "axios";
import WebSocket from "ws";

const BASE_URL = "http://127.0.0.1:5000";
const WS_URL = "ws://127.0.0.1:5000/ws/collaboration";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runUniquePresenceTest() {
  console.log("================================================================");
  console.log("🔬 TESTING UNIQUE COLLABORATOR PRESENCE & MULTI-SESSION LIFECYCLE");
  console.log("================================================================");

  const ts = Date.now();

  // 1. Register User A (Kushal) and User B (Naveen)
  const userA = { name: "Kushal", email: `kushal_${ts}@test.com`, password: "Password123!" };
  const userB = { name: "Naveen", email: `naveen_${ts}@test.com`, password: "Password123!" };

  const regARes = await axios.post(`${BASE_URL}/api/auth/register`, userA);
  const tokenA = extractToken(regARes);
  const idA = regARes.data.user.id || regARes.data.user._id;

  const regBRes = await axios.post(`${BASE_URL}/api/auth/register`, userB);
  const tokenB = extractToken(regBRes);
  const idB = regBRes.data.user.id || regBRes.data.user._id;

  console.log(`✅ Registered User A: Kushal (${idA}) and User B: Naveen (${idB})`);

  // 2. Kushal creates a project and invites Naveen
  const projRes = await axios.post(
    `${BASE_URL}/api/projects`,
    { name: `Collab Presence Test ${ts}`, description: "Testing unique sessions", template: "react" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const projectId = projRes.data.project._id;

  await axios.post(
    `${BASE_URL}/api/projects/${projectId}/collaborators`,
    { email: userB.email },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  console.log(`✅ Project created and Naveen added as collaborator`);

  const eventsA = [];
  const eventsB1 = [];
  const eventsB2 = [];

  // Helper to connect a socket and collect events
  const connectSocket = (token, label, eventLog) => {
    return new Promise((resolve) => {
      const ws = new WebSocket(`${WS_URL}?projectId=${projectId}&token=${token}`);
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          eventLog.push(msg);
        } catch (e) {}
      });
      ws.on("open", () => {
        resolve(ws);
      });
    });
  };

  // STEP 1: Kushal opens Tab 1 (socket A1)
  console.log("\n[Step 1] Kushal opens Tab 1 (socket A1)...");
  const wsA1 = await connectSocket(tokenA, "Kushal Tab 1", eventsA);
  await sleep(200);

  const initA = eventsA.find((m) => m.type === "connected");
  console.log(`Kushal connected. Remote collaborators received: ${initA?.collaborators?.length}`);
  if (initA?.collaborators?.length !== 0) {
    throw new Error(`Expected 0 remote collaborators for Kushal initially, got ${initA?.collaborators?.length}`);
  }
  console.log("✅ PASS: Kushal sees 0 remote collaborators initially (self is excluded from remote list)");

  // STEP 2: Naveen opens Tab 1 (socket B1)
  console.log("\n[Step 2] Naveen opens Tab 1 (socket B1)...");
  const wsB1 = await connectSocket(tokenB, "Naveen Tab 1", eventsB1);
  await sleep(300);

  const initB1 = eventsB1.find((m) => m.type === "connected");
  console.log(`Naveen B1 connected. Remote collaborators received: ${initB1?.collaborators?.length}`);
  if (initB1?.collaborators?.length !== 1 || initB1?.collaborators[0]?.userId !== idA) {
    throw new Error(`Expected Naveen to see exactly 1 remote collaborator (Kushal), got: ${JSON.stringify(initB1?.collaborators)}`);
  }

  const joinEventsForNaveenSeenByA = eventsA.filter((m) => m.type === "user_joined" && m.collaborator?.userId === idB);
  if (joinEventsForNaveenSeenByA.length !== 1) {
    throw new Error(`Expected Kushal to receive exactly 1 user_joined event for Naveen, got: ${joinEventsForNaveenSeenByA.length}`);
  }
  console.log("✅ PASS: Naveen's first tab generates exactly 1 user_joined event on Kushal's side");

  // STEP 3: Naveen opens Tab 2 (socket B2 - multi-tab / duplicate connection)
  console.log("\n[Step 3] Naveen opens Tab 2 (socket B2)...");
  const wsB2 = await connectSocket(tokenB, "Naveen Tab 2", eventsB2);
  await sleep(300);

  const initB2 = eventsB2.find((m) => m.type === "connected");
  console.log(`Naveen B2 connected. Remote collaborators received: ${initB2?.collaborators?.length}`);
  if (initB2?.collaborators?.length !== 1) {
    throw new Error(`Expected Naveen Tab 2 to see only Kushal (not another Naveen), got: ${initB2?.collaborators?.length}`);
  }

  const joinEventsAfterTab2 = eventsA.filter((m) => m.type === "user_joined" && m.collaborator?.userId === idB);
  console.log(`Total user_joined events for Naveen seen by Kushal so far: ${joinEventsAfterTab2.length}`);
  if (joinEventsAfterTab2.length !== 1) {
    throw new Error(`FAIL: Second tab of Naveen emitted duplicate user_joined! Total events: ${joinEventsAfterTab2.length}`);
  }
  console.log("✅ PASS: Naveen opening a 2nd tab DID NOT emit a duplicate user_joined event!");

  // STEP 4: Close Naveen's Tab 1 while Tab 2 is still open
  console.log("\n[Step 4] Closing Naveen's Tab 1 (socket B1) while Tab 2 remains open...");
  wsB1.close();
  await sleep(400);

  const leaveEventsSeenByA = eventsA.filter((m) => m.type === "user_left" && m.userId === idB);
  console.log(`user_left events seen by Kushal after closing Tab 1: ${leaveEventsSeenByA.length}`);
  if (leaveEventsSeenByA.length !== 0) {
    throw new Error(`FAIL: Closing Tab 1 emitted user_left even though Naveen still has Tab 2 open!`);
  }
  console.log("✅ PASS: Naveen remains online because Tab 2 is still active. Zero premature user_left events!");

  // STEP 5: Cursor update from Naveen Tab 2 is received by Kushal
  console.log("\n[Step 5] Sending cursor update from Naveen Tab 2...");
  wsB2.send(
    JSON.stringify({
      type: "presence_update",
      data: {
        cursor: { line: 10, col: 5 },
      },
    })
  );
  await sleep(300);

  const cursorEvent = eventsA.find((m) => m.type === "presence_updated" && m.userId === idB && m.data?.cursor?.line === 10);
  if (!cursorEvent) {
    throw new Error("Kushal did not receive cursor update from Naveen Tab 2!");
  }
  console.log("✅ PASS: Cursor update from Naveen Tab 2 successfully routed to Kushal");

  // STEP 6: Close Naveen's final tab (Tab 2)
  console.log("\n[Step 6] Closing Naveen's final tab (socket B2)...");
  wsB2.close();
  await sleep(400);

  const finalLeaveEvents = eventsA.filter((m) => m.type === "user_left" && m.userId === idB);
  console.log(`user_left events seen by Kushal after closing final tab: ${finalLeaveEvents.length}`);
  if (finalLeaveEvents.length !== 1) {
    throw new Error(`Expected exactly 1 user_left event for Naveen upon final departure, got: ${finalLeaveEvents.length}`);
  }
  console.log("✅ PASS: Exactly 1 user_left event emitted when Naveen's final socket disconnects");

  // STEP 7: Naveen reconnects after departure
  console.log("\n[Step 7] Naveen reconnects with a new socket B3...");
  const eventsB3 = [];
  const wsB3 = await connectSocket(tokenB, "Naveen Tab 3 (Reconnect)", eventsB3);
  await sleep(400);

  const reconnectedJoinEvents = eventsA.filter((m) => m.type === "user_joined" && m.collaborator?.userId === idB);
  console.log(`Total user_joined events for Naveen seen by Kushal after reconnect: ${reconnectedJoinEvents.length}`);
  if (reconnectedJoinEvents.length !== 2) {
    // 1 from initial join in step 2 + 1 from re-join in step 7 = 2
    throw new Error(`Expected 2 total join events across distinct sessions (1 initial, 1 after full leave), got: ${reconnectedJoinEvents.length}`);
  }
  console.log("✅ PASS: Naveen successfully reconnected and presence was cleanly restored");

  wsA1.close();
  wsB3.close();

  console.log("\n================================================================");
  console.log("🏆 ALL UNIQUE PRESENCE & MULTI-SESSION TESTS PASSED WITH 100% SUCCESS!");
  console.log("================================================================");
}

runUniquePresenceTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
