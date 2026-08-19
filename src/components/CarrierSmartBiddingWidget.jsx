"use client";

import React, { useMemo, useState } from "react";
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
        bidEvaluation: bidAnalytics,
      },
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
    pricing,
    bidAmount,
    bidAnalytics,
  ]);

  const formatTL = (val) => {
    if (!Number.isFinite(val)) return "0 ₺";
    return `${Math.round(val).toLocaleString("tr-TR")} ₺`;
  };

  return (
    <div className={`space-y-4 rounded-xl border border-[#374151] bg-[#1F2937] p-4 text-[#F3F4F6] shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#374151] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#F5A400] shadow-[0_0_8px_#F5A400]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#F3F4F6]">
              Akıllı Maliyet & Teklif Asistanı
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[#A0AEC0]">
            Maliyetin altında teklif vermeyi önler, sefer kârlılığını anlık analiz eder.
          </p>
        </div>

        {/* Vehicle Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-[#374151] bg-[#111827] p-1 text-xs font-bold">
          {["TIR", "KAMYON", "KAMYONET", "ONTEKER"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelectedVehicle(v)}
              className={`rounded px-2.5 py-1 transition ${
                selectedVehicle === v
                  ? "bg-[#F5A400] text-[#111827] font-black"
                  : "text-[#A0AEC0] hover:text-[#F3F4F6]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Operating Cost Breakdown Summary Cards */}
      {pricing && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[#374151] bg-[#111827] p-2.5">
            <span className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider">
              Tahmini Yakıt
            </span>
            <div className="mt-1 text-sm font-black font-mono text-[#F3F4F6]">
              {formatTL(pricing.costBreakdown?.fuelCost)}
            </div>
            <span className="text-[11px] text-[#A0AEC0]">
              ~{Math.round(pricing.costBreakdown?.litersNeeded || 0)} Litre
            </span>
          </div>

          <div className="rounded-lg border border-[#374151] bg-[#111827] p-2.5">
            <span className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider">
              Otoyol / HGS
            </span>
            <div className="mt-1 text-sm font-black font-mono text-[#F3F4F6]">
              {formatTL(pricing.costBreakdown?.tollCost)}
            </div>
            <span className="text-[11px] text-[#A0AEC0]">Geçiş & Köprü</span>
          </div>

          <div className="rounded-lg border border-[#374151] bg-[#111827] p-2.5">
            <span className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider">
              Sürücü & Amortisman
            </span>
            <div className="mt-1 text-sm font-black font-mono text-[#F3F4F6]">
              {formatTL(
                (pricing.costBreakdown?.driverCost || 0) +
                (pricing.costBreakdown?.maintenanceCost || 0)
              )}
            </div>
            <span className="text-[11px] text-[#A0AEC0]">İşçilik + Bakım</span>
          </div>

          <div className="rounded-lg border border-[#F5A400]/40 bg-[#F5A400]/10 p-2.5">
            <span className="text-[11px] font-bold text-[#F5A400] uppercase tracking-wider">
              Minimum Taban Maliyet
            </span>
            <div className="mt-1 text-sm font-black font-mono text-[#F5A400]">
              {formatTL(pricing.operatingCost)}
            </div>
            <span className="text-[11px] text-[#A0AEC0]">Zarar Eşiği</span>
          </div>
        </div>
      )}

      {/* Real-time Bid Profit Analysis */}
      {bidAnalytics ? (
        <div
          className={`rounded-lg border p-3.5 transition ${
            bidAnalytics.profitMargin >= 10
              ? "border-[#22C55E]/40 bg-[#22C55E]/10"
              : bidAnalytics.profitMargin >= 0
              ? "border-[#F5A400]/40 bg-[#F5A400]/10"
              : "border-[#EF4444]/40 bg-[#EF4444]/10"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
                Net Kâr · Teklif Kârlılık Analizi ({formatTL(parseFloat(bidAmount))})
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-lg font-black font-mono ${
                    bidAnalytics.profit >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                  }`}
                >
                  {bidAnalytics.profit >= 0 ? "+" : ""}
                  {formatTL(bidAnalytics.profit)}
                </span>
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    bidAnalytics.profitMargin >= 10
                      ? "bg-[#22C55E]/20 text-[#22C55E]"
                      : bidAnalytics.profitMargin >= 0
                      ? "bg-[#F5A400]/20 text-[#F5A400]"
                      : "bg-[#EF4444]/20 text-[#EF4444]"
                  }`}
                >
                  %{Math.round(bidAnalytics.profitMargin)} Marj
                </span>
              </div>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold text-[#F3F4F6]">{bidAnalytics.ratingLabel}</div>
              <div className="text-[11px] text-[#A0AEC0]">{bidAnalytics.advice}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#374151] bg-[#111827]/60 p-3 text-center text-xs text-[#A0AEC0]">
          💡 Yukarıdaki teklif kutusuna tutar girdiğinizde anlık kârlılık ve marj analizi hesaplanır.
        </div>
      )}

      {/* Advanced Cost Breakdown Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowCostBreakdown(!showCostBreakdown)}
          className="text-xs font-bold text-[#F5A400] hover:text-[#D98200] transition flex items-center gap-1"
        >
          <span>{showCostBreakdown ? "▼ Maliyet Detaylarını Gizle" : "▶ Detaylı Maliyet Parametrelerini Göster"}</span>
        </button>

        {showCostBreakdown && pricing && (
          <div className="mt-3 space-y-3 rounded-lg border border-[#374151] bg-[#111827] p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[#A0AEC0]">
              <div>Ortalama Tüketim: <span className="text-[#F3F4F6] font-mono">{pricing.breakdown?.route?.fuel?.consumptionPer100Km || pricing.costBreakdown?.consumptionRate || 32} L/100km</span></div>
              <div>Motorin Litre Fiyatı: <span className="text-[#F3F4F6] font-mono">{fuelPricePerLiter.toFixed(2)} ₺</span></div>
              <div>Tahmini Sefer Süresi: <span className="text-[#F3F4F6] font-mono">{Math.round(durationMinutes / 60)} saat {durationMinutes % 60} dk</span></div>
              <div>Boş Dönüş Tamponu: <span className="text-[#F3F4F6] font-mono">%{returnBuffer}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Cryptographic Proof Verification Card */}
      {verifiedAudit && (
        <TorkVerifiedCard
          verifiedAudit={verifiedAudit}
          context="CARRIER_BID_EVALUATION"
          className="mt-2"
        />
      )}
    </div>
  );
}
