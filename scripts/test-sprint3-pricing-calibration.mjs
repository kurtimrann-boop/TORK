/**
 * TORK — Sprint 3: Intelligent Freight Pricing Calibration Test Suite
 * 
 * Tests all 22 required pricing scenarios:
 *  1. İstanbul -> Ankara (450 km, TIR, 24t, one-way)
 *  2. Ankara -> Konya (260 km, TIR, 24t, one-way)
 *  3. İstanbul -> İzmir (480 km, TIR, 24t, one-way)
 *  4. Short Route (100 km, TIR, 24t) - No overinflation
 *  5. Long Route (900 km, TIR, 24t) - Realistic linear scaling
 *  6. Round Trip - Distance, fuel, driver, toll scale without double counting permits
 *  7. Toll Unavailable - Explicitly null / unavailable, not fake ₺0
 *  8. ADR Load - Verifiable requirement without arbitrary % multipliers
 *  9. Refrigerated Load - Verifiable requirement without arbitrary % multipliers
 * 10. Oversize Load - KGM official permit fee added once
 * 11. Sanity Check - Passes on clean inputs
 * 12. Sanity Check - Flags zero/negative distance
 * 13. Sanity Check - Flags impossible fuel consumption
 * 14. Sanity Check - Flags recommended price below operating cost
 * 15. Sanity Check - Flags broken pricing band monotonicity
 * 16. Cost Layer Breakdown - Category sum equals totalOperatingCost exactly
 * 17. Pricing Bands - Minimum <= Recommended <= Premium monotonicity
 * 18. Marketplace Signals - priceFloor, recommendedPrice, priceCeiling, carrierProfit
 * 19. Custom Consumption - Overrides base consumption with weight-aware scaling
 * 20. TORK Verified Audit - 100/100 score on calibrated pricing
 * 21. Budget Alignment Evaluation - Correctly classifies BELOW_COST, OPTIMAL, PREMIUM
 * 22. Carrier Smart Bidding Evaluation - Correctly classifies LOSS, LOW_MARGIN, HEALTHY
 */

