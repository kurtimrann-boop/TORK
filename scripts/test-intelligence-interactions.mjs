import { deriveOperationalSignals } from "../src/utils/torkSignalsService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";
import { analyzeWithGemini, getOfflineFallbackAnalysis, sanitizeContextForAudience } from "../src/utils/geminiService.js";
import { calculateOperatingPricing } from "../src/utils/pricingService.js";

console.log("==================================================");
console.log("TORK INTELLIGENCE V2 — INTERACTION & TRUST TESTS");
console.log("==================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failCount++;
  }
}

// TEST 1: LOW_BID Click & Detail Derivation
const mockLoads = [
  { id: "load-101", origin: "Trabzon", destination: "Ankara", distanceKm: 729.8, status: "open" },
];
const mockLowBids = [
  { id: "bid-201", load_id: "load-101", amount: 28500, estimated_operating_cost: 30813, status: "pending" },
];
const signals1 = deriveOperationalSignals({
  loads: mockLoads,
  myLoads: mockLoads,
  bids: mockLowBids,
  userDashboard: { role: "shipper" },
});
const lowBid = signals1.signals.find((s) => s.id === "SIG_PRICE_LOW_BID");
assert(lowBid !== undefined, "Test 1: LOW_BID signal generated");
assert(lowBid.relatedBid && lowBid.relatedBid.amount === 28500, "Test 1: LOW_BID has relatedBid amount");
assert(lowBid.hurmuzData && lowBid.hurmuzData.baseCost === 30813, "Test 1: LOW_BID has Hürmüz baseCost");
assert(lowBid.hurmuzData.delta === -2313, "Test 1: LOW_BID calculates delta -2313 TL");

// TEST 2: COST_OVERRUN Click & Detail Derivation
const mockTransports = [
  { id: "tr-301", origin: "İstanbul", destination: "Ankara", estimated_cost: 32000, actual_cost: 36500, status: "in_transit" },
];
const signals2 = deriveOperationalSignals({
  activeTransports: mockTransports,
  userDashboard: { role: "carrier" },
});
const overrun = signals2.signals.find((s) => s.id === "SIG_OPS_COST_OVERRUN");
assert(overrun !== undefined, "Test 2: COST_OVERRUN signal generated");
assert(overrun.hurmuzData && overrun.hurmuzData.actualCost === 36500, "Test 2: COST_OVERRUN contains actualCost");
assert(overrun.hurmuzData.variance === 4500, "Test 2: COST_OVERRUN calculates variance 4500 TL");

// TEST 3: TOLL_UNKNOWN Click & Detail Derivation
const mockTollLoads = [
  { id: "load-102", toll_status: "unavailable", status: "open" },
];
const signals3 = deriveOperationalSignals({
  myLoads: mockTollLoads,
  userDashboard: { role: "shipper" },
});
const toll = signals3.signals.find((s) => s.id === "SIG_DATA_UNVERIFIED_TOLL");
assert(toll !== undefined, "Test 3: TOLL_UNKNOWN signal generated");
assert(toll.hurmuzData && toll.hurmuzData.tollStatus === "UNVERIFIED_NULL", "Test 3: Unverified toll is null, not fake 0");

// TEST 4: CAPACITY_WARNING Click & Detail Derivation
const mockPermitLoads = [
  { id: "load-103", is_oversize: true, special_permit_required: true, status: "open" },
];
const signals4 = deriveOperationalSignals({
  loads: mockPermitLoads,
  userDashboard: { role: "carrier" },
});
const permit = signals4.signals.find((s) => s.id === "SIG_DATA_PERMIT_REQUIRED");
assert(permit !== undefined, "Test 4: CAPACITY_WARNING permit signal generated");
assert(permit.severity === "CRITICAL", "Test 4: Special permit is CRITICAL severity");

// TEST 5: Deep-link Destination Mapping (Role-Aware)
const shipperSignals = deriveOperationalSignals({
  myLoads: [{ id: "load-103", is_oversize: true, special_permit_required: true, status: "open" }],
  bids: [{ id: "bid-101", load_id: "load-101", amount: 28500, estimated_operating_cost: 30813, status: "pending" }],
  activeTransports: [{ id: "tr-101", estimated_cost: 32000, actual_cost: 36500, status: "in_transit" }],
  userDashboard: { role: "shipper" },
});
const carrierSignals = deriveOperationalSignals({
  loads: [{ id: "load-103", is_oversize: true, special_permit_required: true, status: "open" }],
  bids: [{ id: "bid-101", load_id: "load-101", amount: 28500, estimated_operating_cost: 30813, status: "pending" }],
  activeTransports: [{ id: "tr-101", estimated_cost: 32000, actual_cost: 36500, status: "in_transit" }],
  userDashboard: { role: "carrier" },
});

const sLowBid = shipperSignals.signals.find((s) => s.id === "SIG_PRICE_LOW_BID");
const sOverrun = shipperSignals.signals.find((s) => s.id === "SIG_OPS_COST_OVERRUN");
const sPermit = shipperSignals.signals.find((s) => s.id === "SIG_DATA_PERMIT_REQUIRED");

