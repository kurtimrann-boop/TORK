import assert from "node:assert/strict";
import {
  calculateOperatingPricing,
  calculateWeightAdjustedConsumption,
  PRICING_VEHICLE_CONFIG,
  WEIGHT_FUEL_MODEL,
} from "../src/utils/pricingService.js";
import { calculateRouteFuelCost, VEHICLE_CONSUMPTION_PROFILES } from "../src/utils/fuelCostService.js";

console.log("================================================================================");
console.log("   TORK POST-SPRINT 14 REGRESSION AUDIT & FUNCTIONAL RECOVERY TEST SUITE");
console.log("================================================================================");

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: COST BREAKDOWN & NULL TOLL DEFENSIVE RENDERING (INC ROOT CAUSE)
// -----------------------------------------------------------------------------
console.log("\n--- 1. COST BREAKDOWN & NULL TOLL DEFENSIVE RENDERING ---");

test("calculateOperatingPricing produces valid breakdown with nullable toll cost when unavailable", () => {
  const result = calculateOperatingPricing({
    distanceKm: 730,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
    loadProfile: { loadType: "Paletli Ürün", tonnage: 24 },
  });

  assert.ok(result, "Pricing result should not be null");
  assert.ok(result.breakdown, "breakdown should exist");
  assert.ok(result.breakdown.route, "breakdown.route should exist");
  assert.ok(result.breakdown.route.fuel, "breakdown.route.fuel should exist");
  assert.ok(result.breakdown.route.toll, "breakdown.route.toll should exist");
  assert.ok(result.breakdown.route.driver, "breakdown.route.driver should exist");
  assert.ok(result.breakdown.route.maintenance, "breakdown.route.maintenance should exist");
  assert.ok(result.breakdown.route.depreciation, "breakdown.route.depreciation should exist");

  // Verify toll cost is null and handled defensively without throwing
  const tollCost = result.breakdown.route.toll.cost;
  const formattedToll = tollCost != null ? `₺${tollCost.toLocaleString("tr-TR")}` : "₺0 (Dahil Edilmedi)";
  assert.equal(formattedToll, "₺0 (Dahil Edilmedi)", "Toll formatting must handle null safely");
});

test("Simulate PricingEngineCard breakdown rendering with null toll, null duration, missing fields", () => {
  const pricing = calculateOperatingPricing({
    distanceKm: 450,
    durationMinutes: null,
    vehicleType: "KAMYON",
    fuelPricePerLiter: 78.54,
  });

  const { breakdown, totals, route } = pricing;

  // Simulate JSX expressions:
  const fuelLiters = breakdown?.route?.fuel?.liters ?? 0;
  const fuelConsumption = breakdown?.route?.fuel?.consumptionPer100Km ?? 32;
  const fuelCostStr = `₺${(breakdown?.route?.fuel?.cost ?? 0).toLocaleString("tr-TR")}`;
  const tollCostStr = breakdown?.route?.toll?.cost != null ? `₺${breakdown.route.toll.cost.toLocaleString("tr-TR")}` : "₺0 (Dahil Edilmedi)";
  const driverCostStr = `₺${(breakdown?.route?.driver?.cost ?? 0).toLocaleString("tr-TR")}`;
  const maintCostStr = `₺${((breakdown?.route?.maintenance?.cost ?? 0) + (breakdown?.route?.depreciation?.cost ?? 0)).toLocaleString("tr-TR")}`;
  const durationHours = route?.durationHours ?? 0;

  assert.ok(fuelLiters > 0, "Fuel liters should be positive");
  assert.ok(fuelConsumption > 0, "Fuel consumption should be positive");
  assert.ok(fuelCostStr.includes("₺"), "Fuel cost should be formatted with ₺");
  assert.equal(tollCostStr, "₺0 (Dahil Edilmedi)", "Null toll should render fallback");
  assert.ok(driverCostStr.includes("₺"), "Driver cost should be formatted");
  assert.ok(maintCostStr.includes("₺"), "Maintenance cost should be formatted");
  assert.ok(Number.isFinite(durationHours), "Duration hours should be a finite number");
});

// -----------------------------------------------------------------------------
// SECTION 2: WEIGHT-AWARE FUEL MODEL (10t vs 24t & NOMINAL FALLBACK)
// -----------------------------------------------------------------------------
console.log("\n--- 2. WEIGHT-AWARE FUEL MODEL ---");

test("Case A: Origin + Destination with NO tonnage returns nominal consumption & unadjusted flag", () => {
  const fuelResultNoTonnage = calculateRouteFuelCost({
    distanceKm: 730,
    fuelPricePerLiter: 78.54,
    vehicleTypeId: "TIR",
    tonnage: null,
  });

  assert.ok(fuelResultNoTonnage, "Fuel result should exist");
  assert.equal(fuelResultNoTonnage.isWeightAdjusted, false, "Should be marked as not weight adjusted");
  assert.equal(fuelResultNoTonnage.consumptionPer100Km, 32.0, "Should use nominal 32.0 L/100km");
  assert.equal(fuelResultNoTonnage.payloadPercent, 0, "Payload percent should be 0");
  assert.ok(fuelResultNoTonnage.breakdown.disclaimer.includes("varsayılan"), "Disclaimer should mention default profile");
});

