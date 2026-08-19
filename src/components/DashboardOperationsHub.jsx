"use client";

import React, { useMemo } from "react";
import MiniLiveMap from "./MiniLiveMap";
import ExecutiveIntelligencePanel from "./ExecutiveIntelligencePanel";

export default function DashboardOperationsHub({
  userDashboard,
  userLocation = null,
  onNavigate,
  onResetCreateForm,
  counts = {},
  loads = [],
  myLoads = [],
  bids = [],
  activeTransports = [],
  walletBalance = 0,
}) {
  const isShipper = userDashboard?.role === "shipper";
  const isCarrier = userDashboard?.role === "carrier";
  const isAdmin = userDashboard?.role === "admin" || userDashboard?.role === "operator";

  // KPI Calculations
  const activeLoadsCount = isShipper
    ? myLoads.filter((l) => l.status === "open").length
    : loads.length;

  const pendingBidsCount = isShipper
    ? bids.filter((b) => b.status === "pending").length
    : bids.length;

  const transportsCount = activeTransports.filter(
    (t) => t.status !== "delivered" && t.status !== "cancelled"
  ).length;

  const formattedWallet = `₺${Number(walletBalance || 0).toLocaleString("tr-TR")}`;

  return (
    <div className="space-y-4 sm:space-y-5 select-none max-w-7xl mx-auto">
      {/* =========================================================
          1. HERO COMPOSITION: LIVE OPERATIONS MAP + SIDE INTELLIGENCE
          MAP: 8 Columns | INTELLIGENCE: 4 Columns (Independent Surfaces)
         ========================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 items-stretch">
        {/* LEFT (8 COLS): Live Operations Map (Hero Surface with Real User Marker) */}
        <div className="lg:col-span-8">
          <MiniLiveMap
            coords={userLocation?.coords || null}
            locationName={userLocation?.city || "Mevcut Konum"}
            className="h-[300px] sm:h-[340px] w-full"
            routeDistanceKm={516}
            routeDurationText="5 sa 40 dk"
          />
        </div>

        {/* RIGHT (4 COLS): Executive Side Intelligence Panel */}
        <div className="lg:col-span-4 flex flex-col">
          <ExecutiveIntelligencePanel
            userDashboard={userDashboard}
            loads={loads}
            myLoads={myLoads}
            bids={bids}
            activeTransports={activeTransports}
            onNavigate={onNavigate}
            onResetCreateForm={onResetCreateForm}
            className="h-full min-h-[300px] sm:min-h-[340px]"
          />
        </div>
      </div>

      {/* =========================================================
          2. CONSOLIDATED 4-METRIC KPI ROW (Compact ~88px)
         ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1 */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm transition hover:border-[#4B5563]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A0AEC0]">
            {isShipper ? "Aktif İlanlarım" : isCarrier ? "Uygun Yükler" : "Açık İlanlar"}
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#F3F4F6]">
            {activeLoadsCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[#A0AEC0]">
            {isShipper ? "Pazaryerinde yayında" : "Piyasa genelinde açık"}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-[#F5A400]/40 bg-[#1F2937] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm transition hover:border-[#F5A400]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#F5A400]">
            {isShipper ? "Gelen Teklifler" : isCarrier ? "Tekliflerim" : "Bekleyen Teklifler"}
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#F5A400]">
            {pendingBidsCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[#A0AEC0]">
            {isShipper ? "İnceleme bekliyor" : "Verdiğiniz teklifler"}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm transition hover:border-[#4B5563]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#F3F4F6]">
            {isShipper ? "Atanan Taşımalar" : "Aktif Taşımalar"}
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#F3F4F6]">
            {transportsCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[#A0AEC0]">
            Devam eden seferler
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm transition hover:border-[#4B5563]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A0AEC0]">
            {isShipper ? "Cüzdan Bakiyesi" : "Kullanılabilir Bakiye"}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-400">
            {formattedWallet}
          </div>
          <div className="mt-0.5 text-[11px] text-[#A0AEC0]">
            Kullanılabilir fon
          </div>
        </div>
      </div>

      {/* =========================================================
          3. MAIN 8/4 OPERATIONAL GRID (Unified Operations Layer)
         ========================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (8 COLS): Primary Workload (Loads & Bids) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#374151]/50">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#F3F4F6]">
                  {isShipper ? "Öncelikli İlanlar ve Teklifler" : "Yüksek Marjlı Fırsat Yükleri"}
                </h3>
                <p className="text-xs text-[#A0AEC0]">
                  {isShipper
                    ? "İşlem bekleyen açık yükleriniz ve teklif kırılımları"
                    : "Bölgeniz ve aracınız için eşleşen kârlı seferler"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(isShipper ? "loads" : "board")}
                className="text-xs font-bold text-[#F5A400] hover:underline"
              >
                Tümünü Gör →
              </button>
            </div>

            {/* Quick List Feed */}
            <div className="mt-3.5 space-y-2.5">
              {isShipper ? (
                myLoads.length > 0 ? (
                  myLoads.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-lg bg-[#111827] border border-[#374151] p-3 hover:border-[#4B5563] transition"
                    >
                      <div>
                        <div className="text-xs font-black text-[#F3F4F6]">
                          {l.origin_province} → {l.destination_province}
                        </div>
                        <div className="text-[11px] text-[#A0AEC0] font-mono">
                          {l.weight_tons} Ton · {l.vehicle_type} · ₺{Number(l.price_expectation || 0).toLocaleString("tr-TR")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {l.status === "open" ? "Yayında" : l.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate("loads")}
                          className="text-[11px] font-bold text-[#F5A400] hover:underline"
                        >
                          Yönet
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[#A0AEC0]">
                    Henüz açık yük ilanınız bulunmuyor. Hemen yeni ilan verin.
                  </div>
                )
              ) : loads.length > 0 ? (
                loads.slice(0, 4).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-lg bg-[#111827] border border-[#374151] p-3 hover:border-[#4B5563] transition"
                  >
                    <div>
                      <div className="text-xs font-black text-[#F3F4F6]">
                        {l.origin_province} → {l.destination_province}
                        {l.is_return_load && (
                          <span className="ml-2 text-[10px] font-black text-[#F5A400] bg-[#F5A400]/10 border border-[#F5A400]/30 px-1.5 py-0.2 rounded">
                            DÖNÜŞ YÜKÜ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A0AEC0] font-mono">
                        {l.weight_tons} Ton · {l.vehicle_type} · Hedef: ₺{Number(l.price_expectation || 0).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("board")}
                      className="tork-btn-primary text-[11px] font-bold py-1 px-2.5 shadow-sm"
                    >
                      Teklif Ver
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#A0AEC0]">
                  Pazaryeri taranıyor. Uygun yükler anlık olarak listelenir.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS): Sticky Primary Action & Operational Telemetry */}
        <div className="lg:col-span-4 space-y-4 sticky top-4">
          {/* PRIMARY ACTION CARD */}
          <div className="rounded-xl border border-[#F5A400]/40 bg-[#1F2937] p-4 sm:p-5 shadow-lg shadow-[#F5A400]/5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A0AEC0] mb-2">
              Hızlı Başlat
            </div>

            {isShipper ? (
              <button
                type="button"
                onClick={() => {
                  if (onResetCreateForm) onResetCreateForm();
                  if (onNavigate) onNavigate("create");
                }}
                className="w-full tork-btn-primary text-sm font-black py-3 px-4 flex items-center justify-center gap-2 shadow-lg"
              >
                <span>+ Yeni Yük İlanı</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate("board");
                }}
                className="w-full tork-btn-primary text-sm font-black py-3 px-4 flex items-center justify-center gap-2 shadow-lg"
              >
                <span>🎯</span>
                <span>Açık Yükleri Gör</span>
              </button>
            )}

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#A0AEC0]">
              <span>{isShipper ? "Anında Taşıyıcı Teklifleri" : "Yüksek Kârlı Rotalar"}</span>
              <span className="font-mono text-emerald-400 font-bold">● Canlı Ağ</span>
            </div>
          </div>

          {/* ACTIVE TRANSPORT / CORRIDOR TELEMETRY CARD */}
          <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#A0AEC0] font-bold uppercase tracking-wider text-[10px]">
              <span>Operasyonel Durum</span>
              <span className="text-emerald-400 font-mono">NORMAL</span>
            </div>
            <div className="text-xs text-[#F3F4F6] font-medium">
              KGM Otoyol Ağı & Geçiş Güzergâhları Açık
            </div>
            <div className="pt-2 border-t border-[#374151] flex items-center justify-between text-[11px] text-[#A0AEC0]">
              <span>Yakıt Modeli:</span>
              <span className="font-mono font-bold text-[#F5A400]">Tonaj Kalibrasyonlu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
