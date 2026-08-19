/**
 * TORK — Operational Alert Engine (Sprint 6)
 * 
 * Generates actionable operational and compliance alerts for the Control Tower.
 */

global.__TORK_ALERTS__ = global.__TORK_ALERTS__ || [];

export function generateOperationalAlerts({
  transports = [],
  settlements = [],
  documents = [],
  carriers = [],
}) {
  const alerts = [];

  // 1. CRITICAL: Delivered without verified POD
  const deliveredTransports = transports.filter((t) => t.status === "delivered" || t.status === "settled");
  for (const tr of deliveredTransports) {
    const verifiedPod = documents.find((d) => d.transport_id === tr.id && d.document_type === "POD" && d.verification_status === "verified");
    if (!verifiedPod) {
      alerts.push({
        id: `alt-pod-missing-${tr.id}`,
        severity: "CRITICAL",
        alert_type: "POD_MISSING_FOR_DELIVERED",
        transportId: tr.id,
        carrierId: tr.carrier_id,
        message: `Teslim edilmiş sefer #${tr.id.slice(0, 8)} için doğrulanmış POD belgesi eksik.`,
        createdAt: tr.delivered_at || tr.updated_at || new Date().toISOString(),
        status: "active",
      });
    }
  }

  // 2. CRITICAL: Active Settlement Dispute
  const disputedSettlements = settlements.filter((s) => s.status === "disputed");
  for (const s of disputedSettlements) {
    alerts.push({
      id: `alt-disp-${s.id}`,
      severity: "CRITICAL",
      alert_type: "SETTLEMENT_DISPUTE_ACTIVE",
      transportId: s.transport_id,
      carrierId: s.carrier_id,
      settlementId: s.id,
      message: `Mutabakat #${s.id.slice(0, 8)} üzerinde uyuşmazlık bildirimi var, ödeme donduruldu.`,
      createdAt: s.updated_at || new Date().toISOString(),
      status: "active",
    });
  }

  // 3. HIGH: Settlement Ready but Awaiting Approval
  const readySettlements = settlements.filter((s) => s.status === "ready");
  for (const s of readySettlements) {
    alerts.push({
      id: `alt-ready-${s.id}`,
      severity: "HIGH",
      alert_type: "SETTLEMENT_AWAITING_APPROVAL",
      transportId: s.transport_id,
      carrierId: s.carrier_id,
      settlementId: s.id,
      message: `Mutabakat #${s.id.slice(0, 8)} onaya hazır durumda incelenmeyi bekliyor.`,
      createdAt: s.updated_at || new Date().toISOString(),
      status: "active",
    });
  }

  // 4. MEDIUM: POD Uploaded but Pending Verification
  const pendingPods = documents.filter((d) => d.document_type === "POD" && d.verification_status !== "verified");
  for (const doc of pendingPods) {
    alerts.push({
      id: `alt-pod-unverified-${doc.id || doc.transport_id}`,
      severity: "MEDIUM",
      alert_type: "POD_VERIFICATION_PENDING",
      transportId: doc.transport_id,
      message: `Yüklenen POD belgesi operatör doğrulaması bekliyor.`,
      createdAt: doc.created_at || new Date().toISOString(),
      status: "active",
    });
  }

  return alerts;
}

export function acknowledgeAlert(alertId, userId = null) {
  const alert = global.__TORK_ALERTS__.find((a) => a.id === alertId);
  if (alert) {
    alert.status = "acknowledged";
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;
    return alert;
  }
  return null;
}
