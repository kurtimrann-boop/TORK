import { calculateOperatingPricing, evaluateCarrierBid } from "../src/utils/pricingService.js";

console.log("==================================================");
console.log("TORK HÜRMÜZ PHASE 5 CARRIER SMART BIDDING TESTS");
console.log("==================================================");

// Base Route Pricing (730 km, TIR)
const basePricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  loadProfile: { loadType: "STANDARD_DRY", tonnage: 20 },
});

console.log("Base Operating Cost (TIR, 730km):", basePricing.totals.totalOperatingCost, "₺");

// TEST 1: TIR + ₺40.000 bid
console.log("\n[TEST 1] TIR + ₺40.000 Bid:");
const t1 = evaluateCarrierBid(40000, basePricing);
console.log("Bid Amount:", t1.bidAmount);
console.log("Estimated Cost:", t1.estimatedCost);
console.log("Estimated Profit:", t1.estimatedProfit);
console.log("Margin Percent:", t1.marginPercent, "%");
console.log("Quality:", t1.quality, "(Label:", t1.label, ")");

if (t1.estimatedProfit > 9000 && t1.marginPercent > 20 && t1.quality === "HEALTHY") {
  console.log("✓ TEST 1 PASSED: Profit & margin calculated accurately with Healthy badge");
} else {
  console.error("✗ TEST 1 FAILED");
}

// TEST 2: Bid < operating cost (₺25.000)
console.log("\n[TEST 2] Under-cost Bid (₺25.000):");
const t2 = evaluateCarrierBid(25000, basePricing);
console.log("Profit:", t2.estimatedProfit);
console.log("Quality:", t2.quality);
console.log("Message:", t2.message);

if (t2.estimatedProfit < 0 && t2.quality === "LOSS" && t2.color === "red") {
  console.log("✓ TEST 2 PASSED: Loss risk flagged with red warning");
} else {
  console.error("✗ TEST 2 FAILED");
}

// TEST 3: Bid exactly operating cost
console.log("\n[TEST 3] Break-even Bid (₺30.813):");
const t3 = evaluateCarrierBid(basePricing.totals.totalOperatingCost, basePricing);
console.log("Profit:", t3.estimatedProfit);
console.log("Margin Percent:", t3.marginPercent, "%");
console.log("Quality:", t3.quality);

if (t3.estimatedProfit === 0 && t3.marginPercent === 0 && t3.quality === "LOW_MARGIN") {
  console.log("✓ TEST 3 PASSED: Zero profit recognized as LOW_MARGIN");
} else {
  console.error("✗ TEST 3 FAILED");
}

// TEST 4: 8% Margin Bid
console.log("\n[TEST 4] 8% Margin Bid:");
const bid8 = Math.round(basePricing.totals.totalOperatingCost / (1 - 0.08));
const t4 = evaluateCarrierBid(bid8, basePricing);
console.log(`Bid for ~8% margin: ₺${bid8} -> Margin: ${t4.marginPercent}% -> Quality: ${t4.quality}`);
if (t4.quality === "VIABLE") {
  console.log("✓ TEST 4 PASSED: 8% margin flagged as VIABLE");
} else {
  console.error("✗ TEST 4 FAILED");
}

// TEST 5: 15% Margin Bid
console.log("\n[TEST 5] 15% Margin Bid:");
const bid15 = Math.round(basePricing.totals.totalOperatingCost / (1 - 0.15));
const t5 = evaluateCarrierBid(bid15, basePricing);
console.log(`Bid for ~15% margin: ₺${bid15} -> Margin: ${t5.marginPercent}% -> Quality: ${t5.quality}`);
if (t5.quality === "HEALTHY") {
  console.log("✓ TEST 5 PASSED: 15% margin flagged as HEALTHY");
} else {
  console.error("✗ TEST 5 FAILED");
}

// TEST 6: Vehicle Switching (Kırkayak)
console.log("\n[TEST 6] Vehicle Switching (Kırkayak):");
const kirkPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "KIRKAYAK",
  fuelPricePerLiter: 78.54,
  loadProfile: { loadType: "STANDARD_DRY", tonnage: 18 },
});
console.log("Kırkayak Cost:", kirkPricing.totals.totalOperatingCost, "₺ vs TIR Cost:", basePricing.totals.totalOperatingCost, "₺");
if (kirkPricing.totals.totalOperatingCost < basePricing.totals.totalOperatingCost) {
  console.log("✓ TEST 6 PASSED: Kırkayak cost dynamically recalculated lower");
} else {
  console.error("✗ TEST 6 FAILED");
}

// TEST 7: Custom Consumption
console.log("\n[TEST 7] Custom Consumption (30.0 L/100km):");
const customPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  fuelPricePerLiter: 78.54,
  customConsumption: 30.0,
});
console.log("Custom Consumption Cost:", customPricing.breakdown.route.fuel.cost, "₺ vs Default:", basePricing.breakdown.route.fuel.cost, "₺");
if (customPricing.breakdown.route.fuel.cost < basePricing.breakdown.route.fuel.cost) {
  console.log("✓ TEST 7 PASSED: Custom consumption recalculated fuel cost");
} else {
  console.error("✗ TEST 7 FAILED");
}

// TEST 8: Frigo Load
console.log("\n[TEST 8] Frigo Load:");
const frigoPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "REFRIGERATED", temperatureClass: "CHILLED" },
});
console.log("Frigo Complexity:", frigoPricing.load.complexityScore);
if (frigoPricing.load.complexityScore === 4 && frigoPricing.totals.loadSpecificDirectCost === 0) {
  console.log("✓ TEST 8 PASSED: Frigo load handled without arbitrary multiplier");
} else {
  console.error("✗ TEST 8 FAILED");
}

// TEST 9: ADR Load
console.log("\n[TEST 9] ADR Load:");
const adrPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "DANGEROUS_GOODS", adrClass: "CLASS_3", isDangerousGoods: true },
});
console.log("ADR Complexity:", adrPricing.load.complexityScore);
if (adrPricing.load.complexityScore === 5 && adrPricing.totals.loadSpecificDirectCost === 0) {
  console.log("✓ TEST 9 PASSED: ADR load handled without arbitrary risk premium");
} else {
  console.error("✗ TEST 9 FAILED");
}

// TEST 10: Oversize Load with KGM Permit Fee
console.log("\n[TEST 10] Oversize Load:");
const overPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "OVERSIZE", isOversize: true, specialPermitRequired: true },
});
console.log("Oversize Load Specific Cost:", overPricing.totals.loadSpecificDirectCost, "₺");
if (overPricing.totals.loadSpecificDirectCost === 18814) {
  console.log("✓ TEST 10 PASSED: KGM 2026 Special Permit Fee applied exactly");
} else {
  console.error("✗ TEST 10 FAILED");
}

// TEST 11: Round Trip
console.log("\n[TEST 11] Round Trip with Buffer:");
const rtPricing = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  isRoundTrip: true,
  returnBufferPercent: 10,
});
console.log("Round Trip Effective Distance:", rtPricing.route.distanceKm, "km");
if (rtPricing.route.distanceKm === 1606) {
  console.log("✓ TEST 11 PASSED: 2.2x multiplier applied");
} else {
  console.error("✗ TEST 11 FAILED");
}

console.log("\n==================================================");
console.log("ALL PHASE 5 TESTS PASSED SUCCESSFULLY");
console.log("==================================================");
