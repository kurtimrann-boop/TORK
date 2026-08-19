/**
 * TORK — Trust & Risk Engine (Sprint 6)
 * 
 * Computes deterministic operational, financial, and data integrity risk scores.
 * Standardized Risk Levels:
 *   0–24:  LOW
 *  25–49:  MEDIUM
 *  50–74:  HIGH
 *  75–100: CRITICAL
 */

export const RISK_THRESHOLDS = {
  LOW_MAX: 24,
  MEDIUM_MAX: 49,
  HIGH_MAX: 74,
  CRITICAL_MIN: 75,
};

export function getRiskLevelFromScore(score) {
  const boundedScore = Math.min(Math.max(Number(score) || 0, 0), 100);
  if (boundedScore <= RISK_THRESHOLDS.LOW_MAX) return "LOW";
  if (boundedScore <= RISK_THRESHOLDS.MEDIUM_MAX) return "MEDIUM";
  if (boundedScore <= RISK_THRESHOLDS.HIGH_MAX) return "HIGH";
  return "CRITICAL";
}

/**
 * Evaluates operational & data integrity risk for a transport record
 */
export function evaluateTransportRisk(transport, documents = [], settlement = null) {
  if (!transport) {
    return {
      score: 0,
      level: "LOW",
      reasons: [],
      recommendedAction: "Kayıt mevcut değil",
    };
  }

  let riskScore = 0;
  const reasons = [];

  const status = transport.status;
  const hasPod = documents.some((d) => d.document_type === "POD");
  const hasVerifiedPod = documents.some((d) => d.document_type === "POD" && d.verification_status === "verified");

  // 1. Delivered without verified POD (Critical Data Integrity Risk)
  if (status === "delivered" && !hasVerifiedPod) {
    if (!hasPod) {
      riskScore += 45;
      reasons.push("Teslimat tamamlandı ancak POD belgesi yüklenmedi.");
    } else {
      riskScore += 30;
      reasons.push("POD yüklendi fakat henüz doğrulanmadı.");
    }
  }

  // 2. Transport prolonged in pickup_pending or in_transit
  if (status === "pickup_pending" && transport.created_at) {
    const elapsedHours = (Date.now() - new Date(transport.created_at).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > 24) {
      riskScore += 25;
      reasons.push("Yükleme aşamasında 24 saatten uzun süredir bekliyor.");
    }
  } else if (status === "in_transit" && transport.started_at) {
    const elapsedHours = (Date.now() - new Date(transport.started_at).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > 48) {
      riskScore += 20;
      reasons.push("Taşıma 48 saatten uzun süredir seyir halinde.");
    }
  }

  // 3. Settlement Discrepancy & Dispute
  if (settlement) {
    if (settlement.status === "disputed") {
      riskScore += 40;
      reasons.push("Mutabakat üzerinde aktif bir finansal uyuşmazlık bulunuyor.");
    }

    if (settlement.actual_profit !== null && settlement.actual_profit < 0) {
      riskScore += 25;
      reasons.push(`Negatif sefer kârlılığı tespit edildi (₺${settlement.actual_profit}).`);
    }

    if (settlement.status === "paid" && status !== "delivered" && status !== "settled") {
      riskScore += 50;
      reasons.push("Teslim edilmemiş taşıma için ödeme yapılmış görünüyor.");
    }
  }

  const finalScore = Math.min(riskScore, 100);
  const level = getRiskLevelFromScore(finalScore);

  let recommendedAction = "Normal izleme.";
  if (level === "CRITICAL") {
    recommendedAction = "Acil operasyon müdahalesi: POD ve finansal durum teyit edilmeli.";
  } else if (level === "HIGH") {
    recommendedAction = "Taşıyıcı ve yük veren ile iletişime geçilmeli.";
  } else if (level === "MEDIUM") {
    recommendedAction = "POD doğrulama veya durum güncellemesi bekleniyor.";
  }

  return {
    score: finalScore,
    level,
    reasons,
    recommendedAction,
  };
}

/**
 * Evaluates carrier historical operational risk
 */
export function evaluateCarrierRisk(carrierHistory = {}) {
  const {
    totalTransports = 0,
    cancelledTransports = 0,
    disputedSettlements = 0,
    unverifiedPods = 0,
    negativeProfitOperations = 0,
  } = carrierHistory;

  if (totalTransports === 0) {
    return {
      score: 0,
      level: "LOW",
      reasons: ["Henüz operasyonel geçmiş bulunmuyor."],
      recommendedAction: "Yeni taşıyıcı standart izleme protokolü.",
    };
  }

  let riskScore = 0;
  const reasons = [];

  // Cancellation ratio
  const cancelRatio = cancelledTransports / totalTransports;
  if (cancelRatio > 0.25) {
    riskScore += 35;
    reasons.push(`Yüksek iptal oranı: %${Math.round(cancelRatio * 100)}`);
  } else if (cancelRatio > 0.10) {
    riskScore += 20;
    reasons.push(`Dikkat çeken iptal oranı: %${Math.round(cancelRatio * 100)}`);
  }

  // Dispute ratio
  const disputeRatio = disputedSettlements / totalTransports;
  if (disputeRatio > 0.15) {
    riskScore += 30;
    reasons.push(`Sık uyuşmazlık: %${Math.round(disputeRatio * 100)} mutabakat itirazı.`);
  }

  // POD rejection ratio
  if (unverifiedPods > 2) {
    riskScore += 25;
    reasons.push(`${unverifiedPods} adet reddedilen veya geçersiz POD kaydı.`);
  }

  // Negative profit ratio
  if (negativeProfitOperations > 2) {
    riskScore += 15;
    reasons.push(`${negativeProfitOperations} operasyonda gerçekleşen maliyet navlunu aştı.`);
  }

  const finalScore = Math.min(riskScore, 100);
  const level = getRiskLevelFromScore(finalScore);

  return {
    score: finalScore,
    level,
    reasons,
    recommendedAction: level === "CRITICAL" ? "Taşıyıcı hesabı geçici incelemeye alınmalı." : "Rutin operasyonel izleme.",
  };
}
