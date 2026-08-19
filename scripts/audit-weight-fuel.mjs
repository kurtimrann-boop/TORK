import { calculateOperatingPricing } from "../src/utils/pricingService.js";

export async function runWeightFuelAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 9: WEIGHT -> FUEL MODEL EVALUATION");
  console.log("==================================================");

  const tonnages = [5, 10, 15, 20, 24];
  const results = [];

  for (const t of tonnages) {
    const pricing = calculateOperatingPricing({
      distanceKm: 730,
      durationMinutes: 525,
      vehicleType: "TIR",
      fuelPricePerLiter: 78.54,
      loadProfile: { tonnage: t, cargoType: "Kuru Yük" },
    });

    results.push({
      tonnage: t,
      consumptionPer100Km: pricing.breakdown.route.fuel.consumptionPer100Km,
      payloadPercent: pricing.breakdown.route.fuel.payloadPercent,
      fuelLiters: pricing.breakdown.route.fuel.liters,
      fuelCost: pricing.breakdown.route.fuel.cost,
      totalOperatingCost: pricing.totals.totalOperatingCost,
      recommendedPrice: pricing.pricingBands.recommended.price,
    });
  }

  console.table(results);

  const fuelVaries = results.some((r, i) => i > 0 && r.fuelCost !== results[0].fuelCost);
  const costVaries = results.some((r, i) => i > 0 && r.totalOperatingCost !== results[0].totalOperatingCost);

  let isMonotonic = true;
  for (let i = 0; i < results.length - 1; i++) {
    if (results[i + 1].fuelLiters <= results[i].fuelLiters || results[i + 1].fuelCost <= results[i].fuelCost) {
      isMonotonic = false;
    }
  }

  console.log("\nANALYSIS & FINDINGS:");
  console.log(`- Does fuel consumption change with weight? ${fuelVaries ? "YES (Weight-Aware Model Active)" : "NO"}`);
  console.log(`- Does total operating cost change with weight? ${costVaries ? "YES" : "NO"}`);
  console.log(`- Is progression strictly monotonic (5t < 10t < 15t < 20t < 24t)? ${isMonotonic ? "YES (PASS)" : "NO (FAIL)"}`);
  console.log("- Model: TORK Hürmüz Weight-Aware Fuel Model V1 (Empirical Non-linear Payload Elasticity)");
  console.log("- Status: CALIBRATION_READY");

  return {
    results,
    fuelVaries,
    costVaries,
    isMonotonic,
  };
}

if (process.argv[1].endsWith("audit-weight-fuel.mjs")) {
  runWeightFuelAudit();
}
