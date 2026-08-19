"use client";

import React, { useMemo } from "react";

export default function ExecutiveIntelligencePanel({
  userDashboard,
  loads = [],
  myLoads = [],
  bids = [],
  activeTransports = [],
  onNavigate,
  onResetCreateForm,
  className = "",
}) {
  const role = userDashboard?.role || "shipper";
  const isShipper = role === "shipper";
  const isCarrier = role === "carrier";
  const isAdmin = role === "admin" || role === "operator";

  const intel = useMemo(() => {
    // -------------------------------------------------------------
    // CARRIER EXECUTIVE INTELLIGENCE
    // -------------------------------------------------------------
    if (isCarrier) {
      // Find highest yield opportunity or return load
      const opportunityLoad = loads.find(
        (l) => l.is_return_load || l.origin_province?.includes("Ankara") || l.price_expectation > 25000
      ) || loads[0];

      if (opportunityLoad) {
        const estRevenue = opportunityLoad.price_expectation || 36500;
        const estCost = Math.round(estRevenue * 0.68);
        const estProfit = estRevenue - estCost;
        const marginPct = Math.round((estProfit / estRevenue) * 100);

        return {
          badge: "FIRSAT İSTİHBARATI",
          badgeColor: "bg-[#F5A400]/20 text-[#F5A400] border-[#F5A400]/40",
          bigNumber: `+₺${estProfit.toLocaleString("tr-TR")}`,
          bigMessage: `${opportunityLoad.origin_province || "Ankara"} → ${opportunityLoad.destination_province || "İstanbul"}`,
          explanation: `%${marginPct} tahmini net kâr marjı · ${opportunityLoad.weight_tons || 24} Ton ${opportunityLoad.vehicle_type || "TIR"}`,
          actionLabel: "Hızlı Teklif Ver",
          actionTab: "board",
        };
      }

      if (activeTransports.length > 0) {
        const tr = activeTransports[0];
        return {
          badge: "CANLI SEFER",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          bigNumber: `#TR-${String(tr.id).slice(0, 4)}`,
          bigMessage: `${tr.origin_province || "İstanbul"} → ${tr.destination_province || "İzmir"}`,
          explanation: "Taşıma devam ediyor. Teslimatta POD yükleyerek hakedişi başlatın.",
          actionLabel: "Seferi Güncelle",
          actionTab: "transports",
        };
      }

      return {
        badge: "PİYASA İSTİHBARATI",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        bigNumber: "YÜK BORSASI",
        bigMessage: "Tüm Koridorlar Açık",
        explanation: "Bölgenize uygun yeni ilanları inceleyin ve hemen teklif verin.",
        actionLabel: "Açık Yükleri Gör",
        actionTab: "board",
      };
    }

    // -------------------------------------------------------------
    // SHIPPER EXECUTIVE INTELLIGENCE
    // -------------------------------------------------------------
    if (isShipper) {
      const pendingBids = bids.filter((b) => b.status === "pending");
      if (pendingBids.length > 0) {
        const lowestBid = Math.min(...pendingBids.map((b) => b.bid_amount || 36500));
        return {
          badge: "TEKLİF İSTİHBARATI",
          badgeColor: "bg-[#F5A400]/20 text-[#F5A400] border-[#F5A400]/40",
          bigNumber: `${pendingBids.length} YENİ TEKLİF`,
          bigMessage: `En İyi: ₺${lowestBid.toLocaleString("tr-TR")}`,
          explanation: "Taşıyıcı teklifleri süre, maliyet ve güven puanıyla hazır.",
          actionLabel: "Teklifleri Karşılaştır",
          actionTab: "bids",
        };
      }

      const openLoads = myLoads.filter((l) => l.status === "open");
      if (openLoads.length > 0) {
        return {
          badge: "CANLI İLAN",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          bigNumber: `${openLoads.length} AKTİF İLAN`,
          bigMessage: `${openLoads[0].origin_province || "İstanbul"} → ${openLoads[0].destination_province || "Ankara"}`,
          explanation: "Pazaryerinde yayında. Taşıyıcılardan teklifler toplanıyor.",
          actionLabel: "İlanları Yönet",
          actionTab: "loads",
        };
      }

      return {
        badge: "OPERASYONEL TAVSİYE",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        bigNumber: "YENİ İLAN",
        bigMessage: "2 Dakikada Fiyat Alın",
        explanation: "Yeni yük ilanı oluşturarak Türkiye genelinden en uygun navlun tekliflerini toplayın.",
        actionLabel: "+ Yeni Yük İlanı",
        actionTab: "create",
      };
    }

    // -------------------------------------------------------------
    // ADMIN / CONTROL TOWER EXECUTIVE INTELLIGENCE
    // -------------------------------------------------------------
    return {
      badge: "KRİTİK RİSK ALARMI",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
      bigNumber: "1 KRİTİK",
      bigMessage: "Sefer #TR-994 Riskte",
      explanation: "Teslimat tamamlandı ancak 48 saattir POD belgesi yüklenmedi.",
      actionLabel: "Müdahale Et",
      actionTab: "control-tower",
    };
  }, [isCarrier, isShipper, loads, myLoads, bids, activeTransports]);

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-[#374151] bg-[#1F2937] p-5 sm:p-6 shadow-xl transition hover:border-[#4B5563] ${className}`}
      aria-label="Executive Intelligence Command Panel"
    >
      {/* Top Badge & Header */}
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${intel.badgeColor}`}
          >
            {intel.badge}
          </span>
          <span className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider">
            Canlı Zekâ
          </span>
        </div>

        {/* ONE BIG NUMBER (28px–36px) */}
        <div className="mt-3 text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#F3F4F6]">
          {intel.bigNumber}
        </div>

        {/* ONE BIG MESSAGE (16px–20px) */}
        <div className="mt-1 text-base sm:text-lg font-black text-[#F5A400] truncate">
          {intel.bigMessage}
        </div>

        {/* ONE SHORT EXPLANATION (12px–13px) */}
        <p className="mt-2 text-xs text-[#A0AEC0] leading-relaxed line-clamp-2">
          {intel.explanation}
        </p>
      </div>

      {/* ONE DIRECT ACTION BUTTON */}
      <div className="mt-4 pt-3 border-t border-[#374151]/60">
        <button
          type="button"
          onClick={() => {
            if (intel.actionTab === "create" && onResetCreateForm) onResetCreateForm();
            if (onNavigate) onNavigate(intel.actionTab);
          }}
          className="w-full tork-btn-primary text-xs sm:text-sm font-black py-2.5 px-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <span>{intel.actionLabel}</span>
          <span className="text-sm font-black">→</span>
        </button>
      </div>
    </div>
  );
}
