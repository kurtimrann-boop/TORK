/**
 * TORK — Financial Integrity Service (Sprint 6)
 * 
 * Performs 7-point automated auditing across transports, settlements, and wallet ledger.
 */

export function runFinancialIntegrityAudit({
  transports = [],
  settlements = [],
  walletTransactions = [],
  documents = [],
}) {
  const checks = [];
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;

  // 1. CHECK_01: Every PAID settlement has corresponding wallet ledger entry
  const paidSettlements = settlements.filter((s) => s.status === "paid");
  const missingPaidTxs = paidSettlements.filter(
    (s) => !walletTransactions.some((tx) => tx.settlement_id === s.id && tx.status === "completed")
  );

  if (missingPaidTxs.length === 0) {
    checks.push({
      id: "CHECK_01_PAID_SETTLEMENT_LEDGER",
      name: "Ödenmiş Mutabakat Cüzdan Kaydı Eşleşmesi",
      status: "PASS",
      detail: `${paidSettlements.length} adet ödenmiş mutabakatın tamamı cüzdan defteri ile eşleşiyor.`,
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_01_PAID_SETTLEMENT_LEDGER",
      name: "Ödenmiş Mutabakat Cüzdan Kaydı Eşleşmesi",
      status: "FAIL",
      detail: `${missingPaidTxs.length} ödenmiş mutabakatın cüzdan defter kaydı bulunamadı.`,
    });
    failCount++;
  }

  // 2. CHECK_02: Completed wallet credit has corresponding PAID settlement
  const completedWalletCredits = walletTransactions.filter((tx) => tx.status === "completed" && tx.type === "settlement_payout");
  const orphanCredits = completedWalletCredits.filter(
    (tx) => !settlements.some((s) => s.id === tx.settlement_id && s.status === "paid")
  );

  if (orphanCredits.length === 0) {
    checks.push({
      id: "CHECK_02_WALLET_SETTLEMENT_INTEGRITY",
      name: "Cüzdan Hakediş Yetki Doğrulaması",
      status: "PASS",
      detail: "Tüm tamamlanmış cüzdan hakedişleri onaylı 'paid' mutabakatlara dayanıyor.",
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_02_WALLET_SETTLEMENT_INTEGRITY",
      name: "Cüzdan Hakediş Yetki Doğrulaması",
      status: "FAIL",
      detail: `${orphanCredits.length} cüzdan hakedişi yetkisiz/ödenmemiş mutabakata bağlı.`,
    });
    failCount++;
  }

  // 3. CHECK_03: Disputed settlements are strictly excluded from available balance
  const disputedSettlements = settlements.filter((s) => s.status === "disputed");
  const leakedDisputes = disputedSettlements.filter((s) =>
    walletTransactions.some((tx) => tx.settlement_id === s.id && tx.status === "completed")
  );

  if (leakedDisputes.length === 0) {
    checks.push({
      id: "CHECK_03_DISPUTE_ISOLATION",
      name: "Uyuşmazlık Bakiye İzolasyonu",
      status: "PASS",
      detail: `${disputedSettlements.length} uyuşmazlık dosyasının tamamı kullanılabilir bakiyeden izole edildi.`,
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_03_DISPUTE_ISOLATION",
      name: "Uyuşmazlık Bakiye İzolasyonu",
      status: "FAIL",
      detail: `${leakedDisputes.length} uyuşmazlıklı mutabakat bakiyeye sızmış durumda.`,
    });
    failCount++;
  }

  // 4. CHECK_04: No duplicate settlement payments
  const settlementIdCounts = new Map();
  let duplicateCount = 0;
  for (const tx of completedWalletCredits) {
    const count = (settlementIdCounts.get(tx.settlement_id) || 0) + 1;
    settlementIdCounts.set(tx.settlement_id, count);
    if (count > 1) duplicateCount++;
  }

  if (duplicateCount === 0) {
    checks.push({
      id: "CHECK_04_IDEMPOTENT_PAYMENT",
      name: "Mükerrer Ödeme Koruması (Idempotency)",
      status: "PASS",
      detail: "Hiçbir sefere mükerrer ödeme yapılmadı (0 duplicate).",
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_04_IDEMPOTENT_PAYMENT",
      name: "Mükerrer Ödeme Koruması (Idempotency)",
      status: "FAIL",
      detail: `${duplicateCount} adet mükerrer ödeme tespit edildi.`,
    });
    failCount++;
  }

  // 5. CHECK_05: Settlement amount matches transport bid amount
  let amountMismatchCount = 0;
  for (const s of settlements) {
    const tr = transports.find((t) => t.id === s.transport_id);
    if (tr && tr.estimated_bid_amount && Number(tr.estimated_bid_amount) !== Number(s.settlement_amount)) {
      amountMismatchCount++;
    }
  }

  if (amountMismatchCount === 0) {
    checks.push({
      id: "CHECK_05_AMOUNT_INTEGRITY",
      name: "Navlun Tutar Tutarlılığı",
      status: "PASS",
      detail: "Tüm mutabakat tutarları kabul edilen teklif tutarları ile %100 uyuşuyor.",
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_05_AMOUNT_INTEGRITY",
      name: "Navlun Tutar Tutarlılığı",
      status: "WARNING",
      detail: `${amountMismatchCount} mutabakatın tutarı teklif tutarı ile farklılık gösteriyor.`,
    });
    warningCount++;
  }

  // 6. CHECK_06: Paid settlement transport is delivered/settled
  let paidUndeliveredCount = 0;
  for (const s of paidSettlements) {
    const tr = transports.find((t) => t.id === s.transport_id);
    if (tr && tr.status !== "delivered" && tr.status !== "settled") {
      paidUndeliveredCount++;
    }
  }

  if (paidUndeliveredCount === 0) {
    checks.push({
      id: "CHECK_06_DELIVERY_BEFORE_PAID",
      name: "Teslimat Öncesi Ödeme Engeli",
      status: "PASS",
      detail: "Ödemesi yapılan tüm seferlerin teslimatı tamamlanmıştır.",
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_06_DELIVERY_BEFORE_PAID",
      name: "Teslimat Öncesi Ödeme Engeli",
      status: "FAIL",
      detail: `${paidUndeliveredCount} teslim edilmemiş sefere erken ödeme yapılmış.`,
    });
    failCount++;
  }

  // 7. CHECK_07: Delivered transport has verified POD
  let deliveredWithoutVerifiedPodCount = 0;
  const deliveredTransports = transports.filter((t) => t.status === "delivered" || t.status === "settled");
  for (const tr of deliveredTransports) {
    const hasVerified = documents.some((d) => d.transport_id === tr.id && d.document_type === "POD" && d.verification_status === "verified");
    if (!hasVerified) {
      deliveredWithoutVerifiedPodCount++;
    }
  }

  if (deliveredWithoutVerifiedPodCount === 0) {
    checks.push({
      id: "CHECK_07_VERIFIED_POD_GATE",
      name: "Teslim Edilen Taşımalarda POD Doğrulama Kapısı",
      status: "PASS",
      detail: "Teslim edilmiş tüm taşımalar geçerli ve doğrulanmış POD belgesine sahip.",
    });
    passCount++;
  } else {
    checks.push({
      id: "CHECK_07_VERIFIED_POD_GATE",
      name: "Teslim Edilen Taşımalarda POD Doğrulama Kapısı",
      status: "WARNING",
      detail: `${deliveredWithoutVerifiedPodCount} teslim edilmiş taşımanın doğrulanmış POD belgesi henüz tamamlanmadı.`,
    });
    warningCount++;
  }

  const overallStatus = failCount > 0 ? "FAIL" : warningCount > 0 ? "WARNING" : "PASS";

  return {
    passCount,
    warningCount,
    failCount,
    overallStatus,
    checks,
  };
}
