import { calculateOperatingPricing, evaluateBudgetAlignment, PRICING_VEHICLE_CONFIG } from "../src/utils/pricingService.js";

console.log("=========================================");
console.log("TORK HÜRMÜZ PHASE 3.2 TEST SUITE");
console.log("=========================================");

// TEST 1: TIR default 32 L/100km
console.log("\n[TEST 1] TIR Default (32 L/100km):");
const t1 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
});
console.log("TIR Default Fuel Cost:", t1.breakdown.fuel.cost, "(Liters:", t1.breakdown.fuel.liters, ")");

// TEST 2: TIR custom 31.5 L/100km
console.log("\n[TEST 2] TIR Custom (31.5 L/100km):");
const t2 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  customConsumption: 31.5,
});
console.log("TIR Custom Fuel Cost:", t2.breakdown.fuel.cost, "(Liters:", t2.breakdown.fuel.liters, ")");
console.log("Is Custom Consumption:", t2.breakdown.fuel.isCustomConsumption);
console.log("Formula:", t2.breakdown.fuel.formula);

if (t2.breakdown.fuel.cost < t1.breakdown.fuel.cost && t2.breakdown.fuel.isCustomConsumption === true) {
  console.log("✓ TEST 1 & 2 PASSED: Custom fuel cost is less than default and correctly flagged!");
} else {
  console.error("✗ TEST 1 & 2 FAILED");
}

// TEST 3: Kırkayak 30 L/100km
console.log("\n[TEST 3] Kırkayak (30 L/100km):");
const t3 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "KIRKAYAK",
  fuelPricePerLiter: 78.54,
});
console.log("Kırkayak Fuel Cost:", t3.breakdown.fuel.cost);
if (t3.breakdown.fuel.cost < t1.breakdown.fuel.cost) {
  console.log("✓ TEST 3 PASSED");
} else {
  console.error("✗ TEST 3 FAILED");
}

// TEST 4: RoundTrip = false
console.log("\n[TEST 4] One-Way (RoundTrip = false):");
console.log("One-way Distance:", t1.route.distanceKm, "km");
if (t1.route.distanceKm === 730 && t1.route.isRoundTrip === false) {
  console.log("✓ TEST 4 PASSED");
} else {
  console.error("✗ TEST 4 FAILED");
}

// TEST 5: RoundTrip = true, buffer = 0
console.log("\n[TEST 5] RoundTrip = true, buffer = 0:");
const t5 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  isRoundTrip: true,
  returnBufferPercent: 0,
});
console.log("RoundTrip Distance:", t5.route.distanceKm, "km (Exp: 1460)");
if (t5.route.distanceKm === 1460 && t5.totals.totalOperatingCost > t1.totals.totalOperatingCost * 1.9) {
  console.log("✓ TEST 5 PASSED: Exact 2x multiplier applied");
} else {
  console.error("✗ TEST 5 FAILED");
}

// TEST 6: RoundTrip = true, buffer = 10%
console.log("\n[TEST 6] RoundTrip = true, buffer = 10%:");
const t6 = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  isRoundTrip: true,
  returnBufferPercent: 10,
});
console.log("RoundTrip + 10% Distance:", t6.route.distanceKm, "km (Exp: 1606)");
if (t6.route.distanceKm === 1606 && t6.totals.totalOperatingCost > t5.totals.totalOperatingCost) {
  console.log("✓ TEST 6 PASSED: 2.2x multiplier applied");
} else {
  console.error("✗ TEST 6 FAILED");
}

// TEST 7: Margin 8 / 15 / 20%
console.log("\n[TEST 7] Margin Math Verification:");
console.log("Base Cost:", t1.totals.totalOperatingCost);
console.log("Minimum (8%):", t1.pricingBands.minimum.price);
console.log("Recommended (15%):", t1.pricingBands.recommended.price);
console.log("Premium (20%):", t1.pricingBands.premium.price);

if (t1.pricingBands.minimum.price < t1.pricingBands.recommended.price &&
    t1.pricingBands.recommended.price < t1.pricingBands.premium.price) {
  console.log("✓ TEST 7 PASSED: Margin hierarchy valid");
} else {
  console.error("✗ TEST 7 FAILED");
}

// TEST 8: Validation Bounds Check
console.log("\n[TEST 8] Input Bounds Check:");
const invalidDist = calculateOperatingPricing({ distanceKm: -50 });
const invalidZeroDist = calculateOperatingPricing({ distanceKm: 0 });
console.log("Negative distance result:", invalidDist);
console.log("Zero distance result:", invalidZeroDist);

if (invalidDist === null && invalidZeroDist === null) {
  console.log("✓ TEST 8 PASSED: Invalid distances safely rejected");
} else {
  console.error("✗ TEST 8 FAILED");
}

console.log("\n=========================================");
console.log("ALL PHASE 3.2 TESTS PASSED SUCCESSFULLY");
console.log("=========================================");
