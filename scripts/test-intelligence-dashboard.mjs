import { analyzeWithGemini, getOfflineFallbackAnalysis, sanitizeContextForAudience } from "../src/utils/geminiService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";
import { calculateOperatingPricing } from "../src/utils/pricingService.js";
import { deriveOperationalSignals } from "../src/utils/torkSignalsService.js";

console.log("==================================================");
console.log("TORK INTELLIGENCE DASHBOARD — TEST SUITE");
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

// TEST 1: Dashboard Context & Analysis
const mockSignals = deriveOperationalSignals({
  loads: [{ id: "load-1", status: "open" }],
  bids: [{ id: "bid-1", amount: 20000, estimated_operating_cost: 25000, status: "pending" }],
  activeTransports: [{ id: "tr-1", estimated_cost: 30000, actual_cost: 34000 }],
  userDashboard: { role: "shipper" },
});

const dashboardResult = await analyzeWithGemini({
  mode: "dashboard",
  context: {
    dashboardSummary: mockSignals.summary,
    signals: mockSignals.featuredSignals,
  },
  audience: "shipper",
});

assert(dashboardResult.success === true, "Test 1: Dashboard analysis resolves success: true");
assert(typeof dashboardResult.summary === "string" && dashboardResult.summary.length > 0, "Test 1: Summary is valid non-empty string");
assert(typeof dashboardResult.pricingAssessment === "string", "Test 1: Pricing assessment is present");
assert(Array.isArray(dashboardResult.risks) && dashboardResult.risks.length > 0, "Test 1: Risks array is present and populated");
assert(Array.isArray(dashboardResult.opportunities) && dashboardResult.opportunities.length > 0, "Test 1: Opportunities array is present");
assert(Array.isArray(dashboardResult.recommendedActions) && dashboardResult.recommendedActions.length > 0, "Test 1: Recommended actions array is present");
assert(dashboardResult.assessment === "CAUTION" || dashboardResult.assessment === "HEALTHY" || dashboardResult.assessment === "RISK", "Test 1: Assessment enum is valid");

// TEST 2: Offline fallback schema validity
const fallbackResult = getOfflineFallbackAnalysis({
  mode: "dashboard",
  context: {
    dashboardSummary: mockSignals.summary,
    signals: mockSignals.featuredSignals,
  },
  audience: "shipper",
  reason: "API_KEY_NOT_CONFIGURED",
});

assert(fallbackResult.success === true, "Test 2: Fallback analysis succeeds");
assert(fallbackResult.risks.length > 0, "Test 2: Fallback generates risk items from warning signals");
assert(fallbackResult.opportunities.length > 0, "Test 2: Fallback generates opportunity items");
assert(fallbackResult.recommendedActions.length > 0, "Test 2: Fallback generates actionable recommendation items");
assert(fallbackResult.provider === "tork-rule-engine-fallback", "Test 2: Provider indicates fallback engine");

// TEST 3: TORK VERIFIED Independence
const pricing = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR" });
const audit = verifyPricingCalculation({
  inputParams: { distanceKm: 730, vehicleType: "TIR" },
  calculatedPricing: pricing,
});

assert(audit.status === "PASS", "Test 3: TORK Verified independently audits to PASS");
assert(audit.score === 100, "Test 3: TORK Verified independent score is 100/100");
assert(audit.verified === true, "Test 3: TORK Verified works identically regardless of AI status");

// TEST 4: Shipper Audience Privacy in Dashboard Context
const carrierDashboardContext = {
  dashboardSummary: mockSignals.summary,
  signals: mockSignals.featuredSignals,
  carrierCost: 35000,
  carrierProfit: 8000,
  carrierMargin: 20.0,
  bid: {
    bidAmount: 42000,
    operatingCost: 35000,
    estimatedProfit: 7000,
    estimatedMargin: 16.6,
  },
};

const sanitizedShipper = sanitizeContextForAudience(carrierDashboardContext, "shipper");
assert(sanitizedShipper.carrierCost === undefined, "Test 4: Shipper context strips carrierCost");
assert(sanitizedShipper.carrierProfit === undefined, "Test 4: Shipper context strips carrierProfit");
assert(sanitizedShipper.carrierMargin === undefined, "Test 4: Shipper context strips carrierMargin");
assert(sanitizedShipper.bid.operatingCost === undefined, "Test 4: Shipper context strips bid.operatingCost");
assert(sanitizedShipper.bid.estimatedProfit === undefined, "Test 4: Shipper context strips bid.estimatedProfit");
assert(sanitizedShipper.bid.bidAmount === 42000, "Test 4: Shipper context retains bidAmount");

// TEST 5: Carrier Audience Privacy (Carrier retains own telemetry)
const sanitizedCarrier = sanitizeContextForAudience(carrierDashboardContext, "carrier");
assert(sanitizedCarrier.carrierCost === 35000, "Test 5: Carrier context retains carrierCost");
assert(sanitizedCarrier.carrierProfit === 8000, "Test 5: Carrier context retains carrierProfit");
assert(sanitizedCarrier.bid.estimatedProfit === 7000, "Test 5: Carrier context retains bid.estimatedProfit");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
