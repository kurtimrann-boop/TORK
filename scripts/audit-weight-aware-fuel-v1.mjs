import {
  calculateOperatingPricing,
  calculateWeightAdjustedConsumption,
  evaluateCarrierBid,
  WEIGHT_FUEL_MODEL,
  PRICING_VEHICLE_CONFIG,
} from "../src/utils/pricingService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";
import { createTransportEstimateSnapshot, compareEstimatedVsActual } from "../src/utils/transportActualsService.js";
import { calculateRouteFuelCost } from "../src/utils/fuelCostService.js";
import { analyzeWithGemini } from "../src/utils/geminiService.js";

const LOCAL_URL = "http://localhost:3000";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

export async function runWeightAwareFuelPostIntegrationAudit() {
  console.log("================================================================================");
  console.log("WEIGHT-AWARE FUEL V1 POST-INTEGRATION AUDIT");
  console.log("================================================================================");

  const tonnages = [5, 10, 15, 20, 24];
  const distanceKm = 730;
  const durationMinutes = 525;
  const vehicleType = "TIR";
  const fuelPrice = 78.54;
  const fixedBidAmount = 40000;

  const matrixResults = [];

  console.log("\n--- SECTION 1: END-TO-END DOWNSTREAM COMPARISON (5t -> 24t) ---");

  for (const t of tonnages) {
    // 1. Core Pricing Engine
    const pricing = calculateOperatingPricing({
      distanceKm,
      durationMinutes,
      vehicleType,
      fuelPricePerLiter: fuelPrice,
      loadProfile: { loadType: "STANDARD_DRY", tonnage: t },
    });

    const fuel = pricing.breakdown.route.fuel;
    const opCost = pricing.totals.totalOperatingCost;
    const recPrice = pricing.pricingBands.recommended.price;

    // 2. Carrier Smart Bidding Evaluation
    const carrierAnalytics = evaluateCarrierBid(fixedBidAmount, pricing);

    // 3. TORK Verified Audit
    const audit = verifyPricingCalculation({
      inputParams: {
        distanceKm,
        durationMinutes,
        vehicleType,
        fuelPricePerLiter: fuelPrice,
        loadProfile: { loadType: "STANDARD_DRY", tonnage: t },
      },
      calculatedPricing: pricing,
      bidParams: { bidAmount: fixedBidAmount, estimatedProfit: carrierAnalytics.estimatedProfit, estimatedMarginPercent: carrierAnalytics.marginPercent },
    });

    const check13 = audit.checks.find((c) => c.id === "CHECK_13_PAYLOAD_FUEL_CONSISTENCY");

    // 4. Transport Snapshot
    const snapshot = createTransportEstimateSnapshot(`tr-audit-${t}t`, pricing, fixedBidAmount);

    // 5. Fuel Cost Service
    const routeFuel = calculateRouteFuelCost({
      distanceKm,
      fuelPricePerLiter: fuelPrice,
      vehicleTypeId: vehicleType,
      tonnage: t,
    });

    matrixResults.push({
      tonnage: t,
      payloadPercent: fuel.payloadPercent,
      consumptionPer100Km: fuel.consumptionPer100Km,
      fuelLiters: fuel.liters,
      fuelCost: fuel.cost,
      operatingCost: opCost,
      recommendedPrice: recPrice,
      carrierCost: carrierAnalytics.estimatedCost,
      carrierProfit: carrierAnalytics.estimatedProfit,
      carrierMargin: carrierAnalytics.marginPercent,
      verifiedScore: audit.score,
      verifiedStatus: audit.status,
      check13Status: check13?.status || "MISSING",
      snapshotLiters: snapshot.fuel_liters,
      snapshotCost: snapshot.total_operating_cost,
      routeFuelLiters: routeFuel.fuelLiters,
    });
  }

  console.table(matrixResults.map((r) => ({
    ton: `${r.tonnage}t (%${r.payloadPercent})`,
    "L/100km": r.consumptionPer100Km,
    Liters: r.fuelLiters,
    FuelCost: `₺${r.fuelCost}`,
    OperatingCost: `₺${r.operatingCost}`,
    RecPrice: `₺${r.recommendedPrice}`,
    CarrierCost: `₺${r.carrierCost}`,
    CarrierProfit: `₺${r.carrierProfit}`,
    CarrierMargin: `%${r.carrierMargin}`,
    Verified: `${r.verifiedScore}/100 (${r.verifiedStatus})`,
    CHECK_13: r.check13Status,
  })));

  // ----------------------------------------------------
  // SECTION 2: MONOTONICITY & REACTIVITY ASSERTIONS
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: MONOTONICITY & DOWNSTREAM REACTIVITY ---");

  for (let i = 0; i < matrixResults.length - 1; i++) {
    const c = matrixResults[i];
    const n = matrixResults[i + 1];

    assert(n.fuelLiters > c.fuelLiters, `${c.tonnage}t (${c.fuelLiters}L) < ${n.tonnage}t (${n.fuelLiters}L) fuel liters increases`);
    assert(n.fuelCost > c.fuelCost, `${c.tonnage}t (₺${c.fuelCost}) < ${n.tonnage}t (₺${n.fuelCost}) fuel cost increases`);
    assert(n.operatingCost > c.operatingCost, `${c.tonnage}t (₺${c.operatingCost}) < ${n.tonnage}t (₺${n.operatingCost}) operating cost increases`);
    assert(n.recommendedPrice > c.recommendedPrice, `${c.tonnage}t (₺${c.recommendedPrice}) < ${n.tonnage}t (₺${n.recommendedPrice}) recommended price increases`);
    assert(n.carrierCost > c.carrierCost, `${c.tonnage}t (₺${c.carrierCost}) < ${n.tonnage}t (₺${n.carrierCost}) carrier estimated cost increases`);
    assert(n.carrierProfit < c.carrierProfit, `${c.tonnage}t (₺${c.carrierProfit}) > ${n.tonnage}t (₺${n.carrierProfit}) carrier profit decreases for fixed ₺40.000 bid`);
    assert(n.carrierMargin < c.carrierMargin, `${c.tonnage}t (%${c.carrierMargin}) > ${n.tonnage}t (%${n.carrierMargin}) carrier margin decreases for fixed ₺40.000 bid`);
  }

  // ----------------------------------------------------
  // SECTION 3: DOWNSTREAM DATA SYNC (SERVICES & SNAPSHOTS)
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: DOWNSTREAM SYSTEM INTEGRITY ---");

  matrixResults.forEach((r) => {
    assert(r.snapshotLiters === r.fuelLiters, `${r.tonnage}t: Transport snapshot liters matches pricing (${r.fuelLiters} L)`);
    assert(r.snapshotCost === r.operatingCost, `${r.tonnage}t: Transport snapshot cost matches pricing (₺${r.operatingCost})`);
    assert(r.routeFuelLiters === r.fuelLiters, `${r.tonnage}t: calculateRouteFuelCost matches pricing (${r.fuelLiters} L)`);
    assert(r.carrierCost === r.operatingCost, `${r.tonnage}t: CarrierSmartBidding uses new operating cost (₺${r.operatingCost})`);
    assert(r.verifiedScore === 100 && r.verifiedStatus === "PASS", `${r.tonnage}t: TORK Verified independently audits to 100/100 PASS`);
    assert(r.check13Status === "PASS", `${r.tonnage}t: CHECK_13_PAYLOAD_FUEL_CONSISTENCY verified PASS`);
  });

  // ----------------------------------------------------
  // SECTION 4: API ENDPOINT OUTPUT VS CLIENT ENGINE SYNC
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: API ENDPOINTS A TO Z SYNC ---");

  try {
    const resEst = await fetch(`${LOCAL_URL}/api/pricing/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceKm,
        durationMinutes,
        vehicleType,
        fuelPricePerLiter: fuelPrice,
        loadProfile: { loadType: "STANDARD_DRY", tonnage: 24 },
      }),
    });
    const estData = await resEst.json();
    assert(resEst.status === 200 && estData.success === true, "POST /api/pricing/estimate 24t returns 200");
    assert(estData.pricing.breakdown.route.fuel.liters === 238.7, "API /api/pricing/estimate matches 238.7 L for 24t");
    assert(estData.pricing.totals.totalOperatingCost === 31247, "API /api/pricing/estimate matches ₺31,247 cost for 24t");

    const resCarrierEst = await fetch(`${LOCAL_URL}/api/pricing/carrier-estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceKm,
        durationMinutes,
        vehicleType,
        loadProfile: { loadType: "STANDARD_DRY", tonnage: 24 },
        bidAmount: fixedBidAmount,
      }),
    });
    const carrierEstData = await resCarrierEst.json();
    assert(resCarrierEst.status === 200 && carrierEstData.success === true, "POST /api/pricing/carrier-estimate 24t returns 200");
    assert(carrierEstData.analytics.estimatedProfit > 0, "Carrier estimate profit computed with weight-adjusted cost");
  } catch (apiErr) {
    assert(false, `API sync error: ${apiErr.message}`);
  }

  // ----------------------------------------------------
  // SECTION 5: GEMINI IMMUTABILITY VERIFICATION
  // ----------------------------------------------------
  console.log("\n--- SECTION 5: GEMINI IMMUTABILITY & ISOLATION ---");

  const pricing24 = calculateOperatingPricing({
    distanceKm,
    durationMinutes,
    vehicleType,
    loadProfile: { loadType: "STANDARD_DRY", tonnage: 24 },
  });

  const aiAnalysis = await analyzeWithGemini({
    mode: "audit",
    audience: "shipper",
    context: {
      route: pricing24.route,
      vehicle: pricing24.vehicle,
      load: pricing24.load,
      pricing: pricing24,
    },
  });

  assert(aiAnalysis.summary && typeof aiAnalysis.summary === "string", "Gemini returns interpretive narrative");
  assert(pricing24.totals.totalOperatingCost === 31247, "Hürmüz cost remains exactly ₺31,247 after AI processing");
  assert(pricing24.breakdown.route.fuel.liters === 238.7, "Hürmüz fuel liters remains exactly 238.7 L after AI processing");
  assert(pricing24.pricingBands.recommended.price === 36761, "Hürmüz recommended price remains exactly ₺36,761 after AI processing");

  console.log("\n================================================================================");
  console.log(`POST-INTEGRATION AUDIT COMPLETED: ${passCount} Passed, ${failCount} Failed`);
  console.log("================================================================================");

  return { passCount, failCount };
}

if (process.argv[1].endsWith("audit-weight-aware-fuel-v1.mjs")) {
  runWeightAwareFuelPostIntegrationAudit().then(({ failCount }) => {
    if (failCount > 0) process.exit(1);
  });
}