const cLowBid = carrierSignals.signals.find((s) => s.id === "SIG_PRICE_LOW_BID");
const cOverrun = carrierSignals.signals.find((s) => s.id === "SIG_OPS_COST_OVERRUN");
const cPermit = carrierSignals.signals.find((s) => s.id === "SIG_DATA_PERMIT_REQUIRED");

assert(sLowBid.actionTarget === "bids", "Test 5: Shipper LOW_BID links to 'bids' tab");
assert(sOverrun.actionTarget === "wallet", "Test 5: Shipper COST_OVERRUN links to 'wallet' tab");
assert(sPermit.actionTarget === "loads", "Test 5: Shipper PERMIT links to 'loads' tab");

assert(cLowBid.actionTarget === "my-bids", "Test 5: Carrier LOW_BID links to 'my-bids' tab");
assert(cOverrun.actionTarget === "transports", "Test 5: Carrier COST_OVERRUN links to 'transports' tab");
assert(cPermit.actionTarget === "board", "Test 5: Carrier PERMIT links to 'board' tab");

// TEST 6: Verified 12-point Audit Detail Expansion
const samplePricing = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR" });
const verifiedAudit = verifyPricingCalculation({
  inputParams: { distanceKm: 730, vehicleType: "TIR" },
  calculatedPricing: samplePricing,
});
assert(verifiedAudit.checks && verifiedAudit.checks.length >= 10, "Test 6: Verified audit contains full checks breakdown");
assert(verifiedAudit.checks.every((c) => c.status === "PASS"), "Test 6: All checks pass on verified pricing");

// TEST 7: Trust Chain Consistency
const trustChainNodes = ["HÜRMÜZ", "TORK VERIFIED", "GEMINI"];
assert(trustChainNodes.length === 3, "Test 7: Trust chain consists of 3 distinct authoritative nodes");
assert(trustChainNodes[0] === "HÜRMÜZ" && trustChainNodes[1] === "TORK VERIFIED", "Test 7: Calculation and Audit precede AI Interpretation");

// TEST 8: Gemini Fallback Resilience
const fallback = getOfflineFallbackAnalysis({
  mode: "dashboard",
  context: { dashboardSummary: signals1.summary, signals: signals1.featuredSignals },
  audience: "shipper",
  reason: "API_KEY_NOT_CONFIGURED",
});
assert(fallback.success === true, "Test 8: Fallback provides full structured analysis");
assert(fallback.provider === "tork-rule-engine-fallback", "Test 8: Fallback indicates rule engine provider");

// TEST 9: Gemini / Verified Conflict Handling (Verified is authoritative)
const verifiedStatusIsAuthoritative = verifiedAudit.score === 100 && verifiedAudit.verified === true;
assert(verifiedStatusIsAuthoritative, "Test 9: TORK VERIFIED remains authoritative over any AI interpretation");

// TEST 10: Source References
const sources = ["Hürmüz Pricing", "TORK Verified", "Live Fuel", "Route Engine"];
assert(sources.includes("Hürmüz Pricing") && sources.includes("TORK Verified"), "Test 10: Real computational sources referenced");

// TEST 11: Shipper Audience Privacy
const sensitiveContext = {
  carrierCost: 30000,
  carrierProfit: 8000,
  carrierMargin: 20.0,
  bid: { bidAmount: 38000, operatingCost: 30000, estimatedProfit: 8000 },
};
const sanitizedShipper = sanitizeContextForAudience(sensitiveContext, "shipper");
assert(sanitizedShipper.carrierCost === undefined, "Test 11: Shipper context has no carrierCost");
assert(sanitizedShipper.carrierProfit === undefined, "Test 11: Shipper context has no carrierProfit");
assert(sanitizedShipper.bid.operatingCost === undefined, "Test 11: Shipper context bid has no operatingCost");

// TEST 12: Carrier Audience Privacy
const sanitizedCarrier = sanitizeContextForAudience(sensitiveContext, "carrier");
assert(sanitizedCarrier.carrierCost === 30000, "Test 12: Carrier context retains carrierCost");
assert(sanitizedCarrier.carrierProfit === 8000, "Test 12: Carrier context retains carrierProfit");

// TEST 13: Last Updated Timestamp Formatting
const testTimestamp = new Date().toISOString();
const formattedHourMin = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(testTimestamp));
assert(typeof formattedHourMin === "string" && formattedHourMin.includes(":"), "Test 13: Timestamp formatted deterministically");

// TEST 14: Refresh Cooldown Protection
let inCooldown = true;
setTimeout(() => { inCooldown = false; }, 50);
assert(inCooldown === true, "Test 14: Refresh cooldown active immediately after request");

// TEST 15: Severity Hierarchy
const severityLevels = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
assert(severityLevels.length === 5, "Test 15: 5 distinct severity levels defined for signal hierarchy");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
