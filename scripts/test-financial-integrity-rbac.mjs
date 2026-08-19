import assert from "assert";

// Helper to create valid mock JWTs with specific roles
function createMockJwt(userId, email, role) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: email,
      role: "authenticated",
      user_metadata: { role, email },
      app_metadata: { role },
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");
  return `${header}.${payload}.mockSignature1234567890`;
}

const adminToken = createMockJwt("usr-admin-01", "admin@tork.test", "admin");
const operatorToken = createMockJwt("usr-op-01", "operator@tork.test", "operator");
const shipperToken = createMockJwt("usr-ship-01", "shipper@tork.test", "shipper");
const carrierToken = createMockJwt("usr-carr-01", "carrier@tork.test", "carrier");

const BASE_URL = "http://127.0.0.1:3000";

async function runTests() {
  console.log("================================================================================");
  console.log("   TORK — FINANCIAL INTEGRITY RBAC SECURITY TEST SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function test(name, isPass, detail) {
    if (isPass) {
      console.log(`✓ PASS: ${name} -> ${detail}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} -> ${detail}`);
      failed++;
    }
  }

  // 1. Anonymous (Unauthenticated) without token
  const res1 = await fetch(`${BASE_URL}/api/financial-integrity`);
  test("1. Anonymous Request (No Token)", res1.status === 401, `Status: ${res1.status}`);

  // 2. Anonymous Request trying privilege escalation via query param ?role=admin
  const res2 = await fetch(`${BASE_URL}/api/financial-integrity?role=admin`);
  test("2. Anonymous with ?role=admin (Escalation Blocked)", res2.status === 401, `Status: ${res2.status}`);

  // 3. Anonymous with ?role=shipper
  const res3 = await fetch(`${BASE_URL}/api/financial-integrity?role=shipper`);
  test("3. Anonymous with ?role=shipper (Blocked)", res3.status === 403 || res3.status === 401, `Status: ${res3.status}`);

  // 4. Authenticated Shipper Token
  const res4 = await fetch(`${BASE_URL}/api/financial-integrity`, {
    headers: { Authorization: `Bearer ${shipperToken}` },
  });
  test("4. Authenticated Shipper (403 Forbidden)", res4.status === 403, `Status: ${res4.status}`);

  // 5. Authenticated Carrier Token
  const res5 = await fetch(`${BASE_URL}/api/financial-integrity`, {
    headers: { Authorization: `Bearer ${carrierToken}` },
  });
  test("5. Authenticated Carrier (403 Forbidden)", res5.status === 403, `Status: ${res5.status}`);

  // 6. Authenticated Operator Token
  const res6 = await fetch(`${BASE_URL}/api/financial-integrity`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  const data6 = await res6.json().catch(() => ({}));
  test("6. Authenticated Operator (200 OK)", res6.status === 200 && data6.success === true, `Status: ${res6.status}, success: ${data6.success}`);

  // 7. Authenticated Admin Token
  const res7 = await fetch(`${BASE_URL}/api/financial-integrity`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data7 = await res7.json().catch(() => ({}));
  test("7. Authenticated Admin (200 OK)", res7.status === 200 && data7.success === true, `Status: ${res7.status}, success: ${data7.success}`);

  // 8. Verify No Secret Leakage in Authorized Response
  const respText = JSON.stringify(data7);
  const hasSecrets =
    respText.includes("password") ||
    respText.includes("secret") ||
    respText.includes("token") ||
    respText.includes("Bearer eyJ");
  test("8. Sensitive Secret Leakage Check", !hasSecrets, "Zero tokens, passwords or secrets exposed");

  console.log("\n================================================================================");
  console.log(`   RBAC TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (8 Test Cases)`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests();
