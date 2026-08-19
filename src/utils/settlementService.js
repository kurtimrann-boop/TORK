/**
 * TORK — Settlement Service & State Machine (Sprint 5)
 * 
 * Handles canonical settlement lifecycle, state machine transitions,
 * POD verification gating, actuals calculation, and dispute management.
 */

export const VALID_SETTLEMENT_TRANSITIONS = {
  draft: ["pending_pod", "cancelled"],
  pending_pod: ["ready", "cancelled", "disputed"],
  ready: ["approved", "disputed", "cancelled"],
  approved: ["paid", "disputed", "cancelled"],
  disputed: ["ready", "approved", "cancelled"],
  paid: [],
  cancelled: [],
};

/**
 * Calculates precise settlement financials with floating-point safety
 */
export function calculateSettlementAmounts({
  bidAmount,
  actualCost = null,
  estimatedCost = null,
}) {
  const numBid = Number(bidAmount);
  if (!Number.isFinite(numBid) || numBid < 0) {
    throw new Error("Geçersiz navlun teklif tutarı.");
  }

  const roundedBid = Math.round(numBid * 100) / 100;
  const numActual = actualCost !== null && Number.isFinite(Number(actualCost)) ? Number(actualCost) : null;
  const roundedActual = numActual !== null ? Math.round(numActual * 100) / 100 : null;
  const numEstimated = estimatedCost !== null && Number.isFinite(Number(estimatedCost)) ? Number(estimatedCost) : null;
  const roundedEstimated = numEstimated !== null ? Math.round(numEstimated * 100) / 100 : null;

  let actualProfit = null;
  let actualMarginPercent = null;
  let isEstimatedOnly = false;

  if (roundedActual !== null) {
    actualProfit = Math.round((roundedBid - roundedActual) * 100) / 100;
    actualMarginPercent = roundedBid > 0 ? Math.round((actualProfit / roundedBid) * 1000) / 10 : 0;
  } else if (roundedEstimated !== null) {
    isEstimatedOnly = true;
  }

  return {
    bidAmount: roundedBid,
    settlementAmount: roundedBid,
    actualCost: roundedActual,
    estimatedCost: roundedEstimated,
    actualProfit,
    actualMarginPercent,
    isEstimatedOnly,
  };
}

/**
 * Validates a requested transition in the settlement state machine
 */
export function validateSettlementTransition(
  currentStatus,
  targetStatus,
  {
    transportStatus = null,
    hasVerifiedPod = false,
    isPaid = false,
  } = {}
) {
  if (!currentStatus || !targetStatus) {
    return {
      isValid: false,
      error: "Mevcut durum veya hedef durum belirtilmedi.",
      code: "INVALID_ARGUMENTS",
    };
  }

  const allowedNext = VALID_SETTLEMENT_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(targetStatus)) {
    return {
      isValid: false,
      error: `Geçersiz mutabakat durum geçişi: ${currentStatus} -> ${targetStatus}.`,
      code: "INVALID_TRANSITION",
    };
  }

  // POD Gate: Transition to 'ready' or 'approved' requires transport delivered and verified POD
  if (targetStatus === "ready" || targetStatus === "approved") {
    if (transportStatus && transportStatus !== "delivered" && transportStatus !== "settled") {
      return {
        isValid: false,
        error: "Taşıma teslim edilmeden (delivered) mutabakat hazır (ready) durumuna geçirilemez.",
        code: "TRANSPORT_NOT_DELIVERED",
      };
    }

    if (!hasVerifiedPod) {
      return {
        isValid: false,
        error: "Doğrulanmış Teslimat Kanıtı (POD) bulunmadan mutabakat hazır (ready) durumuna geçirilemez.",
        code: "POD_NOT_VERIFIED",
      };
    }
  }

  // Payout Gate: Transition to 'paid' requires status to be 'approved'
  if (targetStatus === "paid" && currentStatus !== "approved") {
    return {
      isValid: false,
      error: "Ödeme yapılabilmesi için mutabakatın önce onaylanmış (approved) olması gerekir.",
      code: "SETTLEMENT_NOT_APPROVED",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}
