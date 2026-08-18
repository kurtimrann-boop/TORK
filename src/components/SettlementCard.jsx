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

  const handleDisputeSubmit = () => {
    if (!disputeReason.trim()) return;
    if (onReportDispute) onReportDispute(disputeReason);
    setShowDisputeInput(false);
    setDisputeReason("");
  };

  const getStatusBadge = () => {
    switch (status) {
      case "approved":
        return { label: "✓ MUTABAKAT ONAYLANDI", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
      case "paid":
        return { label: "✓ ÖDEME YAPILDI", color: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" };
      case "ready":
        return { label: "⚡ ONAYA HAZIR", color: "border-teal-500/30 bg-teal-500/10 text-teal-300" };
      case "pending_pod":
        return { label: "○ POD BEKLENİYOR", color: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
      case "disputed":
        return { label: "⚠️ UYUŞMAZLIK BİLDİRİLDİ", color: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
      default:
        return { label: "○ TASLAK", color: "border-slate-500/30 bg-slate-500/10 text-slate-400" };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F1723]/90 p-5 sm:p-6 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/8">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
            {isShipper ? "Yük Veren Mutabakat Paneli" : "Taşıyıcı Hakediş & Mutabakat"}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
            Sefer Mutabakat Kaydı
          </h3>
        </div>

        <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-wider ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="mt-5 space-y-4">
        {/* CARRIER VIEW: Shows full financial breakdown */}
        {!isShipper && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Teklif Tutarı</div>
              <div className="text-base sm:text-lg font-black text-slate-100 mt-1">
                {formatCurrencyTR(bid_amount)}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Tahmini Maliyet</div>
              <div className="text-base sm:text-lg font-bold text-slate-300 mt-1">
                {formatCurrencyTR(estimated_cost)}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Gerçekleşen Maliyet</div>
              <div className="text-base sm:text-lg font-black text-slate-200 mt-1">
                {actual_cost !== null ? formatCurrencyTR(actual_cost) : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Gerçekleşen Kâr</div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                {actual_profit !== null ? formatCurrencyTR(actual_profit) : formatCurrencyTR(estimated_profit)}
              </div>
            </div>
          </div>
        )}

        {/* SHIPPER VIEW: STRICT ISOLATION - ONLY shows agreed transport amount, POD and settlement status */}
        {isShipper && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase font-bold text-slate-400">Anlaşılan Navlun Tutarı</div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {formatCurrencyTR(settlement_amount || bid_amount)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">KDV dahil nihai taşıma bedeli</div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase font-bold text-slate-400">Teslimat & POD Durumu</div>
              <div className="text-sm font-black text-slate-200 mt-1">
                {status === "pending_pod" ? "○ POD Belgesi Bekleniyor" : "✓ POD Belgesi Doğrulandı"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Islak imzalı teslim fişi</div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase font-bold text-slate-400">Mutabakat Durumu</div>
              <div className="text-sm font-black text-slate-200 mt-1">
                {status === "approved" || status === "paid" ? "✓ Onaylandı" : "Onay Bekleniyor"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">TORK Güvenceli Mutabakat</div>
            </div>
          </div>
        )}

        {/* SHIPPER ACTIONS */}
        {isShipper && status !== "approved" && status !== "paid" && status !== "disputed" && (
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onApproveSettlement}
              disabled={status === "pending_pod"}
              className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-5 py-3 text-xs font-black text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              ✓ Mutabakatı Onayla
            </button>

            <button
              onClick={() => setShowDisputeInput(!showDisputeInput)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
            >
              Uyuşmazlık Bildir
            </button>
          </div>
        )}

        {/* Dispute Input Section */}
        {showDisputeInput && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
            <div className="text-xs font-black text-rose-400">Uyuşmazlık Sebebi ve Sefer Notu</div>
            <textarea
              rows={2}
              placeholder="Örn: Yükte hasar veya eksik teslimat tespiti..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="tork-input w-full px-3 py-2 text-xs resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDisputeSubmit}
                className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-black text-rose-300 hover:bg-rose-500/30"
              >
                Uyuşmazlık Talebini İlet
              </button>
              <button
                onClick={() => setShowDisputeInput(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-white/10"
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
