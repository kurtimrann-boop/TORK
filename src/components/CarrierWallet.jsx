"use client";

import React, { useEffect, useState } from "react";
import { formatCurrencyTR, formatRelativeTimeTR } from "../utils/turkish";
import { calculateCarrierWallet } from "../utils/walletService";
import StatusBadge from "./StatusBadge";

export default function CarrierWallet({
  carrierId = null,
  initialSettlements = [],
  isShipper = false,
  onViewTransport = null,
}) {
  const [settlements, setSettlements] = useState(initialSettlements);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("settlements"); // settlements | transactions
  const [disputeSettlementId, setDisputeSettlementId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Fetch live wallet data from API
  const refreshWallet = async () => {
    try {
      setLoading(true);
      const url = carrierId ? `/api/wallet?carrierId=${carrierId}` : "/api/wallet";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.settlements) && data.settlements.length > 0) {
        setSettlements(data.settlements);
      }
    } catch (err) {
      console.warn("Wallet fetch error, using local settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const url = carrierId ? `/api/wallet?carrierId=${carrierId}` : "/api/wallet";
        const res = await fetch(url);
        const data = await res.json();
        if (active && res.ok && data.success && Array.isArray(data.settlements) && data.settlements.length > 0) {
          setSettlements(data.settlements);
        }
      } catch (err) {
        console.warn("Wallet fetch error, using local settlements:", err);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [carrierId]);

  const walletSummary = calculateCarrierWallet(settlements);

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeSettlementId || !disputeReason.trim()) return;

    try {
      const res = await fetch(`/api/settlements/${disputeSettlementId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: disputeReason.trim(),
          userId: carrierId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDisputeSuccess(true);
        // Refresh local state
        setSettlements((prev) =>
          prev.map((s) => (s.id === disputeSettlementId ? { ...s, status: "disputed" } : s))
        );
        setTimeout(() => {
          setDisputeSettlementId(null);
          setDisputeReason("");
          setDisputeSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Dispute error:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Wallet Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#374151] pb-4">
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-[#F5A400]">
            TORK FİNANS VE HAKEDİŞ MERKEZİ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F3F4F6]">
            {isShipper ? "Ödemeler & Mutabakatlar" : "Taşıyıcı Cüzdanı"}
          </h1>
          <p className="mt-1 text-sm text-[#A0AEC0]">
            Tamamlanan seferlerin hakedişleri, bekleyen mutabakatlar ve finansal hareketlerin dökümü.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshWallet}
            disabled={loading}
            className="tork-btn-secondary text-xs"
          >
            {loading ? "Yenileniyor..." : "↻ Yenile"}
          </button>
        </div>
      </div>

      {/* 3 HERO BALANCE CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Available Balance */}
        <div className="rounded-xl border border-[#F5A400]/40 bg-[#F5A400]/10 p-6 shadow-xl relative overflow-hidden">
          <div className="text-xs font-black uppercase tracking-wider text-[#F5A400]">
            KULLANILABİLİR BAKİYE
          </div>
          <div className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[#F5A400] font-mono">
            ₺{walletSummary.availableBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-2 text-xs text-[#A0AEC0]">
            Ödemesi tamamlanmış, çekilebilir kesinleşmiş tutar.
          </p>
        </div>

        {/* Pending Balance */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-6 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
            BEKLEYEN HAKEDİŞLER
          </div>
          <div className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[#F3F4F6] font-mono">
            ₺{walletSummary.pendingBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-2 text-xs text-[#A0AEC0]">
            Teslim edilmiş ve mutabakat onayı bekleyen navlun tutarı.
          </p>
        </div>

        {/* Total Earned */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-6 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
            TOPLAM KAZANÇ
          </div>
          <div className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[#F3F4F6] font-mono">
            ₺{walletSummary.totalEarned.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-2 text-xs text-[#A0AEC0]">
            TORK platformunda bugüne kadar hak kazanılan toplam tutar.
          </p>
        </div>
      </div>

      {/* Disputed Alert Banner if any */}
      {walletSummary.disputedAmount > 0 && (
        <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-black text-[#F3F4F6]">İncelemede Olan Uyuşmazlık Tutarı:</span>{" "}
              ₺{walletSummary.disputedAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              <p className="text-[#A0AEC0] mt-0.5">Uyuşmazlık çözülene kadar bakiye geçici olarak dondurulur.</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION TABS: Settlements Table vs Transaction Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#374151] pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("settlements")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === "settlements"
                  ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
                  : "bg-[#1F2937] text-[#A0AEC0] hover:text-[#F3F4F6]"
              }`}
            >
              Sefer Mutabakatları ({settlements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === "transactions"
                  ? "bg-[#F5A400] text-[#111827] shadow-md shadow-[#F5A400]/20"
                  : "bg-[#1F2937] text-[#A0AEC0] hover:text-[#F3F4F6]"
              }`}
            >
              İşlem Geçmişi ({walletSummary.transactions.length})
            </button>
          </div>
        </div>

        {/* TAB 1: Settlements List */}
        {activeTab === "settlements" && (
          <div className="space-y-3">
            {settlements.length === 0 ? (
              <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-xs text-[#A0AEC0]">
                Henüz tamamlanmış veya aktif bir mutabakat kaydınız bulunmuyor.
              </div>
            ) : (
              settlements.map((s) => {
                const amount = Number(s.settlement_amount ?? s.bid_amount ?? 0);
                const cost = s.actual_cost !== null && s.actual_cost !== undefined ? Number(s.actual_cost) : (s.estimated_cost ? Number(s.estimated_cost) : null);
                const profit = cost !== null ? amount - cost : null;
                const margin = amount > 0 && profit !== null ? (profit / amount) * 100 : null;

                const getStatusBadge = (status) => {
                  switch (status) {
                    case "paid":
                      return { label: "ÖDENDİ", cls: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]" };
                    case "approved":
                      return { label: "ONAYLANDI", cls: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]" };
                    case "ready":
                      return { label: "ONAYA HAZIR", cls: "border-[#F5A400]/30 bg-[#F5A400]/10 text-[#F5A400]" };
                    case "pending_pod":
                      return { label: "POD BEKLENİYOR", cls: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]" };
                    case "disputed":
                      return { label: "UYUŞMAZLIK", cls: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]" };
                    case "cancelled":
                      return { label: "İPTAL EDİLDİ", cls: "border-[#374151] bg-[#111827] text-[#A0AEC0]" };
                    default:
                      return { label: "TASLAK", cls: "border-[#374151] bg-[#111827] text-[#A0AEC0]" };
                  }
                };

                const badge = getStatusBadge(s.status);

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-[#374151] bg-[#1F2937] p-4.5 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-[#A0AEC0]">
                            Mutabakat #{s.id?.slice(0, 8)}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-[11px] font-black border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-bold text-[#F3F4F6]">
                          {s.origin || "İstanbul"} → {s.destination || "Ankara"}
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-[11px] font-bold uppercase text-[#A0AEC0]">Net Tutar</div>
                        <div className="text-lg font-black font-mono text-[#F5A400]">
                          {formatCurrencyTR(amount)}
                        </div>
                      </div>
                    </div>

                    {cost !== null && (
                      <div className="pt-2 border-t border-[#374151] flex flex-wrap items-center gap-3 text-xs text-[#A0AEC0]">
                        <span>Gerçek Maliyet: <strong className="text-[#F3F4F6] font-mono">{formatCurrencyTR(cost)}</strong></span>
                        <span>•</span>
                        <span>Tahmini Kâr: <strong className="text-[#22C55E] font-mono">{formatCurrencyTR(profit)}</strong></span>
                        {margin !== null && (
                          <span>(%{Math.round(margin)} Marj)</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Transaction Ledger */}
        {activeTab === "transactions" && (
          <div className="space-y-3">
            {walletSummary.transactions.length === 0 ? (
              <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-xs text-[#A0AEC0]">
                Kayıtlı cüzdan hareketi bulunmuyor.
              </div>
            ) : (
              walletSummary.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#F3F4F6]">{tx.description}</div>
                    <div className="text-xs text-[#A0AEC0] mt-0.5">{formatRelativeTimeTR(tx.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black font-mono text-sm text-[#22C55E]">
                      +{formatCurrencyTR(tx.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
