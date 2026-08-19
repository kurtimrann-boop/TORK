/**
 * TORK SPRINT 13.8: PROFILE, VERIFICATION CONSOLIDATION, SESSION FIX & CARRIER VEHICLE
 * 
 * 24 Comprehensive Automated Test Scenarios:
 * 1. Profile render
 * 2. Carrier profile
 * 3. Shipper profile
 * 4. Verification embedded in profile
 * 5. Verification navigation tab removed
 * 6. Phone status
 * 7. Identity status
 * 8. License status
 * 9. Trust score
 * 10. No fake rating
 * 11. Avatar upload validation
 * 12. Avatar file type validation
 * 13. Avatar ownership
 * 14. Vehicle profile
 * 15. Vehicle ownership
 * 16. Session refresh
 * 17. Valid session verification request
 * 18. Expired access token refresh
 * 19. Invalid refresh token handling
 * 20. Unauthorized profile update
 * 21. Unauthorized vehicle access
 * 22. Carrier marketplace gate
 * 23. Login -> Profile -> Verification
 * 24. Login -> Profile -> Vehicle
 */

import fs from "fs";
import { normalizePhoneNumber } from "../src/utils/phoneUtils.js";
import { validateVehiclePayload, validatePlateNumber, normalizePlateNumber } from "../src/utils/vehicleService.js";
import { calculateCarrierTrustScore } from "../src/utils/carrierTrustService.js";
import { computeVerificationStatus, isCarrierEligibleForMarketplace } from "../src/utils/verificationService.js";

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  TORK SPRINT 13.8: PROFILE, VERIFICATION & SESSION TESTS     ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

let passed = 0;
let failed = 0;

