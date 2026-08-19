import {
  calculateOperatingPricing,
  calculateWeightAdjustedConsumption,
  WEIGHT_FUEL_MODEL,
  PRICING_VEHICLE_CONFIG,
} from "../src/utils/pricingService.js";
import { verifyPricingCalculation } from "../src/utils/torkVerifiedService.js";

console.log("==================================================");
console.log("TORK HÜRMÜZ — WEIGHT-AWARE FUEL MODEL V1 TESTS");
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

// ----------------------------------------------------
// SECTION 1: 5t, 10t, 15t, 20t, 24t PROGRESSION (730 km, TIR)
// ----------------------------------------------------
console.log("\n[TEST SET 1] TIR 730km Payload Progression (5t -> 24t):");
const tonnages = [5, 10, 15, 20, 24];
const results = [];

for (const t of tonnages) {
  const p = calculateOperatingPricing({
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
    loadProfile: { loadType: "STANDARD_DRY", tonnage: t },
  });

  const fuelObj = p.breakdown.route.fuel;
  results.push({
    tonnage: t,
    consumptionPer100Km: fuelObj.consumptionPer100Km,
    payloadPercent: fuelObj.payloadPercent,
    fuelLiters: fuelObj.liters,
    fuelCost: fuelObj.cost,
    totalOperatingCost: p.totals.totalOperatingCost,
    recommendedPrice: p.pricingBands.recommended.price,
  });
}

console.table(results);

// Monotonicity assertions
for (let i = 0; i < results.length - 1; i++) {
  const curr = results[i];
  const next = results[i + 1];
  assert(next.consumptionPer100Km > curr.consumptionPer100Km, `${curr.tonnage}t (${curr.consumptionPer100Km} L) < ${next.tonnage}t (${next.consumptionPer100Km} L) consumption monotonic`);
  assert(next.fuelLiters > curr.fuelLiters, `${curr.tonnage}t (${curr.fuelLiters} L) < ${next.tonnage}t (${next.fuelLiters} L) liters monotonic`);
  assert(next.fuelCost > curr.fuelCost, `${curr.tonnage}t (₺${curr.fuelCost}) < ${next.tonnage}t (₺${next.fuelCost}) fuel cost monotonic`);
  assert(next.totalOperatingCost > curr.totalOperatingCost, `${curr.tonnage}t (₺${curr.totalOperatingCost}) < ${next.tonnage}t (₺${next.totalOperatingCost}) operating cost monotonic`);
  assert(next.recommendedPrice > curr.recommendedPrice, `${curr.tonnage}t (₺${curr.recommendedPrice}) < ${next.tonnage}t (₺${next.recommendedPrice}) recommended price monotonic`);
}

// ----------------------------------------------------
// SECTION 2: NO NaN / NO INFINITY ACROSS MATRIX
// ----------------------------------------------------
console.log("\n[TEST SET 2] Finite Number & Sanity Checks:");
results.forEach((r) => {
  assert(Number.isFinite(r.fuelLiters) && !Number.isNaN(r.fuelLiters), `${r.tonnage}t fuelLiters is finite`);
  assert(Number.isFinite(r.fuelCost) && !Number.isNaN(r.fuelCost), `${r.tonnage}t fuelCost is finite`);
  assert(Number.isFinite(r.totalOperatingCost) && !Number.isNaN(r.totalOperatingCost), `${r.tonnage}t totalOperatingCost is finite`);
});

// ----------------------------------------------------
// SECTION 3: ZERO / NULL / UNDEFINED TONNAGE FALLBACK
// ----------------------------------------------------
console.log("\n[TEST SET 3] Null / Undefined / Zero Tonnage Fallback:");
const pNull = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR" });
assert(pNull.breakdown.route.fuel.consumptionPer100Km === 32.0, "Null tonnage falls back to nominal 32.0 L/100km");
assert(pNull.breakdown.route.fuel.isWeightAdjusted === false, "Null tonnage isWeightAdjusted is false");

