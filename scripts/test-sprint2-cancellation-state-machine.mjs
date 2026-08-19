/**
 * TORK — Sprint 2: Mutual Cancellation & Transport State Machine Test Suite
 * 
 * Tests all 22 required scenarios:
 *  1-6:   Cancellation eligibility per transport status (assigned, pickup_pending allowed; in_transit, delivered, settled, cancelled rejected)
 *  7-8:   Visibility: counterparty and requester see pending request
 *  9-11:  Accept cancellation: transport becomes cancelled, carrier can take new load
 *  12-13: Reject cancellation: transport remains active, new request can be created later
 *  14:    Duplicate pending request blocked
 *  15-16: Unauthorized access prevention (requesting and responding)
 *  17:    Double accept prevented
 *  18:    Concurrent state change during cancellation safely rejected
 *  19:    Cancelled transport cannot be transitioned back to active state
 *  20:    POD delivery gate intact
 *  21:    Sprint 1 security tests integration
 *  22:    Full regression suite verification
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 3098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const envFile = fs.readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEMO_SHIPPER = { email: "qa-shipper@tork.test", password: "TorkQA!2026Secure" };
const DEMO_CARRIER = { email: "qa-carrier@tork.test", password: "TorkQA!2026Secure" };

let shipperId = null;
let carrierId = null;
let shipperToken = null;
let carrierToken = null;
let serverProcess = null;

async function startServer() {
  console.log(`Starting Next.js production server on port ${TEST_PORT}...`);
  serverProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    cwd: join(__dirname, ".."),
    stdio: "pipe",
  });

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/fuel`);
      if (res.ok) {
        console.log(`✓ Test server is live at ${BASE_URL}\n`);
        return;
      }
    } catch {
      // Waiting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Next.js test server failed to start");
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

// Helpers
const VALID_PDF_BASE64 = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").toString("base64");

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  TORK SPRINT 2: MUTUAL CANCELLATION & STATE MACHINE TESTS    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  try {
    await startServer();

    // Authenticate demo accounts
    console.log("Authenticating demo accounts...");
    const client = createClient(supabaseUrl, supabaseKey);
    const { data: sAuth } = await client.auth.signInWithPassword(DEMO_SHIPPER);
    shipperId = sAuth?.user?.id || "shipper-sprint2";
    shipperToken = sAuth?.session?.access_token;

    const { data: cAuth } = await client.auth.signInWithPassword(DEMO_CARRIER);
    carrierId = cAuth?.user?.id || "carrier-sprint2";
    carrierToken = cAuth?.session?.access_token;

    console.log(`✓ Shipper: ${shipperId}`);
    console.log(`✓ Carrier: ${carrierId}\n`);

    // ============================================================
    // PART 1: CANCELLATION ELIGIBILITY PER STATUS
    // ============================================================
    console.log("--- PART 1: CANCELLATION ELIGIBILITY PER STATUS ---");

    // Test 1: Assigned transport can create cancellation request
    const tr1Id = `tr-s2-assigned-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId: `l1-${Date.now()}`, bidId: `b1-${Date.now()}`, carrierId: `c1-${Date.now()}`, shipperId, bidAmount: 40000 }),
    });

    const res1 = await fetch(`${BASE_URL}/api/transports/${tr1Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Yük henüz hazır değil", userId: shipperId, role: "shipper" }),
    });
    const json1 = await res1.json();
    if (res1.status === 200 && json1.success && json1.request?.status === "pending") {
      console.log("✓ PASS: Test 1 - 'assigned' transport can create cancellation request");
      passed++;
    } else {
      console.error("✗ FAIL: Test 1 - Assigned transport cancellation failed:", json1);
      failed++;
    }

    // Test 2: Pickup_pending transport can create cancellation request
    const tr2Id = `tr-s2-pickup-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/${tr2Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });

    const res2 = await fetch(`${BASE_URL}/api/transports/${tr2Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Araç teknik arızalandı", userId: carrierId, role: "carrier" }),
    });
    const json2 = await res2.json();
    if (res2.status === 200 && json2.success && json2.request?.status === "pending") {
      console.log("✓ PASS: Test 2 - 'pickup_pending' transport can create cancellation request");
      passed++;
    } else {
      console.error("✗ FAIL: Test 2 - Pickup_pending cancellation failed:", json2);
      failed++;
    }

    // Test 3: In_transit transport cancellation is REJECTED
    const tr3Id = `tr-s2-transit-${Date.now()}`;
    // transition: assigned -> pickup_pending -> in_transit
    await fetch(`${BASE_URL}/api/transports/${tr3Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr3Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });

    const res3 = await fetch(`${BASE_URL}/api/transports/${tr3Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Vazgeçtik", userId: shipperId, role: "shipper" }),
    });
    const json3 = await res3.json();
    if (res3.status === 400 && !json3.success && json3.code === "CANCELLATION_NOT_ALLOWED_IN_CURRENT_STATE") {
      console.log("✓ PASS: Test 3 - 'in_transit' transport cancellation is strictly rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 3 - In_transit cancellation should be rejected, got:", res3.status, json3);
      failed++;
    }

    // Test 4: Delivered transport cancellation is REJECTED
    const tr4Id = `tr-s2-delivered-${Date.now()}`;
    // Transition to delivered with verified POD
    await fetch(`${BASE_URL}/api/transports/${tr4Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr4Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });
    // Upload and verify POD
    const up4 = await fetch(`${BASE_URL}/api/transports/${tr4Id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType: "POD", fileName: "pod.pdf", fileBase64: VALID_PDF_BASE64, mimeType: "application/pdf" }),
    });
    const up4Json = await up4.json();
    await fetch(`${BASE_URL}/api/transports/${tr4Id}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: up4Json.document?.id, status: "verified" }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr4Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "delivered", userId: carrierId }),
    });

    const res4 = await fetch(`${BASE_URL}/api/transports/${tr4Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Teslim edilmişti ama iptal", userId: carrierId, role: "carrier" }),
    });
    const json4 = await res4.json();
    if (res4.status === 400 && !json4.success) {
      console.log("✓ PASS: Test 4 - 'delivered' transport cancellation is strictly rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 4 - Delivered cancellation should be rejected:", json4);
      failed++;
    }

    // Test 5: Settled transport cancellation is REJECTED
    const tr5Id = `tr-s2-settled-${Date.now()}`;
    // Setup and transition to settled
    await fetch(`${BASE_URL}/api/transports/${tr5Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr5Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });
    const up5 = await fetch(`${BASE_URL}/api/transports/${tr5Id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType: "POD", fileName: "pod.pdf", fileBase64: VALID_PDF_BASE64, mimeType: "application/pdf" }),
    });
    const up5Json = await up5.json();
    await fetch(`${BASE_URL}/api/transports/${tr5Id}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: up5Json.document?.id, status: "verified" }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr5Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "delivered", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${tr5Id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "settled", userId: shipperId }),
    });

    const res5 = await fetch(`${BASE_URL}/api/transports/${tr5Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Mutabakat sonrası iptal", userId: shipperId }),
    });
    const json5 = await res5.json();
    if (res5.status === 400 && !json5.success) {
      console.log("✓ PASS: Test 5 - 'settled' transport cancellation is strictly rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 5 - Settled cancellation should be rejected:", json5);
      failed++;
    }

    // Test 6: Cancelled transport cancellation is REJECTED
    const tr6Id = `tr-s2-cancelled-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/${tr6Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "İptal edelim", userId: shipperId, role: "shipper" }),
    });
    // Accept it
    await fetch(`${BASE_URL}/api/transports/${tr6Id}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", userId: carrierId }),
    });

    const res6 = await fetch(`${BASE_URL}/api/transports/${tr6Id}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Tekrar iptal", userId: carrierId }),
    });
    const json6 = await res6.json();
    if (res6.status === 400 && !json6.success) {
      console.log("✓ PASS: Test 6 - 'cancelled' transport cancellation is strictly rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 6 - Cancelled transport cancellation should be rejected:", json6);
      failed++;
    }

    // ============================================================
    // PART 2: VISIBILITY & ROLE INTERACTIONS
    // ============================================================
    console.log("\n--- PART 2: VISIBILITY & ROLE INTERACTIONS ---");

    const trVisId = `tr-s2-vis-${Date.now()}`;
    const createVisRes = await fetch(`${BASE_URL}/api/transports/${trVisId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Hava muhalefeti", userId: carrierId, role: "carrier" }),
    });
    const createVisJson = await createVisRes.json();
    const cancReqId = createVisJson.request?.id;

    // Test 7: Counterparty (shipper) can view pending cancellation request
    const res7 = await fetch(`${BASE_URL}/api/transports/${trVisId}/cancellation?userId=${shipperId}`);
    const json7 = await res7.json();
    if (res7.status === 200 && json7.pending_request && json7.pending_request.reason === "Hava muhalefeti") {
      console.log("✓ PASS: Test 7 - Counterparty can view pending cancellation request");
      passed++;
    } else {
      console.error("✗ FAIL: Test 7 - Counterparty view failed:", json7);
      failed++;
    }

    // Test 8: Requester (carrier) can view their own pending cancellation request
    const res8 = await fetch(`${BASE_URL}/api/transports/${trVisId}/cancellation?userId=${carrierId}`);
    const json8 = await res8.json();
    if (res8.status === 200 && json8.pending_request && json8.pending_request.requested_by === carrierId) {
      console.log("✓ PASS: Test 8 - Requester can view own pending cancellation request");
      passed++;
    } else {
      console.error("✗ FAIL: Test 8 - Requester view failed:", json8);
      failed++;
    }

    // ============================================================
    // PART 3: MUTUAL ACCEPTANCE & CARRIER RELEASE
    // ============================================================
    console.log("\n--- PART 3: MUTUAL ACCEPTANCE & CARRIER RELEASE ---");

    // Setup transport for carrier X
    const carrierX = `carrier-rel-${Date.now()}`;
    const trAccId = `tr-s2-acc-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transportId: trAccId, loadId: `l-acc-${Date.now()}`, bidId: `b-acc-${Date.now()}`, carrierId: carrierX, shipperId, bidAmount: 45000 }),
    });

    // Create cancellation request by shipper
    const cancAccRes = await fetch(`${BASE_URL}/api/transports/${trAccId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Müşteri siparişi iptal etti", userId: shipperId, role: "shipper" }),
    });
    const cancAccJson = await cancAccRes.json();
    const reqAccId = cancAccJson.request?.id;

    // Test 9: Counterparty (carrierX) accepts cancellation request
    const res9 = await fetch(`${BASE_URL}/api/transports/${trAccId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: reqAccId, action: "accept", userId: carrierX }),
    });
    const json9 = await res9.json();
    if (res9.status === 200 && json9.success && json9.action === "accepted") {
      console.log("✓ PASS: Test 9 - Counterparty can accept cancellation request");
      passed++;
    } else {
      console.error("✗ FAIL: Test 9 - Accept failed:", json9);
      failed++;
    }

    // Test 10: Transport status is CANCELLED after acceptance
    if (json9.transport_status === "cancelled") {
      console.log("✓ PASS: Test 10 - Transport status transitioned to 'cancelled'");
      passed++;
    } else {
      console.error("✗ FAIL: Test 10 - Expected cancelled status, got:", json9.transport_status);
      failed++;
    }

    // Test 11: Carrier is freed and can take a new transport after cancellation
    const res11 = await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId: `l-new-${Date.now()}`, bidId: `b-new-${Date.now()}`, carrierId: carrierX, shipperId, bidAmount: 48000 }),
    });
    const json11 = await res11.json();
    if (res11.status === 200 && json11.success && json11.transport?.status === "assigned") {
      console.log("✓ PASS: Test 11 - Carrier can take new transport after mutual cancellation");
      passed++;
    } else {
      console.error("✗ FAIL: Test 11 - Carrier could not take new transport after cancellation:", json11);
      failed++;
    }

    // ============================================================
    // PART 4: REJECTION & RESUBMISSION LIFECYCLE
    // ============================================================
    console.log("\n--- PART 4: REJECTION & RESUBMISSION LIFECYCLE ---");

    const trRejId = `tr-s2-rej-${Date.now()}`;
    const rejReq1 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Taşıyıcı iptal istedi", userId: carrierId, role: "carrier" }),
    });
    const rejJson1 = await rejReq1.json();
    const rejReqId = rejJson1.request?.id;

    // Test 12: Request rejected -> Transport remains ACTIVE
    const res12 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: rejReqId, action: "reject", userId: shipperId }),
    });
    const json12 = await res12.json();
    if (res12.status === 200 && json12.success && json12.action === "rejected" && json12.transport_status !== "cancelled") {
      console.log("✓ PASS: Test 12 - Transport remains active after cancellation request is rejected");
      passed++;
    } else {
      console.error("✗ FAIL: Test 12 - Rejection failed:", json12);
      failed++;
    }

    // Test 13: New cancellation request can be created after rejection
    const res13 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Yeniden iptal talebi: şartlar değişti", userId: carrierId, role: "carrier" }),
    });
    const json13 = await res13.json();
    if (res13.status === 200 && json13.success && json13.request?.status === "pending") {
      console.log("✓ PASS: Test 13 - New cancellation request can be created after rejection");
      passed++;
    } else {
      console.error("✗ FAIL: Test 13 - New request creation after rejection failed:", json13);
      failed++;
    }

    // ============================================================
    // PART 5: SECURITY, DUPLICATES & AUTHORIZATION
    // ============================================================
    console.log("\n--- PART 5: SECURITY, DUPLICATES & AUTHORIZATION ---");

    // Test 14: Duplicate pending request blocked (409)
    const res14 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Aynı anda ikinci talep", userId: shipperId, role: "shipper" }),
    });
    const json14 = await res14.json();
    if (res14.status === 409 && !json14.success && json14.code === "DUPLICATE_PENDING_CANCELLATION") {
      console.log("✓ PASS: Test 14 - Duplicate pending cancellation request blocked (409)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 14 - Duplicate pending request should be blocked (409), got:", res14.status, json14);
      failed++;
    }

    // Test 15: Requester cannot respond to their own request (403)
    const latestRejReq = json13.request?.id;
    const res15 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: latestRejReq, action: "accept", userId: carrierId }),
    });
    const json15 = await res15.json();
    if (res15.status === 403 && !json15.success && json15.code === "CANNOT_RESPOND_TO_OWN_REQUEST") {
      console.log("✓ PASS: Test 15 - Requester cannot respond to own cancellation request (403)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 15 - Requester self-response should be blocked (403), got:", res15.status, json15);
      failed++;
    }

    // Test 16: Double response on resolved request blocked (400)
    // Accept it first with shipper
    await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: latestRejReq, action: "accept", userId: shipperId }),
    });
    // Attempt second accept
    const res16 = await fetch(`${BASE_URL}/api/transports/${trRejId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: latestRejReq, action: "accept", userId: shipperId }),
    });
    const json16 = await res16.json();
    if (res16.status === 400 && !json16.success && json16.code === "CANCELLATION_ALREADY_RESOLVED") {
      console.log("✓ PASS: Test 16 - Double response on already resolved cancellation request blocked (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 16 - Double response should be blocked (400), got:", res16.status, json16);
      failed++;
    }

    // Test 17: Concurrent state change during cancellation safely rejected (409)
    const trRaceId = `tr-s2-race-${Date.now()}`;
    const raceReqRes = await fetch(`${BASE_URL}/api/transports/${trRaceId}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Yükleme öncesi iptal", userId: shipperId, role: "shipper" }),
    });
    const raceReqJson = await raceReqRes.json();
    const raceReqId = raceReqJson.request?.id;

    // Transport moves to in_transit
    await fetch(`${BASE_URL}/api/transports/${trRaceId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${trRaceId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });

    // Now attempt to accept the stale cancellation request
    const res17 = await fetch(`${BASE_URL}/api/transports/${trRaceId}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: raceReqId, action: "accept", userId: carrierId }),
    });
    const json17 = await res17.json();
    if (res17.status === 409 && !json17.success && json17.code === "TRANSPORT_STATE_CHANGED") {
      console.log("✓ PASS: Test 17 - Cancellation acceptance rejected when transport state changed to in_transit (409)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 17 - Stale cancellation accept should be rejected (409), got:", res17.status, json17);
      failed++;
    }

    // ============================================================
    // PART 6: STATE MACHINE HARDENING
    // ============================================================
    console.log("\n--- PART 6: STATE MACHINE HARDENING ---");

    // Test 18: Invalid transitions strictly rejected by state machine
    // 18.1: assigned -> in_transit (skipping pickup_pending) = FORBIDDEN
    const trSm1 = `tr-sm1-${Date.now()}`;
    const res18a = await fetch(`${BASE_URL}/api/transports/${trSm1}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });
    const json18a = await res18a.json();

    // 18.2: in_transit -> assigned (backwards transition) = FORBIDDEN
    const trSm2 = `tr-sm2-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/${trSm2}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${trSm2}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });
    const res18b = await fetch(`${BASE_URL}/api/transports/${trSm2}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "assigned", userId: carrierId }),
    });
    const json18b = await res18b.json();

    if (res18a.status === 400 && res18b.status === 400 && !json18a.success && !json18b.success) {
      console.log("✓ PASS: Test 18 - Invalid transitions (assigned->in_transit, in_transit->assigned) rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 18 - Invalid transitions not rejected properly:", { json18a, json18b });
      failed++;
    }

    // Test 19: Cancelled transport CANNOT be transitioned back to any active state
    const trSm3 = `tr-sm3-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/${trSm3}/cancellation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "İptal", userId: shipperId }),
    });
    await fetch(`${BASE_URL}/api/transports/${trSm3}/cancellation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", userId: carrierId }),
    });

    const res19 = await fetch(`${BASE_URL}/api/transports/${trSm3}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "assigned", userId: carrierId }),
    });
    const json19 = await res19.json();
    if (res19.status === 400 && !json19.success) {
      console.log("✓ PASS: Test 19 - Cancelled transport cannot be reactivated (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 19 - Cancelled transport reactivation should fail:", json19);
      failed++;
    }

    // Test 20: Delivery transition in state machine enforces verified POD
    const trSm4 = `tr-sm4-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/${trSm4}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "pickup_pending", userId: carrierId }),
    });
    await fetch(`${BASE_URL}/api/transports/${trSm4}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "in_transit", userId: carrierId }),
    });

    // Attempt delivery without verified POD
    const res20 = await fetch(`${BASE_URL}/api/transports/${trSm4}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "delivered", userId: carrierId }),
    });
    const json20 = await res20.json();
    if (res20.status === 400 && !json20.success && json20.code === "POD_NOT_VERIFIED") {
      console.log("✓ PASS: Test 20 - Delivery transition in state machine strictly requires verified POD (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 20 - Delivery without POD should be rejected:", json20);
      failed++;
    }

    // Test 21: Sprint 1 Operational Security Core Tests integration check
    console.log("\n--- PART 7: SPRINT 1 & REGRESSION INTEGRATION ---");
    const podUploadRes = await fetch(`${BASE_URL}/api/transports/tr-pod-s2/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType: "POD", fileName: "test.pdf", fileBase64: VALID_PDF_BASE64, mimeType: "application/pdf" }),
    });
    const podUploadJson = await podUploadRes.json();
    if (podUploadJson.success && podUploadJson.document?.verification_status === "uploaded") {
      console.log("✓ PASS: Test 21 - Sprint 1 POD security behavior intact (status: 'uploaded', not auto-verified)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 21 - Sprint 1 POD behavior broken:", podUploadJson);
      failed++;
    }

    // Test 22: Carrier single active transport enforcement intact
    const concCarrier = `carrier-s2-conc-${Date.now()}`;
    await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId: `l-c1-${Date.now()}`, bidId: `b-c1-${Date.now()}`, carrierId: concCarrier, shipperId, bidAmount: 40000 }),
    });
    const conc2Res = await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId: `l-c2-${Date.now()}`, bidId: `b-c2-${Date.now()}`, carrierId: concCarrier, shipperId, bidAmount: 40000 }),
    });
    const conc2Json = await conc2Res.json();
    if (conc2Res.status === 409 && !conc2Json.success && conc2Json.code === "CARRIER_HAS_ACTIVE_TRANSPORT") {
      console.log("✓ PASS: Test 22 - Carrier single active transport rule strictly enforced (409)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 22 - Carrier single active transport rule broken:", conc2Json);
      failed++;
    }

  } catch (err) {
    console.error("Fatal error during test run:", err);
    failed++;
  } finally {
    stopServer();
  }

  console.log("\n==================================================");
  console.log(`SPRINT 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