import {
  calculateOperatingPricing,
  validatePricingSanity,
  evaluateBudgetAlignment,
  evaluateCarrierBid,
  calculateWeightAdjustedConsumption,
  OFFICIAL_SOURCES,
} from "../src/utils/pricingService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  TORK SPRINT 3: INTELLIGENT FREIGHT PRICING CALIBRATION      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message, errorDetail = null) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`, errorDetail ? errorDetail : "");
      failed++;
    }
  }

  // ============================================================
  // PART 1: CANONICAL ROUTE SCENARIOS
  // ============================================================
  console.log("--- PART 1: CANONICAL ROUTE SCENARIOS ---");

  // Scenario 1: İstanbul -> Ankara (450 km, TIR, 24 ton, one-way)
  const p1 = calculateOperatingPricing({
    distanceKm: 450,
    vehicleType: "TIR",
    loadProfile: { tonnage: 24, loadType: "STANDARD_DRY" },
    fuelPricePerLiter: 78.54,
  });
  assert(
    p1 && p1.totals.totalOperatingCost > 15000 && p1.totals.totalOperatingCost < 30000 && p1.pricingBands.recommended.price > p1.totals.totalOperatingCost,
    "Test 1: İstanbul -> Ankara (450 km, 24t TIR) produces balanced operating cost & recommended freight",
    p1?.totals
  );

  // Scenario 2: Ankara -> Konya (260 km, TIR, 24 ton, one-way)
  const p2 = calculateOperatingPricing({
    distanceKm: 260,
    vehicleType: "TIR",
    loadProfile: { tonnage: 24, loadType: "STANDARD_DRY" },
    fuelPricePerLiter: 78.54,
  });
  assert(
    p2 && p2.totals.totalOperatingCost > 8000 && p2.totals.totalOperatingCost < 18000,
    "Test 2: Ankara -> Konya (260 km, 24t TIR) operating cost is realistic & proportional",
    p2?.totals
  );

  // Scenario 3: İstanbul -> İzmir (480 km, TIR, 24 ton, one-way)
  const p3 = calculateOperatingPricing({
    distanceKm: 480,
    vehicleType: "TIR",
    loadProfile: { tonnage: 24, loadType: "STANDARD_DRY" },
    fuelPricePerLiter: 78.54,
  });
  assert(
    p3 && p3.totals.totalOperatingCost > p1.totals.totalOperatingCost,
    "Test 3: İstanbul -> İzmir (480 km) scales naturally above 450 km route",
    { p1Cost: p1.totals.totalOperatingCost, p3Cost: p3.totals.totalOperatingCost }
  );

  // Scenario 4: Kısa Rota (100 km, TIR, 24 ton) - Short route not overinflated
  const p4 = calculateOperatingPricing({
    distanceKm: 100,
    vehicleType: "TIR",
    loadProfile: { tonnage: 24, loadType: "STANDARD_DRY" },
    fuelPricePerLiter: 78.54,
  });
  assert(
    p4 && p4.totals.unitCostPerKm < 60 && p4.totals.totalOperatingCost < 6000,
    "Test 4: Short Route (100 km) avoids arbitrary overinflation (unit cost < ₺60/km)",
    { unitCost: p4?.totals?.unitCostPerKm, totalCost: p4?.totals?.totalOperatingCost }
  );

  // Scenario 5: Uzun Rota (900 km, TIR, 24 ton) - Linear and realistic scaling
  const p5 = calculateOperatingPricing({
    distanceKm: 900,
    vehicleType: "TIR",
    loadProfile: { tonnage: 24, loadType: "STANDARD_DRY" },
    fuelPricePerLiter: 78.54,
  });
  assert(
    p5 && Math.abs(p5.totals.unitCostPerKm - p1.totals.unitCostPerKm) < 5,
    "Test 5: Long Route (900 km) scales with consistent unit economics vs 450 km",
    { p1Unit: p1.totals.unitCostPerKm, p5Unit: p5.totals.unitCostPerKm }
  );

  // ============================================================
  // PART 2: ROUND TRIP, TOLL & SPECIAL LOAD HANDLING
  // ============================================================
  console.log("\n--- PART 2: ROUND TRIP, TOLL & SPECIAL LOAD HANDLING ---");

  // Scenario 6: Round trip - distance, fuel, driver, toll scale without double counting permits
  const p6OneWay = calculateOperatingPricing({
    distanceKm: 450,
    customTollCost: 500,
    loadProfile: { isOversize: true, specialPermitRequired: true },
  });
  const p6Round = calculateOperatingPricing({
    distanceKm: 450,
    isRoundTrip: true,
    customTollCost: 500,
    loadProfile: { isOversize: true, specialPermitRequired: true },
  });
  assert(
    p6Round &&
    p6Round.route.distanceKm === 900 &&
    p6Round.breakdown.route.toll.cost === 1000 &&
    p6Round.breakdown.loadSpecific.totalCost === Math.round(OFFICIAL_SOURCES.KGM.specialPermitFee2026),
    "Test 6: Round trip doubles distance and toll, but keeps one-time KGM permit single",
    { roundToll: p6Round?.breakdown?.route?.toll?.cost, permitCost: p6Round?.breakdown?.loadSpecific?.totalCost }
  );

  // Scenario 7: Toll unavailable - Explicitly null / unavailable, not fake ₺0
  const p7 = calculateOperatingPricing({ distanceKm: 450 });
  assert(
    p7 && p7.breakdown.route.toll.cost === null && p7.breakdown.route.toll.status === "unavailable" && !p7.breakdown.route.toll.isIncluded,
    "Test 7: Unverified toll is kept strictly NULL (unavailable), never fake ₺0",
    p7?.breakdown?.route?.toll
  );

  // Scenario 8: ADR Load - Verifiable requirement without arbitrary % multipliers
  const p8 = calculateOperatingPricing({
    distanceKm: 450,
    loadProfile: { isDangerousGoods: true, adrClass: "CLASS_3" },
  });
  assert(
    p8 && p8.load.isDangerousGoods === true && p8.breakdown.loadSpecific.items.some((i) => i.key === "compliance" && i.cost === null),
    "Test 8: ADR load requires verified certification without applying arbitrary percentage surcharges",
    p8?.load
  );

  // Scenario 9: Refrigerated Load - Verifiable requirement without arbitrary % multipliers
  const p9 = calculateOperatingPricing({
    distanceKm: 450,
    loadProfile: { loadType: "REFRIGERATED", temperatureClass: "FROZEN" },
  });
  assert(
    p9 && p9.load.loadType === "REFRIGERATED" && p9.breakdown.loadSpecific.items.some((i) => i.key === "temperature" && i.cost === null),
    "Test 9: Refrigerated load requires thermal telemetry without applying arbitrary percentage surcharges",
    p9?.load
  );

  // Scenario 10: Oversize Load with special permit - Exact official KGM fee added
  const p10 = calculateOperatingPricing({
    distanceKm: 450,
    loadProfile: { isOversize: true, specialPermitRequired: true },
  });
  assert(
    p10 && p10.breakdown.loadSpecific.totalCost === Math.round(OFFICIAL_SOURCES.KGM.specialPermitFee2026),
    "Test 10: Oversize load correctly incorporates official KGM 2026 permit fee (₺18.814)",
    p10?.breakdown?.loadSpecific
  );

  // ============================================================
  // PART 3: PRICE SANITY & MATHEMATICAL INTEGRITY
  // ============================================================
  console.log("\n--- PART 3: PRICE SANITY & MATHEMATICAL INTEGRITY ---");

  // Scenario 11: Sanity check passes on standard input
  const sanity11 = validatePricingSanity(p1);
  assert(
    sanity11 && sanity11.isValid === true && sanity11.score === 100,
    "Test 11: Sanity validation passes on standard calibrated pricing calculation (100/100)",
    sanity11
  );

  // Scenario 12: Sanity check detects non-positive distance
  const sanity12 = validatePricingSanity({
    route: { distanceKm: 0 },
    totals: { totalOperatingCost: 1000 },
  });
  assert(
    sanity12 && sanity12.isValid === false && sanity12.issues.some((i) => i.includes("Mesafe sıfır")),
    "Test 12: Sanity validation catches zero/negative distance as invalid",
    sanity12
  );

  // Scenario 13: Sanity check detects impossible fuel consumption
  const sanity13 = validatePricingSanity({
    route: { distanceKm: 450 },
    breakdown: { route: { fuel: { consumptionPer100Km: 120 } } },
    totals: { totalOperatingCost: 20000 },
  });
  assert(
    sanity13 && sanity13.issues.some((i) => i.includes("Yakıt tüketimi olağan dışı")),
    "Test 13: Sanity validation catches anomalous fuel consumption (>80 L/100km)",
    sanity13
  );

  // Scenario 14: Sanity check detects recommended price below operating cost
  const sanity14 = validatePricingSanity({
    route: { distanceKm: 450 },
    totals: { totalOperatingCost: 25000 },
    pricingBands: { recommended: { price: 20000 } },
  });
  assert(
    sanity14 && sanity14.isValid === false && sanity14.issues.some((i) => i.includes("taban maliyetin altında")),
    "Test 14: Sanity validation catches negative margin (recommended price < cost)",
    sanity14
  );

  // Scenario 15: Sanity check detects pricing band monotonicity violations
  const sanity15 = validatePricingSanity({
    route: { distanceKm: 450 },
    totals: { totalOperatingCost: 20000 },
    pricingBands: {
      minimum: { price: 25000 },
      recommended: { price: 22000 },
      premium: { price: 30000 },
    },
  });
  assert(
    sanity15 && sanity15.issues.some((i) => i.includes("Fiyat bantları sıralaması hatalı")),
    "Test 15: Sanity validation catches non-monotonic pricing bands (Min > Rec)",
    sanity15
  );

  // Scenario 16: Category breakdown sums up exactly to totalOperatingCost
  const cat = p1.breakdown.categories;
  const catSum = cat.routeDirectCost + cat.vehicleOwnershipCost + cat.operationalOverheadCost + cat.loadSpecificCost;
  assert(
    catSum === p1.totals.totalOperatingCost,
    "Test 16: Category breakdown (Route + Vehicle + Overhead + Load) sums exactly to totalOperatingCost",
    { catSum, totalOperatingCost: p1.totals.totalOperatingCost }
  );

  // Scenario 17: Pricing bands monotonicity (minimum <= recommended <= premium)
  const bands = p1.pricingBands;
  assert(
    bands.minimum.price < bands.recommended.price && bands.recommended.price < bands.premium.price,
    "Test 17: Pricing bands follow strict monotonicity (Minimum < Recommended < Premium)",
    { min: bands.minimum.price, rec: bands.recommended.price, prem: bands.premium.price }
  );

  // Scenario 18: Marketplace pricing signals
  const sig = p1.signals;
  assert(
    sig &&
    sig.recommendedPrice === bands.recommended.price &&
    sig.priceFloor === bands.minimum.price &&
    sig.priceCeiling === bands.premium.price &&
    sig.expectedCarrierMargin === 15 &&
    sig.carrierProfitAtRecommended > 0,
    "Test 18: Marketplace pricing signals accurately expose priceFloor, priceCeiling, and carrierProfit",
    sig
  );

  // ============================================================
  // PART 4: ADVANCED CALIBRATION, VERIFICATION & FEEDBACK
  // ============================================================
  console.log("\n--- PART 4: ADVANCED CALIBRATION, VERIFICATION & FEEDBACK ---");

  // Scenario 19: Custom consumption override with weight-aware scaling
  const p19 = calculateOperatingPricing({
    distanceKm: 450,
    customConsumption: 29.5,
    loadProfile: { tonnage: 24 },
  });
  assert(
    p19 && p19.breakdown.route.fuel.isCustomConsumption === true && p19.breakdown.route.fuel.consumptionPer100Km > 29.5,
    "Test 19: Custom base consumption is preserved and dynamically scaled by cargo weight",
    p19?.breakdown?.route?.fuel
  );

  // Scenario 20: TORK Verified independent audit score is 100/100 for calibrated routes
  const verified20 = verifyPricingCalculation({
    inputParams: { distanceKm: 450, vehicleType: "TIR", fuelPricePerLiter: 78.54 },
    calculatedPricing: p1,
  });
  assert(
    verified20 && verified20.verified === true && verified20.score === 100,
    "Test 20: TORK Verified independent audit verifies calibrated pricing with 100/100 score",
    { score: verified20?.score, verified: verified20?.verified }
  );

  // Scenario 21: Evaluate budget alignment identifies BELOW_COST, OPTIMAL, and PREMIUM accurately
  const cost1 = p1.totals.totalOperatingCost;
  const bLow = evaluateBudgetAlignment(cost1 - 1000, p1);
  const bOpt = evaluateBudgetAlignment(p1.pricingBands.recommended.price, p1);
  const bPrem = evaluateBudgetAlignment(p1.pricingBands.premium.price + 5000, p1);
  assert(
    bLow?.status === "BELOW_COST" && bOpt?.status === "OPTIMAL" && bPrem?.status === "PREMIUM",
    "Test 21: evaluateBudgetAlignment accurately categorizes BELOW_COST, OPTIMAL, and PREMIUM budgets",
    { bLow: bLow?.status, bOpt: bOpt?.status, bPrem: bPrem?.status }
  );

  // Scenario 22: Evaluate carrier bid classifies LOSS, LOW_MARGIN, HEALTHY accurately
  const bidLoss = evaluateCarrierBid(cost1 - 500, p1);
  const bidLow = evaluateCarrierBid(cost1 + 500, p1);
  const bidHealthy = evaluateCarrierBid(p1.pricingBands.recommended.price, p1);
  assert(
    bidLoss?.quality === "LOSS" && bidLow?.quality === "LOW_MARGIN" && bidHealthy?.quality === "HEALTHY",
    "Test 22: evaluateCarrierBid accurately evaluates LOSS, LOW_MARGIN, and HEALTHY carrier bids",
    { loss: bidLoss?.quality, low: bidLow?.quality, healthy: bidHealthy?.quality }
  );

  console.log("\n==================================================");
  console.log(`SPRINT 3 PRICING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