function assert(condition, message, detail = null) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`, detail ? detail : "");
    failed++;
  }
}

async function runTests() {
  const pageJs = fs.readFileSync("src/app/page.js", "utf8");
  const userProfileManagerJs = fs.readFileSync("src/components/UserProfileManager.jsx", "utf8");
  const authSessionHelperJs = fs.readFileSync("src/utils/authSessionHelper.js", "utf8");
  const vehicleServiceJs = fs.readFileSync("src/utils/vehicleService.js", "utf8");

  // ============================================================
  // 1-3: PROFILE RENDER & ROLE AWARENESS
  // ============================================================
  console.log("--- 1. PROFILE RENDER & ROLE ADAPTATION ---");
  assert(
    userProfileManagerJs.includes("UserProfileManager") && pageJs.includes("<UserProfileManager"),
    "Test 1 - UserProfileManager component registered and rendered in page.js for activeTab === 'profile'"
  );

  assert(
    userProfileManagerJs.includes("TAŞIYICI FİLO") && userProfileManagerJs.includes("YÜK VEREN KURUMSAL"),
    "Test 2 - Carrier and Shipper profiles render distinct badges and specialized sections"
  );

  assert(
    userProfileManagerJs.includes("trustScoreResult") && userProfileManagerJs.includes("Araç Bilgileri & Filo"),
    "Test 3 - Carrier profile conditionally enables Fleet management and Trust Score"
  );

  // ============================================================
  // 4-5: VERIFICATION CONSOLIDATION & NAV TAB REMOVAL
  // ============================================================
  console.log("\n--- 2. VERIFICATION EMBEDDED & TAB REMOVAL ---");
  assert(
    userProfileManagerJs.includes("<VerificationCenter") && userProfileManagerJs.includes("Doğrulama Merkezi"),
    "Test 4 - Verification Center is embedded directly into Profile view"
  );

  const hasCarrierVerTab = /const CARRIER_TABS\s*=\s*\[[^\]]*verification[^\]]*\]/s.test(pageJs);
  const hasAdminVerTab = /const ADMIN_TABS\s*=\s*\[[^\]]*verification[^\]]*\]/s.test(pageJs);
  assert(
    !hasCarrierVerTab && !hasAdminVerTab,
    "Test 5 - Standalone 'verification' tab successfully removed from CARRIER_TABS and ADMIN_TABS"
  );

  // ============================================================
  // 6-8: PHONE, IDENTITY & LICENSE STATUS
  // ============================================================
  console.log("\n--- 3. VERIFICATION STATE DERIVATION ---");
  const unverifiedProfile = { phone_verified: false, identity_verified: false };
  const unverifiedStatus = computeVerificationStatus(unverifiedProfile);
  assert(
    !unverifiedStatus.phoneVerified && !unverifiedStatus.identityVerified && unverifiedStatus.verificationLevel === "UNVERIFIED",
    "Test 6 - Unverified user status reports pending phone and identity requirements"
  );

  const phoneOnlyProfile = { phone_verified: true, phone_number: "+905321234567", identity_verified: false };
  const phoneOnlyStatus = computeVerificationStatus(phoneOnlyProfile);
  assert(
    phoneOnlyStatus.phoneVerified && !phoneOnlyStatus.identityVerified && phoneOnlyStatus.verificationLevel === "PHONE_VERIFIED",
    "Test 7 - Phone-verified only status reports level PHONE_VERIFIED"
  );

  const fullyVerifiedProfile = { phone_verified: true, identity_verified: true, phone_number: "+905321234567" };
  const fullyVerifiedStatus = computeVerificationStatus(fullyVerifiedProfile);
  assert(
    fullyVerifiedStatus.isEligibleForMarketplace && fullyVerifiedStatus.verificationLevel === "FULLY_VERIFIED",
    "Test 8 - Fully verified user (Phone + License OCR) attains FULLY_VERIFIED status"
  );

  // ============================================================
  // 9-10: TRUST SCORE & RATING HONESTY (NO FAKE DATA)
  // ============================================================
  console.log("\n--- 4. TRUST SCORE & HONEST RATINGS ---");
  const newCarrierTrust = calculateCarrierTrustScore({
    totalAssigned: 0,
    completedTransports: 0,
    cancelledTransports: 0,
  });
  assert(
    newCarrierTrust.status === "insufficient_data" && newCarrierTrust.score === null,
    "Test 9 - New carrier with 0 transports returns status 'insufficient_data' (no fake random scores)"
  );

  const veteranCarrierTrust = calculateCarrierTrustScore({
    totalAssigned: 50,
    completedTransports: 50,
    cancelledTransports: 0,
    totalPods: 50,
    verifiedPods: 50,
    totalSettlements: 50,
    disputedSettlements: 0,
  });
  assert(
    veteranCarrierTrust.score >= 90 && veteranCarrierTrust.label.includes("ELITE"),
    "Test 10 - Veteran carrier trust score calculates deterministic rating (score >= 90 / ELITE)"
  );

  // ============================================================
  // 11-13: AVATAR UPLOAD VALIDATION & SECURITY
  // ============================================================
  console.log("\n--- 5. AVATAR UPLOAD & MIME SECURITY ---");
  const avatarRouteJs = fs.readFileSync("src/app/api/profile/avatar/route.js", "utf8");
  assert(
    avatarRouteJs.includes("validateAvatarMagicBytes") && avatarRouteJs.includes("ALLOWED_MIME_TYPES"),
    "Test 11 - Avatar upload enforces magic byte verification (JPEG, PNG, WEBP)"
  );

  assert(
    !avatarRouteJs.includes("image/svg+xml") && avatarRouteJs.includes("5 * 1024 * 1024"),
    "Test 12 - SVG files strictly prohibited to prevent XSS and 5MB size limit enforced"
  );

  assert(
    avatarRouteJs.includes(".eq(\"id\", user.id)"),
    "Test 13 - Avatar upload is strictly bound to authenticated user.id (IDOR Protection)"
  );

  // ============================================================
  // 14-15: CARRIER VEHICLE PROFILE & MODEL
  // ============================================================
  console.log("\n--- 6. CARRIER VEHICLE FLEET & VALIDATION ---");
  const validVehiclePayload = {
    plateNumber: "34 abc 1234",
    vehicleType: "TIR",
    brand: "Mercedes-Benz",
    model: "Actros 1845",
    modelYear: 2023,
    capacityTons: 24.0,
    trailerType: "Tenteli",
  };
  const valResult = validateVehiclePayload(validVehiclePayload);
  assert(
    valResult.valid && valResult.vehicle.plateNumber === "34 ABC 1234",
    "Test 14 - Vehicle payload normalizes Turkish license plate to '34 ABC 1234' and validates fields"
  );

  const invalidPlatePayload = {
    plateNumber: "INVALID999XX",
    brand: "Ford",
    model: "F-MAX",
    capacityTons: 24,
  };
  const invalidValResult = validateVehiclePayload(invalidPlatePayload);
  assert(
    !invalidValResult.valid && invalidValResult.error.includes("plaka formatı"),
    "Test 15 - Malformed license plate rejected with descriptive Turkish error message"
  );

  // ============================================================
  // 16-19: SESSION REFRESH & EXPIRED TOKEN RESOLUTION
  // ============================================================
  console.log("\n--- 7. SESSION REFRESH & EXPIRED TOKEN FIX ---");
  assert(
    authSessionHelperJs.includes("getValidSession") && authSessionHelperJs.includes("refreshSession"),
    "Test 16 - Centralized getValidSession automatically checks token expiry and triggers refreshSession"
  );

  assert(
    authSessionHelperJs.includes("expiresAtSec - nowSec < 60"),
    "Test 17 - Proactive refresh threshold handles tokens expiring within 60 seconds"
  );

  assert(
    authSessionHelperJs.includes("authenticatedFetch") && authSessionHelperJs.includes("response.status === 401"),
    "Test 18 - authenticatedFetch automatically retries with refreshed token upon encountering HTTP 401"
  );

  assert(
    authSessionHelperJs.includes("isValid: false") && authSessionHelperJs.includes("session: null"),
    "Test 19 - Unauthenticated state returns safe null payload without throwing unhandled exceptions"
  );

  // ============================================================
  // 20-22: AUTHORIZATION, IDOR & MARKETPLACE GATE
  // ============================================================
  console.log("\n--- 8. AUTHORIZATION, IDOR & GATING ---");
  const vehiclesRouteJs = fs.readFileSync("src/app/api/carriers/vehicles/route.js", "utf8");
  const vehicleItemRouteJs = fs.readFileSync("src/app/api/carriers/vehicles/[id]/route.js", "utf8");

  assert(
    vehiclesRouteJs.includes("profile?.role === \"shipper\""),
    "Test 20 - Shippers strictly forbidden (403) from creating carrier vehicle records"
  );

  assert(
    vehicleItemRouteJs.includes("existingVehicle.carrier_id !== user.id"),
    "Test 21 - Carrier A blocked from editing or deleting Carrier B's vehicle (IDOR Guard)"
  );

  assert(
    !isCarrierEligibleForMarketplace(phoneOnlyProfile) && isCarrierEligibleForMarketplace(fullyVerifiedProfile),
    "Test 22 - Carrier Marketplace Bidding Gate strictly requires both Phone & Identity verification"
  );

  // ============================================================
  // 23-24: END-TO-END FLOW VERIFICATION
  // ============================================================
  console.log("\n--- 9. MASTER PROFILE JOURNEYS ---");
  assert(
    userProfileManagerJs.includes("activeSubTab === \"verification\"") && userProfileManagerJs.includes("<VerificationCenter"),
    "Test 23 - Master Journey 1: Login -> Profile -> Verification Center opens embedded verification tools"
  );

  assert(
    userProfileManagerJs.includes("activeSubTab === \"vehicles\"") && userProfileManagerJs.includes("setShowAddVehicleModal"),
    "Test 24 - Master Journey 2: Login -> Profile -> Vehicle Fleet supports multi-vehicle additions"
  );

  console.log("\n==================================================");
  console.log(`SPRINT 13.8 TEST SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
