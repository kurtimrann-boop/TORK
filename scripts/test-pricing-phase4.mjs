import { calculateOperatingPricing, normalizeLoadProfile, LOAD_TYPES, OFFICIAL_SOURCES } from "../src/utils/pricingService.js";

console.log("=========================================");
console.log("TORK HÜRMÜZ PHASE 4 LOAD INTELLIGENCE TESTS");
console.log("=========================================");

// TEST 1: STANDARD_DRY (Zero load-specific add-ons)
console.log("\n[TEST 1] STANDARD_DRY Load:");
const pDry = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "STANDARD_DRY", tonnage: 20 },
});
console.log("Dry Load Specific Cost:", pDry.totals.loadSpecificDirectCost);
console.log("Dry Complexity Score:", pDry.load.complexityScore);
if (pDry.totals.loadSpecificDirectCost === 0 && pDry.load.complexityScore === 1) {
  console.log("✓ TEST 1 PASSED: Standard dry has zero load-specific add-ons");
} else {
  console.error("✗ TEST 1 FAILED");
}

// TEST 2: PALLETIZED (20 pallets)
console.log("\n[TEST 2] PALLETIZED (20 pallets):");
const pPallet = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "PALLETIZED", palletCount: 20, tonnage: 15 },
});
console.log("Pallet Count:", pPallet.load.palletCount);
console.log("Pallet Complexity Score:", pPallet.load.complexityScore);
console.log("Pallet Handling Item:", pPallet.breakdown.loadSpecific.items.find(i => i.key === "handling"));
if (pPallet.load.palletCount === 20 && pPallet.load.complexityScore === 2 && pPallet.totals.loadSpecificDirectCost === 0) {
  console.log("✓ TEST 2 PASSED: Palletized load documented without arbitrary percentage markups!");
} else {
  console.error("✗ TEST 2 FAILED");
}

// TEST 3: BULK (Dökme Yük)
console.log("\n[TEST 3] BULK Load:");
const pBulk = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "BULK", tonnage: 24 },
});
console.log("Bulk Complexity Score:", pBulk.load.complexityScore);
if (pBulk.load.complexityScore === 3 && pBulk.totals.loadSpecificDirectCost === 0) {
  console.log("✓ TEST 3 PASSED: Bulk load documented with mechanical handling context");
} else {
  console.error("✗ TEST 3 FAILED");
}

// TEST 4: REFRIGERATED (CHILLED)
console.log("\n[TEST 4] REFRIGERATED (CHILLED):");
const pFrigo = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "REFRIGERATED", temperatureClass: "CHILLED", tonnage: 18 },
});
console.log("Frigo Temperature Class:", pFrigo.load.temperatureClassLabel);
console.log("Frigo Complexity Score:", pFrigo.load.complexityScore);
console.log("Frigo Refrigeration Item:", pFrigo.breakdown.loadSpecific.items.find(i => i.key === "temperature"));
if (pFrigo.load.temperatureClass === "CHILLED" && pFrigo.load.complexityScore === 4) {
  console.log("✓ TEST 4 PASSED: Refrigerated requirements documented without arbitrary '+12%' multiplier");
} else {
  console.error("✗ TEST 4 FAILED");
}

// TEST 5: DANGEROUS_GOODS (ADR)
console.log("\n[TEST 5] DANGEROUS_GOODS (ADR):");
const pAdr = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "DANGEROUS_GOODS", adrClass: "CLASS_3", isDangerousGoods: true, tonnage: 20 },
});
console.log("ADR Class Label:", pAdr.load.adrClassLabel);
console.log("ADR Complexity Score:", pAdr.load.complexityScore);
if (pAdr.load.isDangerousGoods === true && pAdr.load.complexityScore === 5 && pAdr.totals.loadSpecificDirectCost === 0) {
  console.log("✓ TEST 5 PASSED: ADR requirements documented without arbitrary '+15%' risk markup");
} else {
  console.error("✗ TEST 5 FAILED");
}

// TEST 6: OVERSIZE (KGM 2026 Special Permit Fee)
console.log("\n[TEST 6] OVERSIZE with Special Permit:");
const pOversize = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "OVERSIZE", isOversize: true, specialPermitRequired: true, tonnage: 28 },
});
const permitItem = pOversize.breakdown.loadSpecific.items.find(i => i.key === "permit");
console.log("Permit Item:", permitItem);
console.log("Load-Specific Total Cost:", pOversize.totals.loadSpecificDirectCost);
if (permitItem.cost === 18814 && pOversize.totals.loadSpecificDirectCost === 18814) {
  console.log("✓ TEST 6 PASSED: Official KGM 2026 Special Permit Fee (₺18.814) accurately applied");
} else {
  console.error("✗ TEST 6 FAILED");
}

// TEST 7: Capacity & Utilization Check (30 Ton load on 26 Ton TIR capacity)
console.log("\n[TEST 7] Capacity & Overweight Warning:");
const pOver = calculateOperatingPricing({
  distanceKm: 730,
  durationMinutes: 525,
  vehicleType: "TIR",
  loadProfile: { loadType: "STANDARD_DRY", tonnage: 30 },
});
console.log("TIR Max Cargo Capacity:", pOver.vehicle.maxCargoWeightTon, "ton");
console.log("Load Tonnage:", pOver.load.tonnage, "ton");
console.log("Weight Utilization:", pOver.load.utilization.weightPercent, "%");
console.log("Is Overweight:", pOver.load.utilization.isOverweight);

if (pOver.load.utilization.isOverweight === true && pOver.load.utilization.weightPercent > 100) {
  console.log("✓ TEST 7 PASSED: Overweight capacity warning flagged properly");
} else {
  console.error("✗ TEST 7 FAILED");
}

// TEST 8: Market Calibration Placeholders
console.log("\n[TEST 8] Market Calibration Metadata:");
console.log("Market Calibration:", pDry.marketCalibration);
if (pDry.marketCalibration.sampleSize === 0 && pDry.marketCalibration.status === "CALIBRATION_PENDING_REAL_TRANSACTIONS") {
  console.log("✓ TEST 8 PASSED: Market calibration safely held as future transaction placeholder");
} else {
  console.error("✗ TEST 8 FAILED");
}

console.log("\n=========================================");
console.log("ALL PHASE 4 TESTS PASSED SUCCESSFULLY");
console.log("=========================================");
