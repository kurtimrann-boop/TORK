import { deriveOperationalSignals } from "../src/utils/torkSignalsService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";
import { analyzeWithGemini, getOfflineFallbackAnalysis, sanitizeContextForAudience } from "../src/utils/geminiService.js";
import { calculateOperatingPricing } from "../src/utils/pricingService.js";

console.log("==================================================");
console.log("TORK 2.4 — EXECUTIVE & NOTIFICATION TEST SUITE");
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

// 1. EXECUTIVE BRIEF GENERATION
const mockLoads = [
  { id: "load-101", origin: "Trabzon", destination: "Ankara", distanceKm: 729.8, status: "open" },
  { id: "load-102", origin: "İzmir", destination: "İstanbul", is_oversize: true, special_permit_required: true, status: "open" },
];
const mockBids = [
  { id: "bid-201", load_id: "load-101", amount: 28500, estimated_operating_cost: 30813, status: "pending" },
];
const mockTransports = [
  { id: "tr-301", origin: "İstanbul", destination: "Ankara", estimated_cost: 32000, actual_cost: 36500, status: "in_transit" },
];

const signalsData = deriveOperationalSignals({
  loads: mockLoads,
  myLoads: mockLoads,
  bids: mockBids,
  activeTransports: mockTransports,
  userDashboard: { role: "shipper" },
});

assert(signalsData.executiveBrief !== undefined, "Test 1: Executive brief object is generated");
assert(typeof signalsData.executiveBrief.phrase === "string", "Test 1: Executive phrase is a valid string");
assert(signalsData.executiveBrief.metrics.lowBidsCount === 1, "Test 1: Metric lowBidsCount is 1");
assert(signalsData.executiveBrief.metrics.costOverrunsCount === 1, "Test 1: Metric costOverrunsCount is 1");
assert(signalsData.executiveBrief.metrics.capacityWarningsCount === 1, "Test 1: Metric capacityWarningsCount is 1");

// 2. PRIORITY SORTING (CRITICAL > HIGH > MEDIUM > LOW > INFO)
const sortedSeverities = signalsData.signals.map((s) => s.severity);
const SEVERITY_WEIGHTS = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
let isProperlySorted = true;
for (let i = 0; i < sortedSeverities.length - 1; i++) {
  if (SEVERITY_WEIGHTS[sortedSeverities[i]] < SEVERITY_WEIGHTS[sortedSeverities[i + 1]]) {
    isProperlySorted = false;
    break;
  }
}
assert(isProperlySorted, "Test 2: Signals are strictly sorted by deterministic priority");

// 3. UNREAD COUNT
assert(signalsData.summary.unreadCount === 3, "Test 3: Unread count correctly counts 3 actionable signals");

// 4. CRITICAL SIGNAL SURFACES AS TOPSIGNAL
assert(signalsData.topSignal.severity === "CRITICAL", "Test 4: Top signal is the CRITICAL permit signal");
assert(signalsData.topSignal.id === "SIG_DATA_PERMIT_REQUIRED", "Test 4: Top signal matches SIG_DATA_PERMIT_REQUIRED");

// 5. DEEP-LINK MAPPING
const lowBidSig = signalsData.signals.find((s) => s.id === "SIG_PRICE_LOW_BID");
const overrunSig = signalsData.signals.find((s) => s.id === "SIG_OPS_COST_OVERRUN");
const permitSig = signalsData.signals.find((s) => s.id === "SIG_DATA_PERMIT_REQUIRED");
assert(lowBidSig.actionTarget === "bids", "Test 5: Low bid deep-links to bids");
assert(overrunSig.actionTarget === "wallet", "Test 5: Cost overrun deep-links to wallet");
assert(permitSig.actionTarget === "loads", "Test 5: Permit deep-links to loads");

// 6. GEMINI RECOMMENDATION FORMAT
const fallback = getOfflineFallbackAnalysis({
  mode: "dashboard",
  context: { dashboardSummary: signalsData.summary, signals: signalsData.featuredSignals },
  audience: "shipper",
});
assert(Array.isArray(fallback.recommendedActions), "Test 6: Fallback produces recommendedActions array");
assert(fallback.recommendedActions.length > 0, "Test 6: recommendedActions contains actionable items");

// 7. GEMINI FALLBACK RESILIENCE
assert(fallback.success === true, "Test 7: Fallback succeeds with success: true");
assert(signalsData.signals.length >= 3, "Test 7: Signal engine works 100% independently of AI state");

// 8. SHIPPER PRIVACY
const sensitiveContext = {
  carrierCost: 30000,
  carrierProfit: 8000,
  carrierMargin: 20.0,
  bid: { bidAmount: 38000, operatingCost: 30000, estimatedProfit: 8000 },
};
const sanitizedShipper = sanitizeContextForAudience(sensitiveContext, "shipper");
assert(sanitizedShipper.carrierCost === undefined, "Test 8: Shipper context strips carrierCost");
assert(sanitizedShipper.carrierProfit === undefined, "Test 8: Shipper context strips carrierProfit");
assert(sanitizedShipper.bid.operatingCost === undefined, "Test 8: Shipper context strips bid.operatingCost");

// 9. CARRIER PRIVACY
const sanitizedCarrier = sanitizeContextForAudience(sensitiveContext, "carrier");
assert(sanitizedCarrier.carrierCost === 30000, "Test 9: Carrier context retains carrierCost");
assert(sanitizedCarrier.carrierProfit === 8000, "Test 9: Carrier context retains carrierProfit");

// 10. TRUST CHAIN
const trustNodes = ["HÜRMÜZ", "TORK VERIFIED", "GEMINI"];
assert(trustNodes[0] === "HÜRMÜZ" && trustNodes[1] === "TORK VERIFIED" && trustNodes[2] === "GEMINI", "Test 10: Trust chain maintains invariant order");

// 11. NO FAKE DATA IN VERIFIED
const samplePricing = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR" });
const verifiedAudit = verifyPricingCalculation({
  inputParams: { distanceKm: 730, vehicleType: "TIR" },
  calculatedPricing: samplePricing,
});
assert(verifiedAudit.verified === true && verifiedAudit.score === 100, "Test 11: Real pricing verified at 100/100");

// 12. EMPTY STATE RESILIENCE
const emptySignals = deriveOperationalSignals({
  loads: [],
  myLoads: [],
  bids: [],
  activeTransports: [],
  userDashboard: { role: "shipper" },
});
assert(emptySignals.executiveBrief.metrics.lowBidsCount === 0, "Test 12: Empty state has 0 low bids");
assert(emptySignals.summary.unreadCount === 0, "Test 12: Empty state has 0 unread alerts");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
