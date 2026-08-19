"use client";

import { useState } from "react";
import { formatCurrencyTR } from "../utils/turkish";

export default function SettlementCard({
  settlement = {},
  isShipper = false,
  onApproveSettlement = null,
  onReportDispute = null,
  isEligibleForApproval = false,
}) {
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const {
    bid_amount = 40000,
    settlement_amount = 40000,
    estimated_cost = 30813,
    actual_cost = null,
    estimated_profit = 9187,
    actual_profit = null,
    status = "ready", // draft, pending_pod, ready, approved, paid, disputed
  } = settlement;

  const costActual = actual_cost !== null ? actual_cost : estimated_cost;
  const profitActual = actual_profit !== null ? actual_profit : (bid_amount - costActual);
  const marginActual = bid_amount > 0 ? (profitActual / bid_amount) * 100 : 0;
  const marginEstimated = bid_amount > 0 ? (estimated_profit / bid_amount) * 100 : 0;
  const costVariance = actual_cost !== null ? actual_cost - estimated_cost : 0;
  const profitVariance = actual_profit !== null ? actual_profit - estimated_profit : 0;

  const handleDisputeSubmit = () => {
    if (!disputeReason.trim()) return;
    if (onReportDispute) onReportDispute(disputeReason);
    setShowDisputeInput(false);
    setDisputeReason("");
  };

  const getStatusBadge = () => {
    switch (status) {
      case "approved":
        return { label: "✓ MUTABAKAT ONAYLANDI", color: "border-[#F5A400]/40 bg-[#F5A400]/10 text-[#F5A400]" };
      case "paid":
        return { label: "✓ ÖDEME TAMAMLANDI", color: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]" };
      case "ready":
        return { label: "⚡ ONAYA HAZIR", color: "border-[#F5A400]/30 bg-[#F5A400]/10 text-[#F5A400]" };
      case "pending_pod":
        return { label: "○ POD BEKLENİYOR", color: "border-[#F5B94C]/40 bg-[#F5B94C]/10 text-[#F5B94C]" };
      case "disputed":
        return { label: "⚠️ UYUŞMAZLIK", color: "border-[#FF5C5C]/40 bg-[#FF5C5C]/10 text-[#FF5C5C]" };
      default:
        return { label: "○ TASLAK", color: "border-white/10 bg-white/[0.04] text-[#8C98A8]" };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.4)] select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F5A400]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5A400]">
              {isShipper ? "Yük Veren Mutabakat Paneli" : "Taşıyıcı Hakediş & Finansal Mutabakat"}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#F5F7FA] mt-1 tracking-[-0.03em]">
            Sefer Mutabakat Dosyası
          </h3>
        </div>

        <span className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wider ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-5">
        {/* =========================================================
            CARRIER VIEW: Full Financial Comparison
           ========================================================= */}
        {!isShipper && (
          <>
            {/* 5-Column Financial Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Teklif */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">Teklif</div>
                <div className="mt-1 text-lg sm:text-xl font-black text-[#F5F7FA]">
                  {formatCurrencyTR(bid_amount)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8C98A8]">Anlaşılan Navlun</div>
              </div>

              {/* 2. Tahmini Maliyet */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">Tahmini Maliyet</div>
                <div className="mt-1 text-lg sm:text-xl font-black text-[#8C98A8]">
                  {formatCurrencyTR(estimated_cost)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8C98A8]">Sefer Başlangıcı</div>
              </div>

              {/* 3. Gerçek Maliyet */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">Gerçek Maliyet</div>
                <div className="mt-1 text-lg sm:text-xl font-black text-[#F5F7FA]">
                  {actual_cost !== null ? formatCurrencyTR(actual_cost) : "—"}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8C98A8]">
                  {actual_cost !== null ? "Fiili Masraflar" : "Bekleniyor"}
                </div>
              </div>

              {/* 4. Gerçekleşen Kâr */}
              <div className="rounded-2xl border border-[#F5A400]/30 bg-[#F5A400]/[0.06] p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5A400]">Gerçekleşen Kâr</div>
                <div className="mt-1 text-lg sm:text-xl font-black text-[#F5A400]">
                  {formatCurrencyTR(profitActual)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#F5A400]/80">Net Sefer Kârı</div>
              </div>

              {/* 5. Gerçekleşen Marj */}
              <div className="rounded-2xl border border-[#F5A400]/30 bg-[#F5A400]/[0.06] p-4 text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5A400]">Gerçekleşen Marj</div>
                <div className="mt-1 text-lg sm:text-xl font-black text-[#F5A400]">
                  %{marginActual.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="mt-0.5 text-[10px] text-[#F5A400]/80">Kârlılık Oranı</div>
              </div>
            </div>

            {/* Estimated vs Actual Comparison Strip */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4 sm:p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
                Tahmin vs Gerçekleşen Karşılaştırması (Variance Audit)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/[0.04] bg-[#060B11] p-3 text-center">
                  <div className="text-[10px] font-bold text-[#8C98A8] uppercase">ESTIMATED (TAHMİN)</div>
                  <div className="mt-1 text-base font-black text-[#F5F7FA]">
                    Maliyet: {formatCurrencyTR(estimated_cost)} · Kâr: {formatCurrencyTR(estimated_profit)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.04] bg-[#060B11] p-3 text-center">
                  <div className="text-[10px] font-bold text-[#8C98A8] uppercase">ACTUAL (GERÇEKLEŞEN)</div>
                  <div className="mt-1 text-base font-black text-[#F5A400]">
                    Maliyet: {actual_cost !== null ? formatCurrencyTR(actual_cost) : "—"} · Kâr: {formatCurrencyTR(profitActual)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.04] bg-[#060B11] p-3 text-center">
                  <div className="text-[10px] font-bold text-[#8C98A8] uppercase">VARIANCE (SAPMA)</div>
                  <div className={`mt-1 text-base font-black ${
                    costVariance <= 0 ? "text-[#F5A400]" : "text-[#FF5C5C]"
                  }`}>
                    {costVariance === 0 ? "0 ₺ (Tam Uyum)" : `${costVariance > 0 ? "+" : ""}${formatCurrencyTR(costVariance)}`}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* =========================================================
            SHIPPER VIEW: STRICT PRIVACY ISOLATION
            Shows ONLY: Navlun, Teslimat, POD, Mutabakat Durumu, Onayla, Uyuşmazlık
           ========================================================= */}
        {isShipper && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5">
              <div className="text-[11px] uppercase font-bold text-[#8C98A8] tracking-wider">
                Anlaşılan Navlun Tutarı
              </div>
              <div className="text-2xl font-black text-[#F5A400] mt-1.5">
                {formatCurrencyTR(settlement_amount || bid_amount)}
              </div>
              <div className="text-xs text-[#8C98A8] mt-1">KDV dahil nihai taşıma bedeli</div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5">
              <div className="text-[11px] uppercase font-bold text-[#8C98A8] tracking-wider">
                Teslimat & POD Belgesi
              </div>
              <div className="text-base font-black text-[#F5F7FA] mt-1.5">
                {status === "pending_pod" ? "○ POD Belgesi Bekleniyor" : "✓ POD Belgesi Doğrulandı"}
              </div>
              <div className="text-xs text-[#8C98A8] mt-1">Islak imzalı teslimat kanıtı</div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5">
              <div className="text-[11px] uppercase font-bold text-[#8C98A8] tracking-wider">
                Mutabakat Durumu
              </div>
              <div className="text-base font-black text-[#F5F7FA] mt-1.5">
                {status === "approved" || status === "paid" ? "✓ Onaylandı" : "Onay Bekleniyor"}
              </div>
              <div className="text-xs text-[#8C98A8] mt-1">TORK Güvenceli Mutabakat</div>
            </div>
          </div>
        )}

        {/* SHIPPER ACTIONS */}
        {isShipper && status !== "approved" && status !== "paid" && status !== "disputed" && (
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onApproveSettlement}
              disabled={status === "pending_pod"}
              className="flex-1 rounded-xl bg-[#F5A400] px-6 py-3.5 text-xs font-black text-[#060B11] shadow-[0_0_24px_rgba(245,164,0,0.25)] hover:bg-[#D98200] disabled:opacity-40 disabled:pointer-events-none transition duration-150 active:scale-[0.99]"
            >
              ✓ Mutabakatı Onayla
            </button>

            <button
              onClick={() => {
                if (showDisputeInput) {
                  setDisputeReason("");
                }
                setShowDisputeInput(!showDisputeInput);
              }}
              className="rounded-xl border border-[#FF5C5C]/30 bg-[#FF5C5C]/10 px-5 py-3.5 text-xs font-bold text-[#FF5C5C] hover:bg-[#FF5C5C]/20 transition duration-150 active:scale-[0.99]"
            >
              Uyuşmazlık Bildir
            </button>
          </div>
        )}

        {/* Dispute Input Section */}
        {showDisputeInput && (
          <div className="rounded-2xl border border-[#FF5C5C]/30 bg-[#FF5C5C]/[0.06] p-5 space-y-3">
            <div className="text-xs font-bold text-[#FF5C5C]">Uyuşmazlık Sebebi ve Operasyon Notu</div>
            <textarea
              rows={3}
              placeholder="Örn: Yükte hasar veya teslimat saati gecikmesi..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="tork-input w-full px-3.5 py-2.5 text-xs resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDisputeSubmit}
                className="rounded-xl bg-[#FF5C5C] px-4 py-2 text-xs font-black text-[#060B11] hover:bg-[#ff4343]"
              >
                Uyuşmazlık Talebini İlet
              </button>
              <button
                onClick={() => {
                  setShowDisputeInput(false);
                  setDisputeReason("");
                }}
                className="rounded-xl border border-white/[0.08] bg-[#101923] px-4 py-2 text-xs font-bold text-[#8C98A8] hover:text-[#F5F7FA]"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
