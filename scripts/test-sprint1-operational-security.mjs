/**
 * TORK — Sprint 1: Operational Security Core Tests
 * 
 * Tests:
 *  1. POD validation & lifecycle (backend security, MIME, magic bytes, uploaded vs verified)
 *  2. Delivery gate (POD required before delivery, unverified POD rejected, verified POD accepted)
 *  3. Carrier single active transport concurrency & race condition protection
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 3099;
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

const supabase = createClient(supabaseUrl, supabaseKey);

// Demo accounts
const DEMO_SHIPPER = { email: "qa-shipper@tork.test", password: "TorkQA!2026Secure", role: "shipper" };
const DEMO_CARRIER = { email: "qa-carrier@tork.test", password: "TorkQA!2026Secure", role: "carrier" };

let shipperClient = null;
let carrierClient = null;
let shipperId = null;
let carrierId = null;
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
        console.log(`✓ Server is ready at ${BASE_URL}\n`);
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

// Sample valid base64 buffers
const VALID_PDF_BASE64 = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").toString("base64");
const VALID_JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString("base64");
const VALID_PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]).toString("base64");

// ============================================================
// ============================================================
// POD VALIDATION TESTS
// ============================================================

async function testPodValidation() {
  console.log("\n==================================================");
  console.log("1. POD VALIDATION & LIFECYCLE TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Test 1: Invalid MIME type should be rejected
  try {
    const res = await fetch(`${BASE_URL}/api/transports/tr-test-1/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "malware.exe",
        fileBase64: Buffer.from("MZ9000").toString("base64"),
        mimeType: "application/x-msdownload",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.error?.includes("Geçersiz dosya türü")) {
      console.log("✓ PASS: Test 1 - Invalid MIME type rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 1 - Expected invalid MIME rejection, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 1 - Error:", err.message);
    failed++;
  }

  // Test 2: File too large (>10MB) should be rejected
  try {
    const largeBase64 = "A".repeat(11 * 1024 * 1024 * 4); // ~11MB base64
    const res = await fetch(`${BASE_URL}/api/transports/tr-test-2/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "huge.pdf",
        fileBase64: largeBase64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.error?.includes("10MB")) {
      console.log("✓ PASS: Test 2 - Oversized file (>10MB) rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 2 - Expected oversized rejection, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 2 - Error:", err.message);
    failed++;
  }

  // Test 3: Empty file should be rejected
  try {
    const res = await fetch(`${BASE_URL}/api/transports/tr-test-3/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "empty.pdf",
        fileBase64: "",
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success) {
      console.log("✓ PASS: Test 3 - Empty file rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 3 - Expected empty file rejection, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 3 - Error:", err.message);
    failed++;
  }

  // Test 4: Missing fileName should be rejected
  try {
    const res = await fetch(`${BASE_URL}/api/transports/tr-test-4/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileBase64: VALID_PDF_BASE64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.error?.includes("zorunludur")) {
      console.log("✓ PASS: Test 4 - Missing file metadata rejected (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 4 - Expected missing metadata rejection, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 4 - Error:", err.message);
    failed++;
  }

  // Test 5: Corrupted magic bytes (claiming PDF but random text) should be rejected
  try {
    const corruptedBase64 = Buffer.from("NOT_A_PDF_FILE_HEADER").toString("base64");
    const res = await fetch(`${BASE_URL}/api/transports/tr-test-5/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "fake.pdf",
        fileBase64: corruptedBase64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.error?.includes("bozuk")) {
      console.log("✓ PASS: Test 5 - Corrupted magic byte check rejected fake PDF (400)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 5 - Expected magic byte rejection, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 5 - Error:", err.message);
    failed++;
  }

  // Test 6: Valid PDF upload returns "uploaded" status, NOT "verified"
  try {
    const testTrId = `tr-pod-live-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/transports/${testTrId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "teslim_belgesi_islak.pdf",
        fileBase64: VALID_PDF_BASE64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (
      res.status === 200 &&
      json.success &&
      json.document?.verification_status === "uploaded" &&
      json.document?.verified_at === null
    ) {
      console.log("✓ PASS: Test 6 - Valid upload returns strictly 'uploaded' status (NOT auto-verified)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 6 - Upload status mismatch:", json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 6 - Error:", err.message);
    failed++;
  }

  // Test 7: Valid JPEG upload returns "uploaded" status
  try {
    const testTrId = `tr-pod-jpg-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/transports/${testTrId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "kantar_fisi.jpg",
        fileBase64: VALID_JPEG_BASE64,
        mimeType: "image/jpeg",
        userId: carrierId,
      }),
    });
    const json = await res.json();

    if (res.status === 200 && json.document?.verification_status === "uploaded") {
      console.log("✓ PASS: Test 7 - Valid JPG upload stored as 'uploaded'");
      passed++;
    } else {
      console.error("✗ FAIL: Test 7 - Unexpected result:", json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 7 - Error:", err.message);
    failed++;
  }

  // Test 8: Unrelated random file uploaded is NOT verified
  try {
    const testTrId = `tr-random-${Date.now()}`;
    const uploadRes = await fetch(`${BASE_URL}/api/transports/${testTrId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "OTHER",
        fileName: "alakasiz_fotograf.png",
        fileBase64: VALID_PNG_BASE64,
        mimeType: "image/png",
        userId: carrierId,
      }),
    });
    const uploadJson = await uploadRes.json();

    // Check GET documents for this transport
    const getRes = await fetch(`${BASE_URL}/api/transports/${testTrId}/documents`);
    const getJson = await getRes.json();

    const isAnyVerified = getJson.documents?.some((d) => d.verification_status === "verified");

    if (!isAnyVerified && uploadJson.document?.verification_status === "uploaded") {
      console.log("✓ PASS: Test 8 - Unrelated file is NOT automatically verified");
      passed++;
    } else {
      console.error("✗ FAIL: Test 8 - Unrelated file should NOT be verified:", getJson);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 8 - Error:", err.message);
    failed++;
  }

  console.log(`POD Validation Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ============================================================
// DELIVERY GATE TESTS
// ============================================================

async function testDeliveryGate() {
  console.log("\n==================================================");
  console.log("2. DELIVERY GATE (POD ENFORCEMENT) TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Test 9: Delivery attempt without POD -> MUST be rejected (400 POD_NOT_VERIFIED)
  try {
    const trNoPodId = `tr-nopod-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/transports/${trNoPodId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Teslimat yapıldı iddiası",
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.code === "POD_NOT_VERIFIED") {
      console.log("✓ PASS: Test 9 - Delivery without POD is blocked by backend (400 POD_NOT_VERIFIED)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 9 - Expected delivery block without POD, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 9 - Error:", err.message);
    failed++;
  }

  // Test 10: Delivery attempt with unverified uploaded POD -> MUST be rejected (400 POD_NOT_VERIFIED)
  try {
    const trUnverifiedId = `tr-unverified-${Date.now()}`;
    // 1. Upload a document (which has status: 'uploaded')
    await fetch(`${BASE_URL}/api/transports/${trUnverifiedId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "pod_unverified.pdf",
        fileBase64: VALID_PDF_BASE64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });

    // 2. Attempt delivery before verification
    const res = await fetch(`${BASE_URL}/api/transports/${trUnverifiedId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Teslimat yapmaya çalışıyorum",
      }),
    });
    const json = await res.json();

    if (res.status === 400 && !json.success && json.code === "POD_NOT_VERIFIED") {
      console.log("✓ PASS: Test 10 - Delivery with unverified POD is blocked by backend (400 POD_NOT_VERIFIED)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 10 - Unverified POD should NOT allow delivery, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 10 - Error:", err.message);
    failed++;
  }

  // Test 11: Document verification step via PATCH
  let verifiedTrId = `tr-verified-${Date.now()}`;
  let verifiedDocId = null;
  try {
    // 1. Upload document
    const upRes = await fetch(`${BASE_URL}/api/transports/${verifiedTrId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: "POD",
        fileName: "pod_valid_signed.pdf",
        fileBase64: VALID_PDF_BASE64,
        mimeType: "application/pdf",
        userId: carrierId,
      }),
    });
    const upJson = await upRes.json();
    verifiedDocId = upJson.document?.id;

    // 2. Verify document via PATCH
    const patchRes = await fetch(`${BASE_URL}/api/transports/${verifiedTrId}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: verifiedDocId,
        status: "verified",
        verifiedBy: "qa-verifier-admin",
      }),
    });
    const patchJson = await patchRes.json();

    if (patchRes.status === 200 && patchJson.document?.verification_status === "verified") {
      console.log("✓ PASS: Test 11 - Document successfully verified by verification step");
      passed++;
    } else {
      console.error("✗ FAIL: Test 11 - Document verification failed:", patchJson);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 11 - Error:", err.message);
    failed++;
  }

  // Test 12: Delivery attempt with VERIFIED POD -> MUST succeed (200, status: 'delivered')
  try {
    const res = await fetch(`${BASE_URL}/api/transports/${verifiedTrId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Teslimat başarıyla tamamlandı.",
      }),
    });
    const json = await res.json();

    if (res.status === 200 && json.success && json.delivery?.status === "delivered") {
      console.log("✓ PASS: Test 12 - Delivery with VERIFIED POD succeeds (200 delivered)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 12 - Verified POD delivery should succeed, got:", res.status, json);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 12 - Error:", err.message);
    failed++;
  }

  console.log(`Delivery Gate Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ============================================================
// CARRIER SINGLE ACTIVE TRANSPORT & CONCURRENCY TESTS
// ============================================================

async function testCarrierConcurrency() {
  console.log("\n==================================================");
  console.log("3. CARRIER SINGLE ACTIVE TRANSPORT & CONCURRENCY TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Test 13: Transport create endpoint blocks carrier with active transport
  try {
    const carrierA = `carrier-conc-${Date.now()}`;
    const shipperA = `shipper-conc-${Date.now()}`;

    // 1. Create first transport
    const res1 = await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loadId: `load-1-${Date.now()}`,
        bidId: `bid-1-${Date.now()}`,
        carrierId: carrierA,
        shipperId: shipperA,
        bidAmount: 42000,
      }),
    });
    const json1 = await res1.json();

    if (res1.status === 200 && json1.success && json1.transport?.status === "assigned") {
      console.log("✓ PASS: Test 13.1 - First transport created when carrier has 0 active transports");
      passed++;
    } else {
      console.error("✗ FAIL: Test 13.1 - Could not create first transport:", json1);
      failed++;
    }

    // 2. Attempt to create second transport for SAME carrier -> MUST be blocked (409 CARRIER_HAS_ACTIVE_TRANSPORT)
    const res2 = await fetch(`${BASE_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loadId: `load-2-${Date.now()}`,
        bidId: `bid-2-${Date.now()}`,
        carrierId: carrierA,
        shipperId: shipperA,
        bidAmount: 38000,
      }),
    });
    const json2 = await res2.json();

    if (
      res2.status === 409 &&
      !json2.success &&
      json2.error?.includes("Devam eden bir seferiniz bulunuyor")
    ) {
      console.log("✓ PASS: Test 13.2 - Second transport blocked with active transport message (409)");
      passed++;
    } else {
      console.error("✗ FAIL: Test 13.2 - Second active transport should have been blocked, got:", res2.status, json2);
      failed++;
    }
  } catch (err) {
    console.error("✗ FAIL: Test 13 - Error:", err.message);
    failed++;
  }

  // Test 14: Supabase RPC & Live Concurrency / Race Condition Simulation
  try {
    // Setup 2 loads created by demo shipper
    const { data: load1, error: l1Err } = await shipperClient
      .from("loads")
      .insert({
        shipper_id: shipperId,
        origin: "İstanbul / Arnavutköy",
        destination: "Ankara / Çankaya",
        tonnage: 22,
        vehicle_type: "TIR (Tenteli)",
        status: "open",
      })
      .select()
      .single();

    const { data: load2, error: l2Err } = await shipperClient
      .from("loads")
      .insert({
        shipper_id: shipperId,
        origin: "İzmir / Konak",
        destination: "Bursa / Nilüfer",
        tonnage: 18,
        vehicle_type: "Kamyon (Kapalı Kasa)",
        status: "open",
      })
      .select()
      .single();

    if (l1Err || l2Err || !load1 || !load2) {
      console.log("⚠️ Notice: Database load setup failed:", l1Err?.message || l2Err?.message);
    } else {
      // Create 2 bids for the same carrier
      const { data: bid1 } = await carrierClient
        .from("bids")
        .insert({
          load_id: load1.id,
          carrier_id: carrierId,
          amount: 41000,
          status: "pending",
        })
        .select()
        .single();

      const { data: bid2 } = await carrierClient
        .from("bids")
        .insert({
          load_id: load2.id,
          carrier_id: carrierId,
          amount: 32000,
          status: "pending",
        })
        .select()
        .single();

      if (bid1 && bid2) {
        // Clean up any existing active transports and accepted bids for demo carrier first
        await shipperClient.from("transports").delete().eq("carrier_id", carrierId);
        await shipperClient.from("bids").delete().eq("carrier_id", carrierId).neq("id", bid1.id).neq("id", bid2.id);

        // RACE CONDITION: Two requests execute concurrently (simulating 2 tabs/browsers)
        console.log("Launching 2 simultaneous accept requests for the same carrier via accept endpoint...");
        const [acceptRes1, acceptRes2] = await Promise.allSettled([
          fetch(`${BASE_URL}/api/bids/${bid1.id}/accept`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${shipperToken}`,
            },
            body: JSON.stringify({ shipperId }),
          }).then((r) => r.json()),
          fetch(`${BASE_URL}/api/bids/${bid2.id}/accept`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${shipperToken}`,
            },
            body: JSON.stringify({ shipperId }),
          }).then((r) => r.json()),
        ]);

        const res1Data = acceptRes1.status === "fulfilled" ? acceptRes1.value : null;
        const res2Data = acceptRes2.status === "fulfilled" ? acceptRes2.value : null;

        const successCount =
          (res1Data?.success ? 1 : 0) + (res2Data?.success ? 1 : 0);
        const failCount =
          (res1Data && !res1Data.success ? 1 : 0) + (res2Data && !res2Data.success ? 1 : 0);

        // Exactly 1 must succeed and exactly 1 must fail
        if (successCount === 1 && failCount === 1) {
          console.log("✓ PASS: Test 14 - Concurrency Race Condition safely serialized: exactly 1 succeeded, 1 rejected");
          passed++;
        } else {
          console.error(`✗ FAIL: Test 14 - Race condition violated! Successes: ${successCount}, Failures: ${failCount}`, { res1Data, res2Data });
          failed++;
        }

        // Verify count of accepted bids in database for these concurrent bids is exactly 1
        const { data: acceptedBids } = await shipperClient
          .from("bids")
          .select("id, status")
          .in("id", [bid1.id, bid2.id])
          .eq("status", "accepted");

        if (acceptedBids && acceptedBids.length === 1) {
          console.log(`✓ PASS: Test 15 - Database verified: Exactly 1 bid out of concurrent bids was accepted in DB`);
          passed++;
        } else {
          console.error("✗ FAIL: Test 15 - Database accepted bids count for concurrent bids:", acceptedBids?.length);
          failed++;
        }

        // Cleanup test data
        await shipperClient.from("bids").delete().in("id", [bid1.id, bid2.id]);
        await shipperClient.from("loads").delete().in("id", [load1.id, load2.id]);
      }
    }
  } catch (err) {
    console.error("✗ FAIL: Concurrency test error:", err.message);
    failed++;
  }

  console.log(`Concurrency Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ============================================================
// MAIN RUNNER
// ============================================================

let shipperToken = null;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     TORK — Sprint 1: Operational Security Core Tests        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  let totalPassed = 0;
  let totalFailed = 0;

  try {
    await startServer();

    console.log("Logging in demo accounts for database validation...");
    shipperClient = createClient(supabaseUrl, supabaseKey);
    const { data: sAuth } = await shipperClient.auth.signInWithPassword({
      email: DEMO_SHIPPER.email,
      password: DEMO_SHIPPER.password,
    });
    shipperId = sAuth?.user?.id;
    shipperToken = sAuth?.session?.access_token;

    carrierClient = createClient(supabaseUrl, supabaseKey);
    const { data: cAuth } = await carrierClient.auth.signInWithPassword({
      email: DEMO_CARRIER.email,
      password: DEMO_CARRIER.password,
    });
    carrierId = cAuth?.user?.id;

    console.log(`✓ Shipper: ${shipperId || "local-test-shipper"}`);
    console.log(`✓ Carrier: ${carrierId || "local-test-carrier"}`);

    const podRes = await testPodValidation();
    totalPassed += podRes.passed;
    totalFailed += podRes.failed;

    const deliveryRes = await testDeliveryGate();
    totalPassed += deliveryRes.passed;
    totalFailed += deliveryRes.failed;

    const concRes = await testCarrierConcurrency();
    totalPassed += concRes.passed;
    totalFailed += concRes.failed;
  } catch (err) {
    console.error("Fatal error during test execution:", err);
    totalFailed++;
  } finally {
    stopServer();
  }

  console.log("\n==================================================");
  console.log(`TOTAL RESULT: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("==================================================\n");

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();


