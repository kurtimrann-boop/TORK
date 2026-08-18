"use client";

import { useMemo, useState } from "react";
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
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[#0F1723] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl ${className}`}
    >
      {/* Background Accent Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00E5A0]/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/6 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00E5A0]">
              TORK FİYAT MOTORU (HÜRMÜZ)
            </span>
            <span className="text-[10px] text-slate-500 font-bold">·</span>

            {/* Veri Güveni Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-[10px] font-bold">
              <span className="text-slate-400">VERİ GÜVENİ:</span>
              {meta.dataQuality === "HIGH" ? (
                <span className="text-[#00E5A0] font-black">● Yüksek</span>
              ) : meta.dataQuality === "MEDIUM" ? (
                <span className="text-amber-400 font-black">● Orta</span>
              ) : (
                <span className="text-red-400 font-black">● Düşük</span>
              )}
            </span>

            {/* Load Complexity Badge */}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
              <span className="text-slate-400">Karmaşıklık:</span>
              <span className="font-mono text-white font-black">{load.complexityScore}/5</span>
            </span>

            {breakdown.route.fuel.isCustomConsumption && (
              <span className="rounded-full border border-[#00E5A0]/30 bg-[#00E5A0]/10 px-2.5 py-0.5 text-[10px] font-black text-[#00E5A0]">
                Özel Tüketim ({breakdown.route.fuel.consumptionPer100Km} L/100km)
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-lg sm:text-xl font-black text-white tracking-tight">
            Şeffaf Operasyon Maliyeti & Önerilen Navlun
          </h3>
        </div>

        {/* Vehicle Selection Segmented Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/8 bg-black/40 p-1">
          {Object.values(PRICING_VEHICLE_CONFIG).map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  isSelected
                    ? "bg-[#00E5A0] text-black shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {v.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Route & Operational Context Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1 text-slate-300">
          <span className="text-white font-black">{route.distanceKm} km</span>
          {isRoundTrip && (
            <span className="text-amber-400 font-bold">
              (Gidiş-Dönüş{returnBuffer > 0 ? ` + %${returnBuffer} Tampon` : ""})
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1 text-slate-300">
          <span className="text-white font-black">{route.durationHours} saat</span> sürüş süresi
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1 text-slate-300">
          {vehicle.label} ({vehicle.kgmClassLabel})
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1 text-slate-300">
          Yük: <span className="text-white font-bold">{load.loadTypeLabel}</span>
        </span>
        {load.utilization?.weightPercent !== null && (
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${
            load.utilization.isOverweight
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-white/6 bg-white/[0.02] text-slate-300"
          }`}>
            <span>Doluluğu:</span>
            <span className="font-mono font-black text-white">%{load.utilization.weightPercent}</span>
            {load.utilization.isOverweight && <span className="text-red-400 font-black">(! Kapasite Aşımı)</span>}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1 text-slate-300">
          Motorin: <span className="text-[#00E5A0] font-black">₺{breakdown.route.fuel.pricePerLiter.toFixed(2)}/L</span>
        </span>

        {/* Custom Consumption Button Toggle */}
        <button
          type="button"
          onClick={() => {
            setUseCustomConsumption(!useCustomConsumption);
            if (!useCustomConsumption && !customConsumptionInput) {
              setCustomConsumptionInput(String(vehicleConfig.consumptionPer100Km));
            }
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
            useCustomConsumption
              ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
              : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
          }`}
        >
          <span>{useCustomConsumption ? "✓ Özel Tüketim Aktif" : "+ Özel Tüketim Gir"}</span>
        </button>

        {/* Round Trip Checkbox */}
        <label className="ml-auto flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={isRoundTrip}
            onChange={(e) => setIsRoundTrip(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#00E5A0] focus:ring-[#00E5A0]"
          />
          <span>Gidiş-Dönüş Hesabı</span>
        </label>
      </div>

      {/* Expandable Custom Consumption Input Row */}
      {useCustomConsumption && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#00E5A0]/25 bg-[#00E5A0]/[0.04] p-3.5 animate-fadeIn">
          <div className="text-xs font-bold text-slate-300">
            {vehicle.shortLabel} Özel Yakıt Tüketimi:
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={customConsumptionInput}
              onChange={(e) => setCustomConsumptionInput(e.target.value)}
              placeholder={String(vehicleConfig.consumptionPer100Km)}
              className="w-24 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-mono font-black text-[#00E5A0] focus:border-[#00E5A0] focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-bold">L / 100 km</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomConsumptionInput(String(vehicleConfig.consumptionPer100Km));
            }}
            className="text-[11px] text-slate-400 hover:text-white underline font-bold"
          >
            Varsayılan Profile Dön ({vehicleConfig.consumptionPer100Km} L)
          </button>
        </div>
      )}

      {/* Expandable Round Trip Buffer Slider */}
      {isRoundTrip && (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-3.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Dönüş Yolu Operasyon / Bekleme Tamponu</span>
            <span className="text-amber-400 font-mono font-black">+{returnBuffer}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={returnBuffer}
            onChange={(e) => setReturnBuffer(parseInt(e.target.value, 10))}
            className="mt-2 h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-amber-400 cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 font-medium">
            <span>Standart Çift Yön (%0)</span>
            <span>Bekleme Payı (%15)</span>
            <span>Ağır Operasyon Tamponu (%30)</span>
          </div>
        </div>
      )}

      {/* Primary KPI Display (2 Column Grid) */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Left: Base Operating Cost */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                TABAN OPERASYON MALİYETİ
              </div>
              {totals.loadSpecificDirectCost > 0 && (
                <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                  +₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")} Yüke Özel Harç
                </span>
              )}
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight">
              ₺{totals.totalOperatingCost.toLocaleString("tr-TR")}
            </div>
          </div>
          {/* Polished KM Cost Glass Pill */}
          <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
            <span className="text-xs text-slate-400">Birim mesafe maliyeti:</span>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs font-black text-slate-200">
              ₺{totals.unitCostPerKm.toFixed(2)} <span className="text-slate-400 font-normal">/ km</span>
            </div>
          </div>
        </div>

        {/* Right: TORK Recommended Freight Price */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#00E5A0]/30 bg-[#00E5A0]/[0.06] p-5 shadow-[0_0_30px_rgba(0,229,160,0.08)]">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#00E5A0]">
                TORK ÖNERİLEN NAVLUN
              </div>
              <span className="rounded-full bg-[#00E5A0]/20 px-2 py-0.5 text-[10px] font-black text-[#00E5A0]">
                %{totals.targetMarginPercent} Hedef Marj
              </span>
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-[#00E5A0] tracking-tight">
              ₺{pricingBands.recommended.price.toLocaleString("tr-TR")}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-300 border-t border-[#00E5A0]/20 pt-3">
            <span>Pazar Fiyat Bandı:</span>
            <span className="font-bold text-white font-mono">
              ₺{pricingBands.minimum.price.toLocaleString("tr-TR")} – ₺{pricingBands.premium.price.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      {/* Target Margin Slider with $\ge 44px$ Mobile Touch Target */}
      <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">Hedeflenen Kâr Marjı (Gross Margin)</span>
          <span className="text-[#00E5A0] font-black font-mono">%{targetMargin}</span>
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
            className="h-2 w-full appearance-none rounded-lg bg-white/10 accent-[#00E5A0] cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
          <span>Taban Marj (%8)</span>
          <span>Sağlıklı Operasyon Marjı (%15)</span>
          <span>Gelişmiş Marj (%25)</span>
        </div>
      </div>

      {/* Budget Alignment Feedback (If Shipper provided budget) */}
      {budgetFeedback && (
        <div className={`mt-4 rounded-2xl border p-4 ${
          budgetFeedback.color === "emerald"
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : budgetFeedback.color === "amber"
              ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
              : budgetFeedback.color === "gold"
                ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
                : "border-red-500/25 bg-red-500/10 text-red-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">{budgetFeedback.label}</span>
            <span className="text-xs font-mono font-bold">Bütçeniz: ₺{userBudget.toLocaleString("tr-TR")}</span>
          </div>
          <p className="mt-1 text-xs opacity-90">{budgetFeedback.message}</p>
        </div>
      )}

      {/* Accordion 1: Itemized Cost Breakdown (Route + Load-Specific) */}
      <div className="mt-5 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          aria-expanded={showDetailedBreakdown}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition group py-1"
        >
          <span className="flex items-center gap-2">
            <span className="text-slate-400 group-hover:text-slate-200">
              Maliyet Kırılımı (Güzergah & Yük Kalemleri)
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#00E5A0]">
            <span>{showDetailedBreakdown ? "Gizle" : "Göster"}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
                showDetailedBreakdown ? "rotate-180" : "rotate-0"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {showDetailedBreakdown && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* Section A: Route Costs */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                A. GÜZERGAH & TAŞIMA MALİYETLERİ
              </div>

              {/* 1. Akaryakıt */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">
                    1. Akaryakıt (Motorin)
                    {breakdown.route.fuel.isCustomConsumption && (
                      <span className="ml-2 rounded bg-[#00E5A0]/20 px-1.5 py-0.2 text-[9px] font-black text-[#00E5A0]">
                        Özel
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {breakdown.route.fuel.liters} L ({breakdown.route.fuel.consumptionPer100Km} L/100km) · Kaynak: {breakdown.route.fuel.source}
                  </div>
                </div>
                <div className="font-mono font-black text-white">
                  ₺{breakdown.route.fuel.cost.toLocaleString("tr-TR")}
                </div>
              </div>

              {/* 2. Sürücü */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">2. Sürücü İşçilik & Sefer Maliyeti</div>
                  <div className="text-[10px] text-slate-400">
                    {breakdown.route.driver.hours} sa · ₺{breakdown.route.driver.hourlyRate}/sa · {breakdown.route.driver.source}
                  </div>
                </div>
                <div className="font-mono font-black text-white">
                  ₺{breakdown.route.driver.cost.toLocaleString("tr-TR")}
                </div>
              </div>

              {/* 3. Geçiş Ücreti */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">3. Otoyol & Köprü Geçiş Ücretleri</div>
                  <div className="text-[10px] text-slate-400">
                    {breakdown.route.toll.isIncluded
                      ? `${breakdown.route.toll.source} (${vehicle.kgmClassLabel})`
                      : "Geçiş bilgisi bu rota için doğrulanamadı"}
                  </div>
                </div>
                <div className="font-mono font-bold">
                  {breakdown.route.toll.isIncluded ? (
                    <span className="font-black text-white">₺{breakdown.route.toll.cost.toLocaleString("tr-TR")}</span>
                  ) : (
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-amber-300">
                      Doğrulanamadı (Dahil Edilmedi)
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Bakım */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">4. Araç Bakım, Yağ & Lastik</div>
                  <div className="text-[10px] text-slate-400">
                    ₺{breakdown.route.maintenance.ratePerKm.toFixed(2)}/km · {breakdown.route.maintenance.source}
                  </div>
                </div>
                <div className="font-mono font-black text-white">
                  ₺{breakdown.route.maintenance.cost.toLocaleString("tr-TR")}
                </div>
              </div>

              {/* 5. Amortisman */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">5. Araç Amortisman & Değer Kaybı</div>
                  <div className="text-[10px] text-slate-400">
                    ₺{breakdown.route.depreciation.ratePerKm.toFixed(2)}/km · {breakdown.route.depreciation.source}
                  </div>
                </div>
                <div className="font-mono font-black text-white">
                  ₺{breakdown.route.depreciation.cost.toLocaleString("tr-TR")}
                </div>
              </div>
            </div>

            {/* Section B: Load-Specific Costs */}
            <div className="space-y-2 pt-2 border-t border-white/6">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                B. YÜKE ÖZEL OPERASYONEL GEREKSİNİMLER & RESMİ HARÇLAR
              </div>

              {breakdown.loadSpecific.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                  <div>
                    <div className="font-bold text-white">{item.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.formula} (Kaynak: {item.sourceName})
                    </div>
                  </div>
                  <div className="font-mono font-bold">
                    {item.isIncluded && item.cost !== null ? (
                      <span className="font-black text-[#00E5A0]">₺{item.cost.toLocaleString("tr-TR")}</span>
                    ) : (
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                        {item.status === "exact" ? "Dahil Edildi" : "Doğrulanamadı (Dahil Edilmedi)"}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Overhead */}
              <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.01] p-3 text-xs">
                <div>
                  <div className="font-bold text-white">Genel İdare & Operasyon Yönetim Payı</div>
                  <div className="text-[10px] text-slate-400">
                    Toplam doğrudan maliyetin %{breakdown.overhead.ratePercent}&apos;i
                  </div>
                </div>
                <div className="font-mono font-black text-white">
                  ₺{breakdown.overhead.cost.toLocaleString("tr-TR")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Calculation Transparency & Formulas */}
      <div className="mt-3 border-t border-white/8 pt-3">
        <button
          type="button"
          onClick={() => setShowFormulas(!showFormulas)}
          aria-expanded={showFormulas}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition group py-1"
        >
          <span>Hesaplama Şeffaflığı & Resmi Kaynaklar</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
              showFormulas ? "rotate-180" : "rotate-0"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFormulas && (
          <div className="mt-3 rounded-2xl border border-white/6 bg-black/40 p-4 text-[11px] font-mono text-slate-300 space-y-2 animate-fadeIn">
            <div className="text-slate-400 font-bold uppercase tracking-wider">Matematiksel Formül Dökümü</div>
            <div>• Güzergah Doğrudan: ₺{totals.routeDirectCost.toLocaleString("tr-TR")}</div>
            <div>• Yüke Özel Harç/Maliyet: ₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")}</div>
            <div>• Genel İdare: (₺{totals.routeDirectCost.toLocaleString("tr-TR")} + ₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")}) × %{breakdown.overhead.ratePercent} = ₺{breakdown.overhead.cost.toLocaleString("tr-TR")}</div>
            <div className="pt-2 border-t border-white/6 text-[#00E5A0]">
              • Önerilen Fiyat: Taban Maliyet / (1 - Marj) = ₺{totals.totalOperatingCost.toLocaleString("tr-TR")} / (1 - {targetMargin/100}) = ₺{pricingBands.recommended.price.toLocaleString("tr-TR")}
            </div>
            <div className="text-[10px] text-slate-500 font-sans pt-1">
              Resmi Kaynaklar: {meta.officialSources.KGM.name} 2026 Tarifeleri ({meta.officialSources.KGM.url}) · {meta.officialSources.TICARET_BAKANLIGI.name} ({meta.officialSources.TICARET_BAKANLIGI.url}). {meta.disclaimer}
            </div>
          </div>
        )}
      </div>

      {/* TORK VERIFIED — Bağımsız Matematiksel Maliyet Denetimi */}
      <div className="mt-5 pt-5 border-t border-white/8">
        <TorkVerifiedCard auditResult={verifiedAudit} />
      </div>

      {/* TORK INTELLIGENCE — Gemini Operasyonel Yorumlama & Risk Analizi */}
      <div className="mt-4">
        <TorkIntelligenceCard
          audience="shipper"
          mode="audit"
          inputParams={{
            distanceKm,
            durationMinutes,
            vehicleType: selectedVehicle,
            fuelPricePerLiter,
            customConsumption: parsedCustomConsumption,
            loadProfile,
            targetMarginPercent: targetMargin,
            isRoundTrip,
            returnBufferPercent: returnBuffer,
          }}
          calculatedPricing={pricing}
          context={{
            route: pricing.route,
            vehicle: pricing.vehicle,
            load: pricing.load,
            pricing: pricing,
          }}
        />
      </div>
    </section>
  );
}
