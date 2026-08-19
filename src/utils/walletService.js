/**
 * TORK — Carrier Wallet Service (Sprint 5)
 * 
 * Aggregates carrier wallet balances directly from canonical database settlement records.
 * Strictly prevents double-counting and adheres to deterministic financial rules.
 */

/**
 * Calculates carrier wallet summary based on settled items
 * 
 * Business Rules:
 *  - PAID settlements -> Available Balance & Total Earned
 *  - APPROVED / READY settlements -> Pending Balance
 *  - DRAFT / PENDING_POD -> Excluded from wallet
 *  - DISPUTED -> Excluded from available balance (flagged separately)
 *  - CANCELLED -> Excluded completely
 */
export function calculateCarrierWallet(settlements = [], transactions = []) {
  let availableBalance = 0;
  let pendingBalance = 0;
  let totalEarned = 0;
  let disputedAmount = 0;

  const processedSettlementIds = new Set();
  const validTransactions = [];

  for (const s of settlements) {
    if (!s || !s.id || processedSettlementIds.has(s.id)) {
      continue; // Prevent duplicate settlement processing
    }
    processedSettlementIds.add(s.id);

    const amount = Number(s.settlement_amount ?? s.bid_amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const status = s.status || "draft";

    if (status === "paid") {
      availableBalance += amount;
      totalEarned += amount;
      validTransactions.push({
        id: `tx-paid-${s.id}`,
        settlement_id: s.id,
        transport_id: s.transport_id,
        type: "settlement_payout",
        amount,
        status: "completed",
        date: s.paid_at || s.updated_at || s.created_at,
        route: s.route || (s.transports?.loads ? `${s.transports.loads.origin} → ${s.transports.loads.destination}` : "Sefer Mutabakatı"),
      });
    } else if (status === "approved" || status === "ready") {
      pendingBalance += amount;
      validTransactions.push({
        id: `tx-pending-${s.id}`,
        settlement_id: s.id,
        transport_id: s.transport_id,
        type: "settlement_payout",
        amount,
        status: "pending",
        date: s.created_at,
        route: s.route || (s.transports?.loads ? `${s.transports.loads.origin} → ${s.transports.loads.destination}` : "Sefer Mutabakatı"),
      });
    } else if (status === "disputed") {
      disputedAmount += amount;
      validTransactions.push({
        id: `tx-dispute-${s.id}`,
        settlement_id: s.id,
        transport_id: s.transport_id,
        type: "settlement_payout",
        amount,
        status: "disputed",
        date: s.updated_at || s.created_at,
        route: s.route || (s.transports?.loads ? `${s.transports.loads.origin} → ${s.transports.loads.destination}` : "Sefer Mutabakatı"),
      });
    }
    // draft, pending_pod, cancelled are safely excluded
  }

  // Precision rounding
  return {
    availableBalance: Math.round(availableBalance * 100) / 100,
    pendingBalance: Math.round(pendingBalance * 100) / 100,
    totalEarned: Math.round(totalEarned * 100) / 100,
    disputedAmount: Math.round(disputedAmount * 100) / 100,
    totalSettlementsCount: settlements.length,
    processedCount: processedSettlementIds.size,
    transactions: validTransactions,
  };
}
