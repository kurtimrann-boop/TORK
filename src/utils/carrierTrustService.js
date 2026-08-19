/**
 * TORK — Carrier Trust Score Engine (Sprint 6)
 * 
 * Computes deterministic trust scores (0-100) based on historical delivery performance,
 * cancellation ratios, POD verification success, and settlement compliance.
 */

export function calculateCarrierTrustScore(carrierMetrics = {}) {
  const {
    totalAssigned = 0,
    completedTransports = 0,
    cancelledTransports = 0,
    totalPods = 0,
    verifiedPods = 0,
    totalSettlements = 0,
    disputedSettlements = 0,
    negativeMarginTransports = 0,
  } = carrierMetrics;

  // New carrier with no history -> Insufficient data
  if (totalAssigned === 0) {
    return {
      score: null,
      status: "insufficient_data",
      label: "Yetersiz Veri",
      description: "Taşıyıcının tamamlanmış operasyonel geçmişi henüz oluşmadı.",
      breakdown: {
        operationalReliability: null,
        podSuccessRate: null,
        cancellationRate: null,
        settlementHistory: null,
      },
    };
  }

  // 1. Operational Completion (Weight: 35 pts)
  const completionRatio = totalAssigned > 0 ? completedTransports / totalAssigned : 0;
  const operationalPoints = Math.round(completionRatio * 35);

  // 2. Cancellation Protection (Weight: 25 pts)
  const cancelRatio = totalAssigned > 0 ? cancelledTransports / totalAssigned : 0;
  const cancellationPoints = Math.round(Math.max(0, 1 - cancelRatio) * 25);

  // 3. POD Verification Accuracy (Weight: 20 pts)
  const podRatio = totalPods > 0 ? verifiedPods / totalPods : 1.0;
  const podPoints = Math.round(podRatio * 20);

  // 4. Dispute-Free Settlement Compliance (Weight: 10 pts)
  const disputeRatio = totalSettlements > 0 ? disputedSettlements / totalSettlements : 0;
  const disputePoints = Math.round(Math.max(0, 1 - disputeRatio) * 10);

  // 5. Margin Stability (Weight: 10 pts)
  const negMarginRatio = totalAssigned > 0 ? negativeMarginTransports / totalAssigned : 0;
  const stabilityPoints = Math.round(Math.max(0, 1 - negMarginRatio) * 10);

  const totalScore = Math.min(
    Math.max(operationalPoints + cancellationPoints + podPoints + disputePoints + stabilityPoints, 0),
    100
  );

  let badge = "GÜVENİLİR TAŞIYICI";
  if (totalScore >= 90) badge = "TORK ELITE TAŞIYICI";
  else if (totalScore >= 75) badge = "DOĞRULANMIŞ TAŞIYICI";
  else if (totalScore < 50) badge = "RİSKLİ TAŞIYICI";

  return {
    score: totalScore,
    status: "calculated",
    label: badge,
    breakdown: {
      operationalReliability: Math.round(completionRatio * 100),
      podSuccessRate: Math.round(podRatio * 100),
      cancellationRate: Math.round(cancelRatio * 100),
      settlementDisputeRate: Math.round(disputeRatio * 100),
    },
  };
}
