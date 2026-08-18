import { verifyPricingCalculation, VERIFIED_VEHICLE_CONFIG } from "../src/utils/torkVerifiedService.js";
import { calculateOperatingPricing } from "../src/utils/pricingService.js";

console.log("==================================================");
console.log("TORK VERIFIED — TEST SUITE");
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

// TEST 1: Known-good calculation
const baseDist = 730;
const pricing1 = calculateOperatingPricing({
  distanceKm: baseDist,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
});

const audit1 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
  },
  calculatedPricing: pricing1,
});

assert(audit1.verified === true, "Test 1: Known-good calculation verified is true");
assert(audit1.status === "PASS", "Test 1: Status is PASS");
assert(audit1.score === 100, "Test 1: Score is 100/100");
assert(audit1.checks.length >= 10, "Test 1: Runs 10+ consistency checks");

// TEST 2: Fuel arithmetic exact match
const fuelCheck = audit1.checks.find(c => c.id === "CHECK_06_FUEL_COST");
assert(fuelCheck && fuelCheck.status === "PASS", "Test 2: Fuel cost check passes");
assert(fuelCheck && fuelCheck.expected === pricing1.breakdown.route.fuel.cost, "Test 2: Recalculated fuel matches Hürmüz fuel");

// TEST 3: Intentional fuel mismatch -> FAIL
const corruptedPricingFuel = JSON.parse(JSON.stringify(pricing1));
corruptedPricingFuel.breakdown.route.fuel.cost += 5000; // Inject 5,000 TL error
corruptedPricingFuel.totals.totalDirectCost += 5000;
corruptedPricingFuel.totals.totalOperatingCost += 5400;

const audit3 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
  },
  calculatedPricing: corruptedPricingFuel,
});

assert(audit3.verified === false, "Test 3: Corrupted fuel calculation verified is false");
assert(audit3.status === "FAIL", "Test 3: Status is FAIL on fuel mismatch");
assert(audit3.errors.length > 0, "Test 3: Error list contains fuel mismatch detail");

// TEST 4: Intentional overhead mismatch -> FAIL
const corruptedPricingOverhead = JSON.parse(JSON.stringify(pricing1));
corruptedPricingOverhead.totals.totalOperatingCost += 3000; // Inject 3,000 TL fake overhead

const audit4 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
  },
  calculatedPricing: corruptedPricingOverhead,
});

assert(audit4.status === "FAIL", "Test 4: Status is FAIL on overhead mismatch");

// TEST 5: Intentional margin mismatch -> FAIL
const corruptedPricingMargin = JSON.parse(JSON.stringify(pricing1));
corruptedPricingMargin.pricingBands.recommended.price = 999999; // Corrupt recommended price

const audit5 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    fuelPricePerLiter: 78.54,
  },
  calculatedPricing: corruptedPricingMargin,
});

assert(audit5.status === "FAIL", "Test 5: Status is FAIL on recommended price formula mismatch");

// TEST 6: Missing toll -> marked unavailable and not fake 0
assert(pricing1.breakdown.route.tollCost === null || pricing1.breakdown.route.tollCost === undefined, "Test 6: Missing toll cost is null, not fake 0");
const tollCheck = audit1.checks.find(c => c.id === "CHECK_12_TOLL_INTEGRITY");
assert(tollCheck && tollCheck.status === "PASS", "Test 6: Toll integrity check passes");

// TEST 7: Missing input -> INCOMPLETE
const audit7 = verifyPricingCalculation({
  inputParams: { distanceKm: 0 },
});
assert(audit7.status === "INCOMPLETE", "Test 7: Missing distance results in INCOMPLETE status");
assert(audit7.score === 0, "Test 7: Score is 0 on incomplete input");

// TEST 8: Round trip calculation -> PASS
const pricing8 = calculateOperatingPricing({
  distanceKm: baseDist,
  durationMinutes: 525,
  vehicleType: "TIR",
  isRoundTrip: true,
  returnBufferPercent: 10,
});

const audit8 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    isRoundTrip: true,
    returnBufferPercent: 10,
  },
  calculatedPricing: pricing8,
});

assert(audit8.status === "PASS", "Test 8: Round trip + buffer calculation status is PASS");
assert(audit8.score === 100, "Test 8: Round trip score is 100");

// TEST 9: Custom consumption -> PASS
const pricing9 = calculateOperatingPricing({
  distanceKm: baseDist,
  durationMinutes: 525,
  vehicleType: "TIR",
  customConsumption: 35.5,
});

const audit9 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    durationMinutes: 525,
    vehicleType: "TIR",
    customConsumption: 35.5,
  },
  calculatedPricing: pricing9,
});

assert(audit9.status === "PASS", "Test 9: Custom consumption calculation status is PASS");
assert(audit9.recalculated.fuelLiters === pricing9.breakdown.route.fuel.liters || Math.abs(audit9.recalculated.fuelLiters - pricing9.breakdown.route.fuel.liters) <= 0.2, "Test 9: Custom consumption liters match");

// TEST 10: Tonnage capacity limit warning -> WARNING
const pricing10 = calculateOperatingPricing({
  distanceKm: baseDist,
  vehicleType: "KAMYONET", // max 1.5 ton
  loadProfile: { tonnage: 5.0 }, // 5 ton on kamyonet -> overload
});

const audit10 = verifyPricingCalculation({
  inputParams: {
    distanceKm: baseDist,
    vehicleType: "KAMYONET",
    loadProfile: { tonnage: 5.0 },
  },
  calculatedPricing: pricing10,
});

assert(audit10.status === "WARNING", "Test 10: Overloaded vehicle generates WARNING status");
assert(audit10.warnings.length > 0, "Test 10: Overload warning message generated");
assert(audit10.score < 100, "Test 10: Overload warning reduces score deterministically");

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==================================================");

if (failCount > 0) {
  process.exit(1);
}
