"use client";

import { useMemo, useState } from "react";
import {
  PRICING_VEHICLE_CONFIG,
  calculateOperatingPricing,
  evaluateCarrierBid,
} from "../utils/pricingService";
import { verifyPricingCalculation } from "../utils/torkVerifiedService";
import TorkVerifiedCard from "./TorkVerifiedCard";

export default function CarrierSmartBiddingWidget({
  load,
  bidAmount,
  distanceKm = 730,
  durationMinutes = 525,
  fuelPricePerLiter = 78.54,
  initialVehicleType = "TIR",
  className = "",
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicleType);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnBuffer, setReturnBuffer] = useState(0); // 0-30%
  const [useCustomConsumption, setUseCustomConsumption] = useState(false);
  const [customConsumptionInput, setCustomConsumptionInput] = useState("");
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  const vehicleConfig = PRICING_VEHICLE_CONFIG[selectedVehicle] || PRICING_VEHICLE_CONFIG.TIR;

  const parsedCustomConsumption = useMemo(() => {
    if (!useCustomConsumption || !customConsumptionInput) return null;
    const val = parseFloat(customConsumptionInput);
    return Number.isFinite(val) && val >= 1 && val <= 100 ? val : null;
  }, [useCustomConsumption, customConsumptionInput]);

  // Derive loadProfile from load object
  const loadProfile = useMemo(() => {
    if (!load) return null;
    return {
      loadType: load.cargo_type || load.cargoType || "STANDARD_DRY",
      tonnage: parseFloat(load.weight_tons || load.tonnage) || null,
      palletCount: parseInt(load.pallet_count || load.package_count || load.packageCount, 10) || null,
      packageCount: load.package_count || load.packageCount || null,
      volumeM3: parseFloat(load.volume_m3 || load.volumeM3) || null,
      temperatureClass: load.temperature_class || load.temperatureClass || null,
      isDangerousGoods: Boolean(load.is_dangerous || load.isDangerousGoods),
      adrClass: load.adr_class || load.adrClass || null,
      isOversize: Boolean(load.is_oversize || load.isOversize),
      specialPermitRequired: Boolean(load.special_permit_required || load.specialPermitRequired),
      waitingHours: parseFloat(load.waiting_hours || load.waitingHours) || 0,
    };
  }, [load]);

  // Compute operating cost synchronously
  const pricing = useMemo(() => {
    if (!distanceKm || distanceKm <= 0) return null;

    return calculateOperatingPricing({
      distanceKm,
      durationMinutes,
      vehicleType: selectedVehicle,
      fuelPricePerLiter,
      customConsumption: parsedCustomConsumption,
      loadProfile,
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
    isRoundTrip,
    returnBuffer,
  ]);

  // Evaluate carrier profit & margin in real time
  const bidAnalytics = useMemo(() => {
    if (!bidAmount || !pricing) return null;
    return evaluateCarrierBid(bidAmount, pricing);
  }, [bidAmount, pricing]);

  // Compute verified audit for carrier bid
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
        isRoundTrip,
        returnBufferPercent: returnBuffer,
      },
      calculatedPricing: pricing,
      bidParams: {
        bidAmount,
        estimatedProfit: bidAnalytics?.estimatedProfit,
        estimatedMarginPercent: bidAnalytics?.marginPercent,
      },
    });
  }, [
    pricing,
    distanceKm,
    durationMinutes,
    selectedVehicle,
    fuelPricePerLiter,
    parsedCustomConsumption,
    loadProfile,
    isRoundTrip,
    returnBuffer,
    bidAmount,
    bidAnalytics,
  ]);

  if (!pricing) return null;

  const { totals, breakdown, vehicle, route, load: normalizedLoad } = pricing;
  const numBid = Number(bidAmount) || 0;
  const marginVal = bidAnalytics ? bidAnalytics.marginPercent : null;

  // Determine Gauge Zone
  const getGaugeZone = (margin) => {
    if (margin === null || margin === undefined) return null;
    if (margin < 0) return "LOSS";
    if (margin < 10) return "LOW";
    if (margin < 18) return "VIABLE";
    if (margin < 28) return "HEALTHY";
    return "PREMIUM";
  };

  const activeZone = getGaugeZone(marginVal);

  const gaugeTiers = [
    { id: "LOSS", label: "LOSS", range: "< %0", color: "#FF5C5C", activeBg: "bg-[#FF5C5C]", activeBorder: "border-[#FF5C5C]" },
    { id: "LOW", label: "LOW", range: "%0-%10", color: "#F5B94C", activeBg: "bg-[#F5B94C]", activeBorder: "border-[#F5B94C]" },
    { id: "VIABLE", label: "VIABLE", range: "%10-%18", color: "#38BDF8", activeBg: "bg-[#38BDF8]", activeBorder: "border-[#38BDF8]" },
    { id: "HEALTHY", label: "HEALTHY", range: "%18-%28", color: "#00E5A0", activeBg: "bg-[#00E5A0]", activeBorder: "border-[#00E5A0]" },
    { id: "PREMIUM", label: "PREMIUM", range: "> %28", color: "#FCD34D", activeBg: "bg-[#FCD34D]", activeBorder: "border-[#FCD34D]" },
  ];

  return (
    <div
      aria-label="Taşıyıcı Akıllı Maliyet ve Kârlılık Görünümü"
      className={`rounded-3xl border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] select-none ${className}`}
    >
      {/* Top Header & Vehicle Selector & Verified Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
              Akıllı Fiyatlandırma & Kârlılık Terminali
            </span>
          </div>
          {verifiedAudit && (
            <TorkVerifiedCard auditResult={verifiedAudit} compact={true} />
          )}
        </div>

        {/* Vehicle Selection Segmented Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.06] bg-[#101923] p-1">
          {Object.values(PRICING_VEHICLE_CONFIG).map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition duration-150 ${
                  isSelected
                    ? "bg-[#00E5A0] text-[#060B11] shadow-[0_0_12px_rgba(0,229,160,0.3)]"
                    : "text-[#8C98A8] hover:text-[#F5F7FA]"
                }`}
              >
                {v.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero: TEKLİFİNİZ */}
      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C98A8]">
          Teklifiniz
        </div>
        <div className="mt-1 text-3xl sm:text-4xl font-black tracking-[-0.04em] text-[#F5F7FA]">
          {numBid > 0 ? `₺${numBid.toLocaleString("tr-TR")}` : "₺0"}
        </div>
        <div className="mt-1 text-xs text-[#8C98A8]">
          {route.distanceKm} km · {route.durationHours} sa sürüş · {vehicle.shortLabel}
        </div>
      </div>

      {/* 3 Columns: Tahmini Maliyet | Tahmini Kâr | Tahmini Marj */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Col 1: Tahmini Maliyet */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            Tahmini Maliyet
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
            ₺{totals.totalOperatingCost.toLocaleString("tr-TR")}
          </div>
          <div className="mt-0.5 text-[11px] text-[#8C98A8]">
            ₺{totals.unitCostPerKm.toFixed(2)} / km
          </div>
        </div>

        {/* Col 2: Tahmini Kâr */}
        <div className={`rounded-2xl border p-4 text-center ${
          !bidAnalytics
            ? "border-white/[0.06] bg-[#101923]"
            : bidAnalytics.estimatedProfit >= 0
            ? "border-[#00E5A0]/20 bg-[#00E5A0]/[0.06]"
            : "border-[#FF5C5C]/20 bg-[#FF5C5C]/[0.06]"
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            Tahmini Kâr
          </div>
          <div className={`mt-1 text-xl sm:text-2xl font-black tracking-[-0.03em] ${
            !bidAnalytics
              ? "text-[#F5F7FA]"
              : bidAnalytics.estimatedProfit >= 0
              ? "text-[#00E5A0]"
              : "text-[#FF5C5C]"
          }`}>
            {bidAnalytics
              ? `${bidAnalytics.estimatedProfit >= 0 ? "+" : ""}₺${bidAnalytics.estimatedProfit.toLocaleString("tr-TR")}`
              : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-[#8C98A8]">
            {bidAnalytics ? (bidAnalytics.estimatedProfit >= 0 ? "Net Sefer Kârı" : "Zarar") : "Teklif bekleniyor"}
          </div>
        </div>

        {/* Col 3: Tahmini Marj */}
        <div className={`rounded-2xl border p-4 text-center ${
          !bidAnalytics
            ? "border-white/[0.06] bg-[#101923]"
            : activeZone === "PREMIUM"
            ? "border-[#FCD34D]/30 bg-[#FCD34D]/[0.06]"
            : activeZone === "HEALTHY"
            ? "border-[#00E5A0]/30 bg-[#00E5A0]/[0.06]"
            : activeZone === "VIABLE"
            ? "border-[#38BDF8]/30 bg-[#38BDF8]/[0.06]"
            : activeZone === "LOW"
            ? "border-[#F5B94C]/30 bg-[#F5B94C]/[0.06]"
            : "border-[#FF5C5C]/30 bg-[#FF5C5C]/[0.06]"
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            Tahmini Marj
          </div>
          <div className={`mt-1 text-xl sm:text-2xl font-black tracking-[-0.03em] ${
            !bidAnalytics
              ? "text-[#F5F7FA]"
              : activeZone === "PREMIUM"
              ? "text-[#FCD34D]"
              : activeZone === "HEALTHY"
              ? "text-[#00E5A0]"
              : activeZone === "VIABLE"
              ? "text-[#38BDF8]"
              : activeZone === "LOW"
              ? "text-[#F5B94C]"
              : "text-[#FF5C5C]"
          }`}>
            {marginVal !== null ? `%${marginVal.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "—"}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-[#8C98A8]">
            {activeZone || "—"}
          </div>
        </div>
      </div>

      {/* Horizontal Profit Gauge */}
      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#101923] p-4">
        <div className="mb-2.5 flex items-center justify-between text-[11px] font-bold text-[#8C98A8]">
          <span>KÂRLILIK GÖSTERGESİ (PROFIT GAUGE)</span>
          {bidAnalytics && (
            <span className="font-mono text-xs font-black text-[#F5F7FA]">
              {bidAnalytics.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {gaugeTiers.map((tier) => {
            const isCurrent = activeZone === tier.id;
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all duration-200 ${
                  isCurrent
                    ? `${tier.activeBg} text-[#060B11] font-black shadow-lg scale-[1.02]`
                    : "bg-white/[0.02] border border-white/[0.04] text-[#8C98A8]"
                }`}
              >
                <span className="text-[10px] font-black tracking-wider">{tier.label}</span>
                <span className={`text-[9px] ${isCurrent ? "text-[#060B11]/80 font-bold" : "text-[#8C98A8]/60"}`}>
                  {tier.range}
                </span>
                {isCurrent && (
                  <span className="absolute -top-1 h-2 w-2 rounded-full bg-white shadow" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Toggles & Accordion */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8C98A8] border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setUseCustomConsumption(!useCustomConsumption);
              if (!useCustomConsumption && !customConsumptionInput) {
                setCustomConsumptionInput(String(vehicleConfig.consumptionPer100Km));
              }
            }}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
              useCustomConsumption
                ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
                : "border-white/[0.06] bg-[#101923] text-[#8C98A8] hover:text-[#F5F7FA]"
            }`}
          >
            {useCustomConsumption ? "✓ Özel Tüketim" : "+ Özel Tüketim"}
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#8C98A8] hover:text-[#F5F7FA]">
            <input
              type="checkbox"
              checked={isRoundTrip}
              onChange={(e) => setIsRoundTrip(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#00E5A0]"
            />
            <span>Gidiş-Dönüş</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setShowCostBreakdown(!showCostBreakdown)}
          className="flex items-center gap-1.5 font-bold text-[#00E5A0] hover:text-[#00c78a]"
        >
          <span>Maliyet Kalemleri (6 Kalem)</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${showCostBreakdown ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Custom Consumption Input */}
      {useCustomConsumption && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#00E5A0]/20 bg-[#00E5A0]/[0.04] p-3 text-xs">
          <span className="font-bold text-[#F5F7FA]">{vehicle.shortLabel} Özel Tüketim:</span>
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={customConsumptionInput}
            onChange={(e) => setCustomConsumptionInput(e.target.value)}
            placeholder={String(vehicleConfig.consumptionPer100Km)}
            className="w-20 rounded-lg border border-white/20 bg-[#060B11] px-2 py-1 text-xs font-mono font-bold text-[#00E5A0]"
          />
          <span className="text-[#8C98A8]">L / 100km</span>
        </div>
      )}

      {/* Expanded Cost Breakdown */}
      {showCostBreakdown && (
        <div className="mt-3 space-y-1.5 rounded-2xl border border-white/[0.06] bg-[#101923] p-4 text-xs">
          <div className="flex justify-between py-1 border-b border-white/[0.04]">
            <span className="text-[#8C98A8]">1. Akaryakıt (Motorin {breakdown.route.fuel.liters} L)</span>
            <span className="font-mono font-bold text-[#F5F7FA]">₺{breakdown.route.fuel.cost.toLocaleString("tr-TR")}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.04]">
            <span className="text-[#8C98A8]">2. Sürücü İşçilik ({breakdown.route.driver.hours} sa)</span>
            <span className="font-mono font-bold text-[#F5F7FA]">₺{breakdown.route.driver.cost.toLocaleString("tr-TR")}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.04]">
            <span className="text-[#8C98A8]">3. Otoyol & Köprü Geçiş</span>
            <span className="font-mono font-bold text-[#F5F7FA]">
              {breakdown.route.toll.isIncluded ? `₺${breakdown.route.toll.cost.toLocaleString("tr-TR")}` : "Dahil Edilmedi"}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.04]">
            <span className="text-[#8C98A8]">4. Bakım & Lastik</span>
            <span className="font-mono font-bold text-[#F5F7FA]">₺{breakdown.route.maintenance.cost.toLocaleString("tr-TR")}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.04]">
            <span className="text-[#8C98A8]">5. Amortisman & Yıpranma</span>
            <span className="font-mono font-bold text-[#F5F7FA]">₺{breakdown.route.depreciation.cost.toLocaleString("tr-TR")}</span>
          </div>
          {totals.loadSpecificDirectCost > 0 && (
            <div className="flex justify-between py-1 border-b border-white/[0.04] text-[#F5B94C]">
              <span>6. Yüke Özel Harç / İzin</span>
              <span className="font-mono font-bold">₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")}</span>
            </div>
          )}
          <div className="flex justify-between py-1 pt-2 font-bold text-[#F5F7FA]">
            <span className="text-[#8C98A8]">Genel İdare & Operasyon Payı (%{breakdown.overhead.ratePercent})</span>
            <span className="font-mono">₺{breakdown.overhead.cost.toLocaleString("tr-TR")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
