"use client";

import { useMemo, useState } from "react";
import {
  PRICING_VEHICLE_CONFIG,
  calculateOperatingPricing,
  evaluateCarrierBid,
} from "../utils/pricingService";

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

  if (!pricing) return null;

  const { totals, breakdown, vehicle, route, load: normalizedLoad } = pricing;

  return (
    <div
      aria-label="Taşıyıcı Akıllı Maliyet ve Kârlılık Görünümü"
      className={`rounded-2xl border border-white/10 bg-[#0B111B] p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      {/* Widget Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/6 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00E5A0]">
            TORK MALİYET & KÂRLILIK GÖRÜNÜMÜ
          </span>
          <span className="text-[10px] text-slate-500 font-bold">·</span>
          <span className="text-[10px] font-bold text-slate-400">Gizli Taşıyıcı Analitiği</span>
        </div>

        {/* Vehicle Selection Segmented Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/8 bg-black/40 p-0.5">
          {Object.values(PRICING_VEHICLE_CONFIG).map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                  isSelected
                    ? "bg-[#00E5A0] text-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {v.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Load Intelligence & Route Summary (Read-Only) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
        <span className="inline-flex items-center gap-1 rounded-md border border-white/6 bg-white/[0.02] px-2 py-0.5 font-bold">
          <span className="text-white">{route.distanceKm} km</span>
          {isRoundTrip && (
            <span className="text-amber-400">
              (Çift Yön{returnBuffer > 0 ? ` + %${returnBuffer}` : ""})
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/6 bg-white/[0.02] px-2 py-0.5 font-bold">
          <span className="text-white">{route.durationHours} sa</span> sürüş
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/6 bg-white/[0.02] px-2 py-0.5">
          Yük: <strong className="text-white">{normalizedLoad.loadTypeLabel}</strong>
          {normalizedLoad.tonnage && <span>({normalizedLoad.tonnage} ton)</span>}
        </span>

        {/* Capacity Warning Badge */}
        {normalizedLoad.utilization?.isOverweight && (
          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-300 font-bold">
            ⚠️ Kapasite Aşımı ({normalizedLoad.tonnage}/{vehicle.maxCargoWeightTon}t)
          </span>
        )}

        {/* Custom Consumption Toggle */}
        <button
          type="button"
          onClick={() => {
            setUseCustomConsumption(!useCustomConsumption);
            if (!useCustomConsumption && !customConsumptionInput) {
              setCustomConsumptionInput(String(vehicleConfig.consumptionPer100Km));
            }
          }}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
            useCustomConsumption
              ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
              : "border-white/8 bg-white/[0.02] text-slate-400 hover:text-white"
          }`}
        >
          <span>{useCustomConsumption ? "✓ Özel Tüketim" : "+ Özel Tüketim"}</span>
        </button>

        {/* Round Trip Checkbox */}
        <label className="ml-auto flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-400 hover:text-white">
          <input
            type="checkbox"
            checked={isRoundTrip}
            onChange={(e) => setIsRoundTrip(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-[#00E5A0]"
          />
          <span>Gidiş-Dönüş</span>
        </label>
      </div>

      {/* Expandable Custom Consumption & Buffer Controls */}
      {useCustomConsumption && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-[#00E5A0]/20 bg-[#00E5A0]/[0.03] p-2.5 text-xs animate-fadeIn">
          <span className="font-bold text-slate-300">{vehicle.shortLabel} Özel Tüketim:</span>
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={customConsumptionInput}
            onChange={(e) => setCustomConsumptionInput(e.target.value)}
            placeholder={String(vehicleConfig.consumptionPer100Km)}
            className="w-20 rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-xs font-mono font-bold text-[#00E5A0]"
          />
          <span className="text-slate-400">L/100km</span>
        </div>
      )}

      {isRoundTrip && (
        <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">Dönüş Yolu Operasyon Tamponu</span>
            <span className="text-amber-400 font-mono font-black">+{returnBuffer}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={returnBuffer}
            onChange={(e) => setReturnBuffer(parseInt(e.target.value, 10))}
            className="mt-1.5 h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-amber-400 cursor-pointer"
          />
        </div>
      )}

      {/* Real-Time Profit & Margin Dashboard */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Metric 1: Operasyon Maliyeti */}
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tahmini Maliyet
          </div>
          <div className="mt-1 text-base sm:text-lg font-black text-white">
            ₺{totals.totalOperatingCost.toLocaleString("tr-TR")}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400 font-mono">
            ₺{totals.unitCostPerKm.toFixed(2)}/km
          </div>
        </div>

        {/* Metric 2: Teklif Tutarı */}
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Teklifiniz
          </div>
          <div className="mt-1 text-base sm:text-lg font-black text-white">
            {bidAnalytics ? `₺${Number(bidAnalytics.bidAmount).toLocaleString("tr-TR")}` : "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {bidAnalytics ? "Girilen tutar" : "Tutar giriniz"}
          </div>
        </div>

        {/* Metric 3: Tahmini Brüt Kazanç */}
        <div className={`rounded-xl border p-3 ${
          !bidAnalytics
            ? "border-white/6 bg-white/[0.02]"
            : bidAnalytics.estimatedProfit >= 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/25 bg-red-500/10 text-red-400"
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tahmini Kazanç
          </div>
          <div className="mt-1 text-base sm:text-lg font-black font-mono">
            {bidAnalytics
              ? `${bidAnalytics.estimatedProfit >= 0 ? "+" : ""}₺${bidAnalytics.estimatedProfit.toLocaleString("tr-TR")}`
              : "—"}
          </div>
          <div className="mt-0.5 text-[10px] opacity-80">
            {bidAnalytics ? "Brüt sefer kârı" : "—"}
          </div>
        </div>

        {/* Metric 4: Tahmini Kâr Marjı */}
        <div className={`rounded-xl border p-3 ${
          !bidAnalytics
            ? "border-white/6 bg-white/[0.02]"
            : bidAnalytics.color === "emerald" || bidAnalytics.color === "gold"
              ? "border-[#00E5A0]/25 bg-[#00E5A0]/10 text-[#00E5A0]"
              : bidAnalytics.color === "blue"
                ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                : bidAnalytics.color === "amber"
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                  : "border-red-500/25 bg-red-500/10 text-red-400"
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tahmini Marj
          </div>
          <div className="mt-1 text-base sm:text-lg font-black font-mono">
            {bidAnalytics ? `%${bidAnalytics.marginPercent}` : "—"}
          </div>
          <div className="mt-0.5 text-[10px] font-bold">
            {bidAnalytics ? bidAnalytics.label : "—"}
          </div>
        </div>
      </div>

      {/* Real-time Quality / Warning Alert */}
      {bidAnalytics && (
        <div className={`mt-3 rounded-xl border p-3 text-xs flex items-center justify-between ${
          bidAnalytics.color === "emerald" || bidAnalytics.color === "gold"
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
            : bidAnalytics.color === "blue"
              ? "border-blue-500/20 bg-blue-500/5 text-blue-300"
              : bidAnalytics.color === "amber"
                ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                : "border-red-500/20 bg-red-500/5 text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">{bidAnalytics.message}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">TORK Yorumu</span>
        </div>
      )}

      {/* Accordion: Cost Breakdown */}
      <div className="mt-3 border-t border-white/6 pt-2.5">
        <button
          type="button"
          onClick={() => setShowCostBreakdown(!showCostBreakdown)}
          className="flex w-full items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 transition"
        >
          <span>Maliyet Kalemleri Dökümü (6 Kalem)</span>
          <span className="flex items-center gap-1 text-[#00E5A0]">
            <span>{showCostBreakdown ? "Gizle" : "Göster"}</span>
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${showCostBreakdown ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {showCostBreakdown && (
          <div className="mt-2.5 space-y-1.5 text-xs animate-fadeIn">
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">1. Akaryakıt (Motorin {breakdown.route.fuel.liters} L)</span>
              <span className="font-mono font-bold text-white">₺{breakdown.route.fuel.cost.toLocaleString("tr-TR")}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">2. Sürücü İşçilik ({breakdown.route.driver.hours} sa)</span>
              <span className="font-mono font-bold text-white">₺{breakdown.route.driver.cost.toLocaleString("tr-TR")}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">3. Otoyol & Köprü Geçiş</span>
              <span className="font-mono font-bold text-white">
                {breakdown.route.toll.isIncluded ? `₺${breakdown.route.toll.cost.toLocaleString("tr-TR")}` : "Doğrulanamadı (Dahil Edilmedi)"}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">4. Bakım & Lastik</span>
              <span className="font-mono font-bold text-white">₺{breakdown.route.maintenance.cost.toLocaleString("tr-TR")}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">5. Amortisman & Yıpranma</span>
              <span className="font-mono font-bold text-white">₺{breakdown.route.depreciation.cost.toLocaleString("tr-TR")}</span>
            </div>
            {totals.loadSpecificDirectCost > 0 && (
              <div className="flex justify-between rounded-lg bg-white/[0.01] p-2 text-amber-300">
                <span>6. Yüke Özel Harç / İzin</span>
                <span className="font-mono font-bold">₺{totals.loadSpecificDirectCost.toLocaleString("tr-TR")}</span>
              </div>
            )}
            <div className="flex justify-between rounded-lg bg-white/[0.01] p-2">
              <span className="text-slate-400">Genel İdare & Operasyon Payı (%{breakdown.overhead.ratePercent})</span>
              <span className="font-mono font-bold text-white">₺{breakdown.overhead.cost.toLocaleString("tr-TR")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
