/**
 * TORK Fuel Cost Calculation Engine (Hürmüz Foundation Phase 2)
 * 
 * Computes estimated route fuel consumption and financial cost based on:
 * - Route distance (KM)
 * - Vehicle fleet consumption profiles (L/100KM)
 * - Live fuel price per liter (₺/L)
 * 
 * IMPORTANT:
 * These calculations represent estimated logistics baseline costs and
 * are strictly separate from Freight Marketplace Bid Prices.
 */

export const VEHICLE_CONSUMPTION_PROFILES = {
  TIR: {
    id: "TIR",
    label: "TIR / Çekici (Semi-Trailer)",
    shortLabel: "TIR",
    consumptionPer100Km: 32.0, // L / 100 km
    recommendedFuel: "diesel",
    fuelLabel: "Motorin",
    description: "40 Ton standart çekici & treyler",
  },
  KIRKAYAK: {
    id: "KIRKAYAK",
    label: "Kırkayak (8x2 Ağır Kamyon)",
    shortLabel: "Kırkayak",
    consumptionPer100Km: 30.0,
    recommendedFuel: "diesel",
    fuelLabel: "Motorin",
    description: "32 Ton ağır ticari kamyon",
  },
  KAMYON: {
    id: "KAMYON",
    label: "Kamyon (Onteker / Solo)",
    shortLabel: "Kamyon",
    consumptionPer100Km: 27.0,
    recommendedFuel: "diesel",
    fuelLabel: "Motorin",
    description: "16-24 Ton orta segment kamyon",
  },
  KAMYONET: {
    id: "KAMYONET",
    label: "Kamyonet / Panelvan",
    shortLabel: "Kamyonet",
    consumptionPer100Km: 12.0,
    recommendedFuel: "diesel",
    fuelLabel: "Motorin",
    description: "3.5 Ton hafif ticari araç",
  },
};

export const DEFAULT_VEHICLE_PROFILE = VEHICLE_CONSUMPTION_PROFILES.TIR;

/**
 * Calculates fuel cost and transparency breakdown for a given route distance
 * 
 * @param {Object} params
 * @param {number} params.distanceKm - Route distance in kilometers
 * @param {number} params.fuelPricePerLiter - Unit fuel price (₺ / Liter)
 * @param {string} [params.vehicleTypeId] - Vehicle type key ('TIR', 'KAMYON', etc.)
 * @param {number} [params.customConsumption] - Optional user-overridden consumption (L/100km)
 * @returns {Object|null} Calculation results or null if invalid inputs
 */
export function calculateRouteFuelCost({
  distanceKm,
  fuelPricePerLiter,
  vehicleTypeId = "TIR",
  customConsumption = null,
}) {
  const numDist = typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm);
  const numPrice = typeof fuelPricePerLiter === "number" ? fuelPricePerLiter : parseFloat(fuelPricePerLiter);

  if (!Number.isFinite(numDist) || numDist <= 0 || !Number.isFinite(numPrice) || numPrice <= 0) {
    return null;
  }

  const profile = VEHICLE_CONSUMPTION_PROFILES[vehicleTypeId] || DEFAULT_VEHICLE_PROFILE;
  const consumption = customConsumption && Number.isFinite(customConsumption) && customConsumption > 0
    ? customConsumption
    : profile.consumptionPer100Km;

  // Exact math:
  const fuelLiters = (numDist / 100) * consumption;
  const totalCost = fuelLiters * numPrice;

  // Formatted display values:
  const roundedLiters = Math.round(fuelLiters * 10) / 10;
  const roundedCost = Math.round(totalCost);

  const formattedCostTR = `₺${roundedCost.toLocaleString("tr-TR")}`;
  const formattedLitersTR = `${roundedLiters.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
  const formattedPriceTR = `₺${numPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/L`;

  return {
    distanceKm: Math.round(numDist * 10) / 10,
    consumptionPer100Km: consumption,
    vehicleProfile: profile,
    fuelLiters: roundedLiters,
    rawLiters: fuelLiters,
    totalCost: roundedCost,
    rawCost: totalCost,
    pricePerLiter: numPrice,
    formatted: {
      cost: formattedCostTR,
      liters: formattedLitersTR,
      price: formattedPriceTR,
      consumption: `${consumption} L/100 km`,
    },
    breakdown: {
      step1: `${Math.round(numDist)} km ÷ 100 × ${consumption} L = ${roundedLiters.toLocaleString("tr-TR")} Litre`,
      step2: `${roundedLiters.toLocaleString("tr-TR")} L × ₺${numPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${formattedCostTR}`,
      disclaimer: "TORK varsayılan araç tüketim profili ve güncel akaryakıt pompa fiyatına dayalı tahmini değerdir.",
    },
  };
}
