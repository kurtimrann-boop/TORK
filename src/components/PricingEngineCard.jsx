"use client";

import React, { useMemo, useState } from "react";
import {
  DEFAULT_TARGET_MARGIN_PERCENT,
  DEFAULT_VEHICLE_TYPE,
  PRICING_VEHICLE_CONFIG,
  calculateOperatingPricing,
  evaluateBudgetAlignment,
} from "../utils/pricingService";
import { verifyPricingCalculation } from "../utils/torkVerifiedService";
import TorkVerifiedCard from "./TorkVerifiedCard";
import TorkIntelligenceCard from "./TorkIntelligenceCard";

export default function PricingEngineCard({
  distanceKm,
  durationMinutes = null,
  fuelPricePerLiter = 78.54,
  userBudget = null,
  loadProfile = null,
  initialVehicleType = DEFAULT_VEHICLE_TYPE,
  className = "",
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicleType);
  const [targetMargin, setTargetMargin] = useState(DEFAULT_TARGET_MARGIN_PERCENT);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnBuffer, setReturnBuffer] = useState(0); // 0-30%
  const [useCustomConsumption, setUseCustomConsumption] = useState(false);
  const [customConsumptionInput, setCustomConsumptionInput] = useState("");
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  const vehicleConfig = PRICING_VEHICLE_CONFIG[selectedVehicle] || PRICING_VEHICLE_CONFIG.TIR;

  const parsedCustomConsumption = useMemo(() => {
    if (!useCustomConsumption || !customConsumptionInput) return null;
    const val = parseFloat(customConsumptionInput);
    return Number.isFinite(val) && val >= 1 && val <= 100 ? val : null;
  }, [useCustomConsumption, customConsumptionInput]);

  // Compute pricing model synchronously with full precision
  const pricing = useMemo(() => {
    if (!distanceKm || distanceKm <= 0) return null;

    return calculateOperatingPricing({
      distanceKm,
      durationMinutes,
      vehicleType: selectedVehicle,
      fuelPricePerLiter,
      customConsumption: parsedCustomConsumption,
      loadProfile,
      targetMarginPercent: targetMargin,
      isRoundTrip,
      returnBufferPercent: returnBuffer,
    });
  }, [
    distanceKm,
    durationMinutes,
    selectedVehicle,
    fuelPricePerLiter,
    parsedCustomConsumption,
    loadProfile,
    targetMargin,
    isRoundTrip,
    returnBuffer,
  ]);

  // Compute verified audit model
  const verifiedAudit = useMemo(() => {
    if (!pricing) return null;
    return verifyPricingCalculation({
      inputParams: {
        distanceKm,
        durationMinutes,
        vehicleType: selectedVehicle,
        fuelPricePerLiter,
        customConsumption: parsedCustomConsumption,
        loadProfile,
        targetMarginPercent: targetMargin,
        isRoundTrip,
        returnBufferPercent: returnBuffer,
      },
      calculatedPricing: pricing,
    });
  }, [
    pricing,
    distanceKm,
    durationMinutes,
    selectedVehicle,
    fuelPricePerLiter,
    parsedCustomConsumption,
    loadProfile,
    targetMargin,
    isRoundTrip,
    returnBuffer,
  ]);

  // Evaluate budget alignment if provided
  const budgetFeedback = useMemo(() => {
    if (!userBudget || !pricing) return null;
    return evaluateBudgetAlignment(userBudget, pricing);
  }, [userBudget, pricing]);

  if (!pricing) {
    return null;
  }

  const { breakdown, totals, pricingBands, vehicle, route, load, meta } = pricing;

  return (
    <section
      aria-label="TORK Fiyat Motoru ve Operasyon Maliyeti"
      className={`relative overflow-hidden rounded-xl border border-[#374151] bg-[#1F2937] p-5 sm:p-7 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#374151] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F5A400] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-[#F5A400]">
              TORK FİYAT MOTORU (HÜRMÜZ)
            </span>
            <span className="text-xs text-[#6B7280]">·</span>

            {/* Veri Güveni Badge */}
            <span className="inline-flex items-center gap-1.5 rounded bg-[#111827] border border-[#374151] px-2.5 py-0.5 text-xs font-bold">
              <span className="text-[#A0AEC0]">VERİ GÜVENİ:</span>
              {meta.dataQuality === "HIGH" ? (
                <span className="text-[#22C55E] font-black">● Yüksek</span>
              ) : meta.dataQuality === "MEDIUM" ? (
                <span className="text-[#F5A400] font-black">● Orta</span>
              ) : (
                <span className="text-[#EF4444] font-black">● Düşük</span>
              )}
            </span>

            {/* Load Complexity Badge */}
            <span className="inline-flex items-center gap-1 rounded bg-[#111827] border border-[#374151] px-2.5 py-0.5 text-xs font-bold text-[#F3F4F6]">
              <span className="text-[#A0AEC0]">Karmaşıklık:</span>
              <span className="font-mono font-black">{load.complexityScore}/5</span>
            </span>

            {breakdown.route.fuel.isWeightAdjusted && (
              <span className="inline-flex items-center gap-1.5 rounded bg-[#F5A400]/10 border border-[#F5A400]/30 px-2.5 py-0.5 text-xs font-bold text-[#F5A400]">
                <span>Tonaj Etkisi: %{breakdown.route.fuel.payloadPercent}</span>
                <span className="font-mono font-black">({breakdown.route.fuel.consumptionPer100Km} L/100km)</span>
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-lg sm:text-xl font-black text-[#F3F4F6]">
            Şeffaf Operasyon Maliyeti & Önerilen Navlun
          </h3>
        </div>

        {/* Vehicle Selection Segmented Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#374151] bg-[#111827] p-1">
          {Object.values(PRICING_VEHICLE_CONFIG).map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                  isSelected
                    ? "bg-[#F5A400] text-[#111827] font-black shadow-md"
                    : "text-[#A0AEC0] hover:text-[#F3F4F6]"
                }`}
              >
                {v.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Route & Operational Context Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#A0AEC0]">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1 text-[#F3F4F6]">
          <span className="font-black">{route.distanceKm} km</span>
          {isRoundTrip && (
            <span className="text-[#F5A400] font-bold">
              (Gidiş-Dönüş{returnBuffer > 0 ? ` + %${returnBuffer} Tampon` : ""})
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1 text-[#F3F4F6]">
          <span className="font-black">{route.durationHours} saat</span> sürüş süresi
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1 text-[#F3F4F6]">
          {vehicle.label} ({vehicle.kgmClassLabel})
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1 text-[#F3F4F6]">
          Yük: <span className="font-bold">{load.loadTypeLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1 text-[#F3F4F6]">
          Motorin: <span className="text-[#F5A400] font-black">₺{breakdown.route.fuel.pricePerLiter.toFixed(2)}/L</span>
        </span>
      </div>

      {/* Primary KPI Display (2 Column Grid) */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Left: Base Operating Cost */}
        <div className="flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
                TABAN OPERASYON MALİYETİ
              </div>
              {totals.loadSpecificDirectCost > 0 && (
                <span className="rounded bg-[#F5A400]/10 px-2 py-0.5 text-[11px] font-bold text-[#F5A400]">
                  +₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")} Yüke Özel Harç
                </span>
              )}
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F3F4F6] font-mono tracking-tight">
              ₺{totals.totalOperatingCost.toLocaleString("tr-TR")}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#374151] pt-3 text-xs">
            <span className="text-[#A0AEC0]">Birim mesafe maliyeti:</span>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-1 font-mono text-xs font-black text-[#F3F4F6]">
              ₺{totals.unitCostPerKm.toFixed(2)} <span className="text-[#A0AEC0] font-normal">/ km</span>
            </div>
          </div>
        </div>

        {/* Right: TORK Recommended Freight Price */}
        <div className="flex flex-col justify-between rounded-xl border border-[#F5A400]/40 bg-[#F5A400]/10 p-5 shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-[#F5A400]">
                TORK ÖNERİLEN NAVLUN
              </div>
              <span className="rounded bg-[#F5A400]/20 px-2 py-0.5 text-xs font-black text-[#F5A400]">
                %{totals.targetMarginPercent} Hedef Marj
              </span>
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F5A400] font-mono tracking-tight">
              ₺{pricingBands.recommended.price.toLocaleString("tr-TR")}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[#F3F4F6] border-t border-[#F5A400]/30 pt-3">
            <span className="text-[#A0AEC0]">Pazar Fiyat Bandı:</span>
            <span className="font-bold font-mono">
              ₺{pricingBands.minimum.price.toLocaleString("tr-TR")} – ₺{pricingBands.premium.price.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      {/* Target Margin Slider */}
      <div className="mt-4 rounded-xl border border-[#374151] bg-[#111827] p-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#A0AEC0]">Hedeflenen Kâr Marjı (Gross Margin)</span>
          <span className="text-[#F5A400] font-black font-mono">%{targetMargin}</span>
        </div>
        <div className="relative py-2 flex items-center min-h-[44px]">
          <input
            type="range"
            min="8"
            max="25"
            step="1"
            value={targetMargin}
            aria-label="Hedef kâr marjı"
            onChange={(e) => setTargetMargin(parseInt(e.target.value, 10))}
            className="h-2 w-full appearance-none rounded-lg bg-[#374151] accent-[#F5A400] cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-xs text-[#6B7280]">
          <span>Taban Marj (%8)</span>
          <span>Sağlıklı Operasyon Marjı (%15)</span>
          <span>Gelişmiş Marj (%25)</span>
        </div>
      </div>

      {/* Budget Alignment Feedback */}
      {budgetFeedback && (
        <div className={`mt-4 rounded-xl border p-4 text-xs ${
          budgetFeedback.color === "emerald"
            ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
            : "border-[#F5A400]/40 bg-[#F5A400]/10 text-[#F5A400]"
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span className="uppercase">{budgetFeedback.label}</span>
            <span className="font-mono">Bütçeniz: ₺{userBudget.toLocaleString("tr-TR")}</span>
          </div>
          <p className="mt-1 opacity-90">{budgetFeedback.message}</p>
        </div>
      )}

      {/* Cost Breakdown Accordion */}
      <div className="mt-5 border-t border-[#374151] pt-4">
        <button
          type="button"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          className="flex w-full items-center justify-between text-xs font-bold text-[#F3F4F6] hover:text-[#F5A400] transition py-1"
        >
          <span>Maliyet Kırılımı (Güzergah & Yük Kalemleri)</span>
          <span className="text-[#F5A400]">{showDetailedBreakdown ? "Gizle ▲" : "Göster ▼"}</span>
        </button>

        {showDetailedBreakdown && (
          <div className="mt-4 space-y-3 text-xs animate-fadeIn">
            <div className="flex items-center justify-between rounded-lg border border-[#374151] bg-[#111827] p-3">
              <div>
                <div className="font-bold text-[#F3F4F6]">1. Yakıt Maliyeti</div>
                <div className="text-[11px] text-[#A0AEC0]">{breakdown.route.fuel.liters} L ({breakdown.route.fuel.consumptionPer100Km} L/100km) · Akaryakıt (Motorin)</div>
              </div>
              <div className="text-right font-mono font-bold text-[#F3F4F6]">
                ₺{breakdown.route.fuel.cost.toLocaleString("tr-TR")}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#374151] bg-[#111827] p-3">
              <div>
                <div className="font-bold text-[#F3F4F6]">2. Otoyol & Köprü (HGS)</div>
                <div className="text-[11px] text-[#A0AEC0]">{breakdown.route.toll.isTollCorridor ? "Otoyol Geçiş Ücreti" : "Standart Geçiş"}</div>
              </div>
              <div className="text-right font-mono font-bold text-[#F3F4F6]">
                ₺{breakdown.route.toll.cost.toLocaleString("tr-TR")}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#374151] bg-[#111827] p-3">
              <div>
                <div className="font-bold text-[#F3F4F6]">3. Sürücü / Personel</div>
                <div className="text-[11px] text-[#A0AEC0]">{route.durationHours} Saat Sürüş + Günlük Harcırah</div>
              </div>
              <div className="text-right font-mono font-bold text-[#F3F4F6]">
                ₺{breakdown.route.driver.cost.toLocaleString("tr-TR")}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#374151] bg-[#111827] p-3">
              <div>
                <div className="font-bold text-[#F3F4F6]">4. Bakım & Amortisman</div>
                <div className="text-[11px] text-[#A0AEC0]">Periyodik bakım ve yıpranma payı</div>
              </div>
              <div className="text-right font-mono font-bold text-[#F3F4F6]">
                ₺{(breakdown.route.maintenance.cost + breakdown.route.depreciation.cost).toLocaleString("tr-TR")}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verified Cryptographic Audit Card */}
      {verifiedAudit && (
        <TorkVerifiedCard
          verifiedAudit={verifiedAudit}
          context="CARRIER_BID_EVALUATION"
          className="mt-4"
        />
      )}
    </section>
  );
}
