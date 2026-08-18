/**
 * TORK — Trip Actuals & Settlement Service (Hürmüz Phase 6)
 * 
 * Manages immutable estimation snapshots, actual cost aggregation,
 * variance analysis, POD verification, and settlement calculation.
 * 
 * Strict Principle:
 * - NULL is never converted to 0 (NULL = unentered / unverified).
 * - Estimation snapshots are immutable.
 * - Carrier actual costs and profit are confidential to the carrier.
 */

/**
 * Creates an immutable estimate snapshot object from a Pricing Engine calculation
 */
export function createTransportEstimateSnapshot(transportId, pricingResult, bidAmount) {
  if (!transportId || !pricingResult || !pricingResult.totals) {
    throw new Error("Invalid arguments for transport estimate snapshot");
  }

  const { breakdown, totals, vehicle, route, load, meta } = pricingResult;
  const numBid = Number(bidAmount);
  const cost = totals.totalOperatingCost;
  const profit = Math.round((numBid - cost) * 100) / 100;
  const marginPercent = Math.round((profit / numBid) * 1000) / 10;

  return {
    transport_id: transportId,
    vehicle_type: vehicle.type,
    custom_consumption: breakdown.route.fuel.isCustomConsumption ? breakdown.route.fuel.consumptionPer100Km : null,
    load_type: load.loadType,
    tonnage: load.tonnage,
    pallet_count: load.palletCount,
    volume_m3: load.volumeM3,
    distance_km: route.distanceKm,
    duration_minutes: route.durationMinutes,
    fuel_price_per_liter: breakdown.route.fuel.pricePerLiter,
    fuel_liters: breakdown.route.fuel.liters,
    fuel_cost: breakdown.route.fuel.cost,
    driver_cost: breakdown.route.driver.cost,
    toll_cost: breakdown.route.toll.cost,
    toll_status: breakdown.route.toll.status,
    maintenance_cost: breakdown.route.maintenance.cost,
    depreciation_cost: breakdown.route.depreciation.cost,
    overhead_cost: breakdown.overhead.cost,
    load_specific_cost: totals.loadSpecificDirectCost,
    total_operating_cost: cost,
    recommended_price: pricingResult.pricingBands?.recommended?.price || cost,
    bid_amount: numBid,
    estimated_profit: profit,
    estimated_margin_percent: marginPercent,
    data_quality: meta?.dataQuality || "MEDIUM",
    pricing_version: "HURMUZ_V5",
    snapshot_created_at: new Date().toISOString(),
  };
}

/**
 * Aggregates actual costs and evaluates data completeness
 */
export function calculateActualCost(actualsData = {}) {
  const {
    fuel_cost,
    driver_cost,
    toll_cost,
    maintenance_cost,
    depreciation_cost,
    waiting_cost,
    special_handling_cost,
    other_cost,
  } = actualsData;

  const costItems = [
    { key: "fuel", value: fuel_cost },
    { key: "driver", value: driver_cost },
    { key: "toll", value: toll_cost },
    { key: "maintenance", value: maintenance_cost },
    { key: "depreciation", value: depreciation_cost },
    { key: "waiting", value: waiting_cost },
    { key: "special_handling", value: special_handling_cost },
    { key: "other", value: other_cost },
  ];

  let sum = 0;
  let enteredCount = 0;

  for (const item of costItems) {
    if (item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value))) {
      sum += Number(item.value);
      enteredCount++;
    }
  }

  // Completeness check
  let dataCompleteness = "EMPTY";
  if (enteredCount >= 5) {
    dataCompleteness = "COMPLETE";
  } else if (enteredCount > 0) {
    dataCompleteness = "PARTIAL";
  }

  return {
    totalActualCost: enteredCount > 0 ? Math.round(sum * 100) / 100 : null,
    enteredItemCount: enteredCount,
    dataCompleteness,
  };
}

/**
 * Calculates actual profit based on realized costs
 */
export function calculateActualProfit(bidAmount, actualCost) {
  const numBid = Number(bidAmount);
  if (!Number.isFinite(numBid) || actualCost === null || actualCost === undefined || !Number.isFinite(Number(actualCost))) {
    return null;
  }
  return Math.round((numBid - Number(actualCost)) * 100) / 100;
}

/**
 * Calculates actual gross margin percentage
 */
export function calculateActualMargin(bidAmount, actualProfit) {
  const numBid = Number(bidAmount);
  if (!Number.isFinite(numBid) || numBid <= 0 || actualProfit === null || actualProfit === undefined || !Number.isFinite(Number(actualProfit))) {
    return null;
  }
  return Math.round((Number(actualProfit) / numBid) * 1000) / 10;
}

/**
 * Compares estimated snapshot with realized actuals and produces variance analysis
 */
export function compareEstimatedVsActual(estimateSnapshot, actualsData, bidAmount) {
  if (!estimateSnapshot) {
    return null;
  }

  const numBid = Number(bidAmount || estimateSnapshot.bid_amount);
  const estimatedCost = Number(estimateSnapshot.total_operating_cost);
  const estimatedProfit = Number(estimateSnapshot.estimated_profit);
  const estimatedMargin = Number(estimateSnapshot.estimated_margin_percent);

  const { totalActualCost, dataCompleteness } = calculateActualCost(actualsData);

  if (totalActualCost === null) {
    return {
      estimatedCost,
      actualCost: null,
      costVariance: null,
      costVariancePercent: null,
      estimatedProfit,
      actualProfit: null,
      profitVariance: null,
      estimatedMargin,
      actualMargin: null,
      dataCompleteness: "EMPTY",
    };
  }

  const costVariance = Math.round((totalActualCost - estimatedCost) * 100) / 100;
  const costVariancePercent = estimatedCost > 0
    ? Math.round((costVariance / estimatedCost) * 10000) / 100
    : 0;

  const actualProfit = calculateActualProfit(numBid, totalActualCost);
  const profitVariance = actualProfit !== null ? Math.round((actualProfit - estimatedProfit) * 100) / 100 : null;

  const actualMargin = calculateActualMargin(numBid, actualProfit);
  const marginVariance = actualMargin !== null ? Math.round((actualMargin - estimatedMargin) * 10) / 10 : null;

  return {
    estimatedCost,
    actualCost: totalActualCost,
    costVariance,
    costVariancePercent,
    estimatedProfit,
    actualProfit,
    profitVariance,
    estimatedMargin,
    actualMargin,
    marginVariance,
    dataCompleteness,
  };
}

/**
 * Evaluates whether a transport settlement is ready for approval/payout
 */
export function evaluateSettlementEligibility(transport, documents = [], requiresPod = true) {
  if (!transport) return { isEligible: false, status: "draft", reason: "Taşıma bulunamadı" };

  if (transport.status !== "delivered" && transport.status !== "settled") {
    return {
      isEligible: false,
      status: "in_transit",
      reason: "Taşıma henüz teslim edilmedi.",
    };
  }

  const hasPod = documents.some((d) => d.document_type === "POD");

  if (requiresPod && !hasPod) {
    return {
      isEligible: false,
      status: "pending_pod",
      reason: "Teslimat Kanıtı (POD) belgesi bekleniyor.",
    };
  }

  return {
    isEligible: true,
    status: "ready",
    reason: "Mutabakat ve ödeme onayına hazır.",
  };
}
