import { sanitizeContextForAudience, getOfflineFallbackAnalysis, analyzeWithGemini } from "../src/utils/geminiService.js";

console.log("==================================================");
console.log("GEMINI SERVICE & PRIVACY — TEST SUITE");
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

// TEST 1: Privacy Sanitization for Shipper
const fullCarrierContext = {
  route: { distanceKm: 730, durationHours: 8.8 },
  pricing: {
    totals: { totalOperatingCost: 30813 },
    pricingBands: { recommended: { price: 36250 } }
  },
  carrierCost: 30813,
  carrierProfit: 9187,
  carrierMargin: 23.0,
  bid: {
    bidAmount: 40000,
    operatingCost: 30813,
    estimatedProfit: 9187,
    estimatedMargin: 23.0
  },
  financials: {
    projectedProfit: 9187,
    marginPercent: 23.0
  }
};

const shipperContext = sanitizeContextForAudience(fullCarrierContext, "shipper");
assert(shipperContext.carrierCost === undefined, "Test 1: Shipper context has no carrierCost");
assert(shipperContext.carrierProfit === undefined, "Test 1: Shipper context has no carrierProfit");
assert(shipperContext.carrierMargin === undefined, "Test 1: Shipper context has no carrierMargin");
assert(shipperContext.bid.operatingCost === undefined, "Test 1: Shipper context bid has no operatingCost");
assert(shipperContext.bid.estimatedProfit === undefined, "Test 1: Shipper context bid has no estimatedProfit");
assert(shipperContext.bid.bidAmount === 40000, "Test 1: Shipper context retains bidAmount");

// TEST 2: Carrier Audience retains own financials
const carrierContext = sanitizeContextForAudience(fullCarrierContext, "carrier");
assert(carrierContext.carrierCost === 30813, "Test 2: Carrier context retains carrierCost");
assert(carrierContext.carrierProfit === 9187, "Test 2: Carrier context retains carrierProfit");
assert(carrierContext.bid.estimatedProfit === 9187, "Test 2: Carrier context retains bid.estimatedProfit");

// TEST 3: Structured Offline Fallback Schema
const fallbackResult = getOfflineFallbackAnalysis({
  mode: "audit",
  context: shipperContext,
  audience: "shipper",
  reason: "API_KEY_NOT_CONFIGURED"
});

assert(fallbackResult.success === true, "Test 3: Fallback success is true");
assert(typeof fallbackResult.summary === "string" && fallbackResult.summary.length > 0, "Test 3: Summary is valid string");
assert(Array.isArray(fallbackResult.findings), "Test 3: Findings is an array");
assert(Array.isArray(fallbackResult.recommendations), "Test 3: Recommendations is an array");
assert(fallbackResult.confidence === "MEDIUM" || fallbackResult.confidence === "HIGH", "Test 3: Confidence level set");
assert(fallbackResult.provider.length > 0, "Test 3: Provider identifier present");

// TEST 4: analyzeWithGemini graceful resolution
const liveOrFallbackAnalysis = await analyzeWithGemini({
  mode: "audit",
  context: shipperContext,
  audience: "shipper"
});

assert(liveOrFallbackAnalysis.success === true, "Test 4: analyzeWithGemini resolves with success: true");
assert(liveOrFallbackAnalysis.findings.length > 0, "Test 4: analyzeWithGemini returns structured findings");
assert(liveOrFallbackAnalysis.recommendations.length > 0, "Test 4: analyzeWithGemini returns recommendations");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
