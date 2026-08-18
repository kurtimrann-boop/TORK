import { deriveOperationalSignals } from "../src/utils/torkSignalsService.js";

console.log("==================================================");
console.log("TORK SIGNALS ENGINE — TEST SUITE");
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

// TEST 1: Active load signals derivation
const mockLoads = [
  { id: "load-1", origin: "Trabzon", destination: "Ankara", status: "open" },
  { id: "load-2", origin: "İstanbul", destination: "İzmir", status: "open" },
];
const res1 = deriveOperationalSignals({
  loads: mockLoads,
  userDashboard: { role: "carrier" },
});
assert(res1.summary.activeLoadsCount === 2, "Test 1: Summary counts 2 active loads");
assert(Array.isArray(res1.signals) && res1.signals.length >= 3, "Test 1: Produces standard signal categories");
assert(res1.featuredSignals.length <= 3, "Test 1: Featured signals capped at 3");

// TEST 2: Low bid signal (bid < estimated operating cost)
const mockLowBids = [
  { id: "bid-1", amount: 25000, estimated_operating_cost: 32000, status: "pending" },
];
const res2 = deriveOperationalSignals({
  loads: mockLoads,
  bids: mockLowBids,
  userDashboard: { role: "shipper" },
});
const lowBidSignal = res2.signals.find((s) => s.id === "SIG_PRICE_LOW_BID");
assert(lowBidSignal !== undefined, "Test 2: Low bid generates SIG_PRICE_LOW_BID warning");
assert(lowBidSignal && lowBidSignal.level === "WARNING", "Test 2: Low bid level is WARNING");
assert(lowBidSignal && lowBidSignal.count === 1, "Test 2: Low bid count is 1");

// TEST 3: Cost overrun signal (actualCost > estimatedCost)
const mockTransports = [
  { id: "tr-1", estimated_cost: 30000, actual_cost: 35000, status: "in_transit" },
];
const res3 = deriveOperationalSignals({
  loads: mockLoads,
  activeTransports: mockTransports,
  userDashboard: { role: "carrier" },
});
const overrunSignal = res3.signals.find((s) => s.id === "SIG_OPS_COST_OVERRUN");
assert(overrunSignal !== undefined, "Test 3: Cost overrun generates SIG_OPS_COST_OVERRUN");
assert(overrunSignal && overrunSignal.level === "WARNING", "Test 3: Cost overrun level is WARNING");

// TEST 4: Unknown / unverified toll signal
const mockTollLoads = [
  { id: "load-3", toll_status: "unavailable", status: "open" },
];
const res4 = deriveOperationalSignals({
  myLoads: mockTollLoads,
  userDashboard: { role: "shipper" },
});
const tollSignal = res4.signals.find((s) => s.id === "SIG_DATA_UNVERIFIED_TOLL");
assert(tollSignal !== undefined, "Test 4: Unverified toll generates SIG_DATA_UNVERIFIED_TOLL");

// TEST 5: Special permit / oversize signal
const mockOversizeLoads = [
  { id: "load-4", is_oversize: true, special_permit_required: true, status: "open" },
];
const res5 = deriveOperationalSignals({
  loads: mockOversizeLoads,
  userDashboard: { role: "carrier" },
});
const permitSignal = res5.signals.find((s) => s.id === "SIG_DATA_PERMIT_REQUIRED");
assert(permitSignal !== undefined, "Test 5: Oversize load generates SIG_DATA_PERMIT_REQUIRED");
assert(permitSignal && permitSignal.level === "WARNING", "Test 5: Permit requirement is WARNING level");

// TEST 6: No data empty state
const res6 = deriveOperationalSignals({
  loads: [],
  myLoads: [],
  bids: [],
  activeTransports: [],
  userDashboard: { role: "shipper" },
});
assert(res6.summary.activeLoadsCount === 0, "Test 6: Empty state has 0 active loads");
assert(res6.summary.pendingBidsCount === 0, "Test 6: Empty state has 0 pending bids");
assert(res6.summary.transportsCount === 0, "Test 6: Empty state has 0 transports");
assert(res6.signals.length >= 3, "Test 6: Produces informative standby signals when empty");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
