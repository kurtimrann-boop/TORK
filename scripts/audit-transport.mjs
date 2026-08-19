import {
  createTransportEstimateSnapshot,
  calculateActualCost,
  calculateActualProfit,
  calculateActualMargin,
  compareEstimatedVsActual,
  evaluateSettlementEligibility,
} from "../src/utils/transportActualsService.js";
import { calculateOperatingPricing } from "../src/utils/pricingService.js";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

export async function runTransportAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 4: TRANSPORTS, ACTUALS & SETTLEMENT");
  console.log("==================================================");

  // 1. Generate Estimate Snapshot
  const pricing = calculateOperatingPricing({ distanceKm: 730, durationMinutes: 525, vehicleType: "TIR" });
  const bidAmount = 40000;
  const snapshot = createTransportEstimateSnapshot("tr-audit-001", pricing, bidAmount);

  assert(snapshot.transport_id === "tr-audit-001", "Snapshot has correct transport_id");
  assert(snapshot.total_operating_cost > 0, "Snapshot contains positive operating cost");
  assert(snapshot.estimated_profit > 0, "Snapshot contains positive estimated profit");

  // 2. Actuals Input & Calculation (Complete Data)
  const actualsDataComplete = {
    fuel_cost: 10200,
    driver_cost: 8500,
    toll_cost: 1250,
    maintenance_cost: 3650,
    depreciation_cost: 4380,
    waiting_cost: 500,
    special_handling_cost: 0,
    other_cost: 200,
  };

  const { totalActualCost, dataCompleteness } = calculateActualCost(actualsDataComplete);
  assert(totalActualCost > 0, "Total actual cost calculated");
  assert(dataCompleteness === "COMPLETE", "Complete actuals returns COMPLETE data quality");

  const actualProfit = calculateActualProfit(bidAmount, totalActualCost);
  const actualMargin = calculateActualMargin(bidAmount, actualProfit);

  assert(Number.isFinite(actualProfit), "Actual profit is finite");
  assert(Number.isFinite(actualMargin), "Actual margin is finite");

  // 3. Comparison & Variance Analysis
  const comparison = compareEstimatedVsActual(snapshot, actualsDataComplete, bidAmount);
  assert(comparison !== null, "compareEstimatedVsActual produces structured comparison");
  assert("costVariance" in comparison, "Cost variance computed in comparison");
  assert("profitVariance" in comparison, "Profit variance computed in comparison");
  assert("marginVariance" in comparison, "Margin variance computed in comparison");

  // 4. Incomplete Actuals Handling (Empty / Partial)
  const actualsPartial = { fuel_cost: 10200 };
  const { dataCompleteness: partialCompleteness } = calculateActualCost(actualsPartial);
  assert(partialCompleteness === "PARTIAL", "Partial actuals returns PARTIAL status");

  const actualsEmpty = {};
  const { dataCompleteness: emptyCompleteness, totalActualCost: emptyCost } = calculateActualCost(actualsEmpty);
  assert(emptyCompleteness === "EMPTY", "Empty actuals returns EMPTY status");
  assert(emptyCost === null, "Empty actuals yields null cost rather than fake zero");

  // 5. Settlement Gating (POD Required)
  const transportTest = { id: "tr-test", status: "delivered" };
  const eligibilityNoPod = evaluateSettlementEligibility(transportTest, [], true);
  assert(eligibilityNoPod.isEligible === false, "Settlement cannot be approved without verified POD document");
  assert(eligibilityNoPod.status === "pending_pod", "Eligibility status is pending_pod");

  const podDoc = { id: "doc-1", transport_id: "tr-test", document_type: "POD", verification_status: "verified" };
  const eligibilityWithPod = evaluateSettlementEligibility(transportTest, [podDoc], true);
  assert(eligibilityWithPod.isEligible === true, "Settlement is eligible for approval once POD is uploaded and verified");
  assert(eligibilityWithPod.status === "ready", "Eligibility status is ready");

  console.log(`TRANSPORT AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

if (process.argv[1].endsWith("audit-transport.mjs")) {
  runTransportAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