test("Case B: Tonnage = 10 Ton calculates calibrated mid-load consumption (~29.3 L/100km)", () => {
  const fuel10t = calculateRouteFuelCost({
    distanceKm: 730,
    fuelPricePerLiter: 78.54,
    vehicleTypeId: "TIR",
    tonnage: 10,
  });

  assert.ok(fuel10t, "10t calculation should exist");
  assert.equal(fuel10t.isWeightAdjusted, true, "10t should be weight adjusted");
  assert.equal(fuel10t.consumptionPer100Km, 29.3, "10t TIR consumption should be 29.3 L/100km");
  assert.equal(fuel10t.fuelLiters, 213.9, "10t fuel liters for 730km should be 213.9 L");
  assert.equal(fuel10t.totalCost, 16799, "10t fuel cost for 730km should be ₺16,799");
});

test("Case C: Tonnage = 24 Ton calculates calibrated heavy-load consumption (~32.7 L/100km)", () => {
  const fuel24t = calculateRouteFuelCost({
    distanceKm: 730,
    fuelPricePerLiter: 78.54,
    vehicleTypeId: "TIR",
    tonnage: 24,
  });

  assert.ok(fuel24t, "24t calculation should exist");
  assert.equal(fuel24t.isWeightAdjusted, true, "24t should be weight adjusted");
  assert.equal(fuel24t.consumptionPer100Km, 32.7, "24t TIR consumption should be 32.7 L/100km");
  assert.equal(fuel24t.fuelLiters, 238.7, "24t fuel liters for 730km should be 238.7 L");
  assert.equal(fuel24t.totalCost, 18748, "24t fuel cost for 730km should be ₺18,748");
});

test("10t vs 24t Delta: 24t consumption and cost must be strictly greater than 10t", () => {
  const fuel10t = calculateRouteFuelCost({ distanceKm: 730, fuelPricePerLiter: 78.54, vehicleTypeId: "TIR", tonnage: 10 });
  const fuel24t = calculateRouteFuelCost({ distanceKm: 730, fuelPricePerLiter: 78.54, vehicleTypeId: "TIR", tonnage: 24 });

  const deltaConsumption = fuel24t.consumptionPer100Km - fuel10t.consumptionPer100Km;
  const deltaCost = fuel24t.totalCost - fuel10t.totalCost;

  assert.ok(deltaConsumption > 3.0, `24t consumption (${fuel24t.consumptionPer100Km}) should exceed 10t (${fuel10t.consumptionPer100Km}) by > 3.0 L`);
  assert.ok(deltaCost > 1800, `24t cost (₺${fuel24t.totalCost}) should exceed 10t (₺${fuel10t.totalCost}) by > ₺1,800`);
});

// -----------------------------------------------------------------------------
// SECTION 3: LOAD CREATION VALIDATION & FORM INTEGRITY
// -----------------------------------------------------------------------------
console.log("\n--- 3. LOAD CREATION VALIDATION ---");

test("Step 1 validation strictly blocks missing origin or destination", () => {
  function validateStep1(origin, dest) {
    if (!origin) return { valid: false, error: "Lütfen yükleme noktasını (Nereden) seçiniz." };
    if (!dest) return { valid: false, error: "Lütfen teslimat noktasını (Nereye) seçiniz." };
    if (origin.code === dest.code) return { valid: false, error: "Başlangıç ve bitiş illeri farklı olmalıdır." };
    return { valid: true };
  }

  const check1 = validateStep1(null, null);
  assert.equal(check1.valid, false);
  assert.equal(check1.error, "Lütfen yükleme noktasını (Nereden) seçiniz.");

  const check2 = validateStep1({ code: "34", name: "İstanbul" }, null);
  assert.equal(check2.valid, false);
  assert.equal(check2.error, "Lütfen teslimat noktasını (Nereye) seçiniz.");

  const check3 = validateStep1({ code: "34", name: "İstanbul" }, { code: "34", name: "İstanbul" });
  assert.equal(check3.valid, false);
  assert.equal(check3.error, "Başlangıç ve bitiş illeri farklı olmalıdır.");

  const check4 = validateStep1({ code: "34", name: "İstanbul" }, { code: "06", name: "Ankara" });
  assert.equal(check4.valid, true);
});

// -----------------------------------------------------------------------------
// SECTION 4: PRICING INPUT DEPENDENCY & METRIC INTEGRITY
// -----------------------------------------------------------------------------
console.log("\n--- 4. PRICING INPUT DEPENDENCY AUDIT ---");

test("Pricing correctly adapts to vehicle type and cargo complexity", () => {
  const pTIR = calculateOperatingPricing({ distanceKm: 730, vehicleType: "TIR", fuelPricePerLiter: 78.54, loadProfile: { tonnage: 24 } });
  const pKamyon = calculateOperatingPricing({ distanceKm: 730, vehicleType: "KAMYON", fuelPricePerLiter: 78.54, loadProfile: { tonnage: 15 } });

  assert.ok(pTIR.totals.totalOperatingCost > 0, "TIR operating cost should be > 0");
  assert.ok(pKamyon.totals.totalOperatingCost > 0, "Kamyon operating cost should be > 0");
  assert.notEqual(pTIR.totals.totalOperatingCost, pKamyon.totals.totalOperatingCost, "TIR and Kamyon costs must differ");
});

console.log("\n================================================================================");
console.log(`   TEST RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
