"use client";

import { useState } from "react";

export default function RouteSummary({
  originLabel,
  destinationLabel,
  distanceText = "Henüz hesaplanmadı",
  durationText = "Henüz hesaplanmadı",
  fuelCostInfo = null,
}) {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  return (
    <div className="space-y-4">
      {/* 4 Core Route Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="tork-eyebrow mb-2">Nereden</div>
          <div className="text-sm font-bold text-[#F5F7FA]">
            {originLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="tork-eyebrow mb-2">Nereye</div>
          <div className="text-sm font-bold text-[#F5F7FA]">
            {destinationLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="tork-eyebrow mb-2">Mesafe</div>
          <div className="text-sm font-bold text-[#9AA7B5]">
            {distanceText}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="tork-eyebrow mb-2">Tahmini Süre</div>
          <div className="text-sm font-bold text-[#9AA7B5]">
            {durationText}
          </div>
        </div>
      </div>

      {/* Secondary Fuel Cost Engine Card (Hürmüz Phase 2) */}
      {fuelCostInfo && (
        <div className="rounded-2xl border border-[#F5A400]/20 bg-[#F5A400]/[0.03] p-4 sm:p-5 transition-all">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#F5A400]/30 bg-[#F5A400]/10 text-[#F5A400]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F5A400]">
                    TAHMİNİ YAKIT MALİYETİ
                  </span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                    {fuelCostInfo.vehicleProfile?.shortLabel || "TIR"} · {fuelCostInfo.isWeightAdjusted ? `${fuelCostInfo.tonnage || ""} Ton` : "Nominal (0t)"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {fuelCostInfo.formatted?.liters} (
                  {fuelCostInfo.isWeightAdjusted
                    ? `${fuelCostInfo.formatted?.consumption} · Tonaj Etkisi: %${fuelCostInfo.payloadPercent}`
                    : `${fuelCostInfo.formatted?.consumption} · Nominal Tüketim / Tonaj Bekleniyor`}
                  )
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/5 pt-2 sm:border-t-0 sm:pt-0">
              <div className="text-right">
                <div className="text-base sm:text-lg font-black tracking-tight text-[#F5A400]">
                  ≈ {fuelCostInfo.formatted?.cost}
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  {fuelCostInfo.formatted?.price} baz alındı
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                aria-expanded={showFormulaDetails}
                aria-label="Yakıt maliyeti hesaplama detayları"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expandable Calculation Breakdown */}
          {showFormulaDetails && (
            <div className="mt-3 rounded-xl border border-white/6 bg-black/40 p-3.5 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Hesaplama Şeffaflığı & Formül
              </div>
              <div className="font-mono text-[11px] text-[#F5A400]/90">
                1. Tüketim: {fuelCostInfo.breakdown?.step1}
              </div>
              <div className="font-mono text-[11px] text-[#F5A400]/90">
                2. Maliyet: {fuelCostInfo.breakdown?.step2}
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-white/5">
                {fuelCostInfo.breakdown?.disclaimer} Kaynak: UcuzYakıtBul / EPDK.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}