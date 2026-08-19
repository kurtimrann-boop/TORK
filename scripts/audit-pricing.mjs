import {
  calculateOperatingPricing,
  evaluateBudgetAlignment,
  evaluateCarrierBid,
  PRICING_VEHICLE_CONFIG,
} from "../src/utils/pricingService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";

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

export async function runPricingAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 2: HÜRMÜZ PRICING & TORK VERIFIED");
  console.log("==================================================");

  // 1. Standard TIR Route (730 km, 525 min)
  const inputParams = {
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
  };
  const tirPricing = calculateOperatingPricing(inputParams);

  assert(tirPricing !== null, "Hürmüz TIR calculation returns non-null result");
  assert(Number.isFinite(tirPricing.totals.totalOperatingCost), "Total operating cost is finite number");
  assert(!Number.isNaN(tirPricing.totals.totalOperatingCost), "Total operating cost is not NaN");
  assert(tirPricing.totals.totalOperatingCost > 0, "Total operating cost is strictly positive");

  // Verify component summation
  const fuel = tirPricing.breakdown.route.fuel.rawCost;
  const driver = tirPricing.breakdown.route.driver.cost;
  const toll = tirPricing.breakdown.route.toll.cost;
  const maintenance = tirPricing.breakdown.route.maintenance.cost;
  const depreciation = tirPricing.breakdown.route.depreciation.cost;
  const overhead = tirPricing.breakdown.overhead.cost;
  const sumDirect = fuel + driver + toll + maintenance + depreciation;

  assert(Math.abs(tirPricing.breakdown.route.subtotal - sumDirect) <= 1, "Direct subtotal equals exact sum of direct costs");
  assert(Math.abs(tirPricing.totals.totalOperatingCost - (sumDirect + overhead)) <= 1, "Total operating cost equals direct + overhead");

  // Verify Pricing Bands
  assert(tirPricing.pricingBands.minimum.price > tirPricing.totals.totalOperatingCost, "Minimum band > total cost");
  assert(tirPricing.pricingBands.recommended.price > tirPricing.pricingBands.minimum.price, "Recommended band > minimum band");
  assert(tirPricing.pricingBands.premium.price > tirPricing.pricingBands.recommended.price, "Premium band > recommended band");

  // 2. Round Trip Mode
  const roundTripPricing = calculateOperatingPricing({
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
    isRoundTrip: true,
    returnBufferPercent: 15,
  });

  assert(roundTripPricing.route.isRoundTrip === true, "Round-trip flag preserved");
  assert(roundTripPricing.totals.totalOperatingCost > tirPricing.totals.totalOperatingCost * 1.8, "Round-trip cost scales proportionally with distance");

  // 3. Custom Consumption Input
  const customPricing = calculateOperatingPricing({
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
    customConsumption: 38,
  });

  assert(customPricing.breakdown.route.fuel.consumptionPer100Km === 38, "Custom fuel consumption (38 L/100km) respected");
  assert(customPricing.breakdown.route.fuel.rawCost > tirPricing.breakdown.route.fuel.rawCost, "Higher fuel consumption yields higher fuel cost");

  // 4. Vehicle Profile Switching
  const vehicles = ["TIR", "KIRKAYAK", "KAMYON", "KAMYONET"];
  for (const v of vehicles) {
    const p = calculateOperatingPricing({ distanceKm: 500, durationMinutes: 400, vehicleType: v });
    assert(p && p.totals.totalOperatingCost > 0, `Pricing calculation functional for vehicle: ${v}`);
  }

  // 5. TORK Verified Audit
  const verifiedAudit = verifyPricingCalculation({ inputParams, calculatedPricing: tirPricing });
  assert(verifiedAudit.status === "PASS", "Standard Hürmüz calculation receives TORK Verified PASS status");
  assert(verifiedAudit.score === 100, "Standard calculation achieves 100/100 audit score");
  assert(verifiedAudit.checks && verifiedAudit.checks.length >= 6, "TORK Verified executes all comprehensive sub-checks");

  // 6. Carrier Smart Bidding Evaluation
  const carrierEval = evaluateCarrierBid(tirPricing.pricingBands.recommended.price, tirPricing);
  assert(carrierEval.estimatedProfit > 0, "Recommended bid produces positive estimated profit");
  assert(carrierEval.marginPercent > 0, "Recommended bid produces positive margin percentage");
  assert(carrierEval.quality === "HEALTHY", "Recommended bid achieves HEALTHY margin quality");

  // Below Cost Evaluation
  const lossEval = evaluateCarrierBid(tirPricing.totals.totalOperatingCost - 5000, tirPricing);
  assert(lossEval.estimatedProfit < 0, "Below cost bid evaluates negative profit");
  assert(lossEval.quality === "LOSS", "Below cost bid receives LOSS risk flag");

  console.log(`PRICING AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

if (process.argv[1].endsWith("audit-pricing.mjs")) {
  runPricingAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