const pZero = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR", loadProfile: { tonnage: 0 } });
assert(pZero.breakdown.route.fuel.consumptionPer100Km === 32.0, "Zero tonnage falls back to nominal 32.0 L/100km");

// ----------------------------------------------------
// SECTION 4: NEGATIVE TONNAGE REJECTION
// ----------------------------------------------------
console.log("\n[TEST SET 4] Negative Tonnage Rejection:");
let negErrorCaught = false;
try {
  calculateWeightAdjustedConsumption({ vehicleType: "TIR", tonnage: -5 });
} catch (e) {
  negErrorCaught = true;
}
assert(negErrorCaught, "Negative tonnage throws validation error");

// ----------------------------------------------------
// SECTION 5: VEHICLE PROFILE DIFFERENTIATION
// ----------------------------------------------------
console.log("\n[TEST SET 5] Vehicle Profile Differentiation:");
const vehicles = ["TIR", "KIRKAYAK", "KAMYON", "KAMYONET"];
for (const v of vehicles) {
  const model = WEIGHT_FUEL_MODEL[v];
  const midTonnage = model.maxCargoWeightTon / 2;
  const adj = calculateWeightAdjustedConsumption({ vehicleType: v, tonnage: midTonnage });
  assert(adj.adjustedConsumption > 0 && adj.adjustedConsumption < model.fullLoadConsumptionPer100Km, `${v}: Mid-load (${midTonnage}t) consumption (${adj.adjustedConsumption} L) is within expected bounds`);
}

// ----------------------------------------------------
// SECTION 6: CUSTOM CONSUMPTION DYNAMIC SCALING
// ----------------------------------------------------
console.log("\n[TEST SET 6] Custom Consumption Dynamic Scaling:");
const adjCustomLight = calculateWeightAdjustedConsumption({ vehicleType: "TIR", tonnage: 5, customConsumption: 36.0 });
const adjCustomHeavy = calculateWeightAdjustedConsumption({ vehicleType: "TIR", tonnage: 24, customConsumption: 36.0 });
assert(adjCustomHeavy.adjustedConsumption > adjCustomLight.adjustedConsumption, "Custom consumption scales with payload ratio (36.0 L -> light < heavy)");
assert(adjCustomLight.isCustomConsumption === true, "Custom consumption flag is preserved");

// ----------------------------------------------------
// SECTION 7: TORK VERIFIED AUDIT INTEGRATION
// ----------------------------------------------------
console.log("\n[TEST SET 7] TORK Verified Audit Consistency:");
const p24 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  loadProfile: { loadType: "STANDARD_DRY", tonnage: 24 },
});

const audit24 = verifyPricingCalculation({
  inputParams: {
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
    loadProfile: { loadType: "STANDARD_DRY", tonnage: 24 },
  },
  calculatedPricing: p24,
});

assert(audit24.verified === true, "TORK Verified 24t calculation is verified");
assert(audit24.status === "PASS", "TORK Verified 24t status is PASS");
assert(audit24.score === 100, "TORK Verified 24t score is 100/100");

const check13 = audit24.checks.find((c) => c.id === "CHECK_13_PAYLOAD_FUEL_CONSISTENCY");
assert(check13 && check13.status === "PASS", "CHECK_13_PAYLOAD_FUEL_CONSISTENCY passes");

// Overweight test (>26t on TIR)
const pOverweight = calculateOperatingPricing({
  distanceKm: 730,
  vehicleType: "TIR",
  loadProfile: { tonnage: 29 },
});
const auditOverweight = verifyPricingCalculation({
  inputParams: { distanceKm: 730, vehicleType: "TIR", loadProfile: { tonnage: 29 } },
  calculatedPricing: pOverweight,
});
assert(auditOverweight.status === "WARNING", "Overweight payload (>26t on TIR) triggers TORK Verified WARNING");
assert(auditOverweight.warnings.some((w) => w.includes("azami taşıma sınırını")), "Overweight warning message present");

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("\n==================================================");
console.log(`WEIGHT-AWARE FUEL MODEL TESTS: ${passCount} Passed, ${failCount} Failed`);
console.log("==================================================");

if (failCount > 0) process.exit(1);
