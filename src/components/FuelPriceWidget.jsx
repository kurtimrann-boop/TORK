"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCityFuelPrices, fetchNationalFuelPrices } from "../utils/fuelService";

function formatFuelPriceTR(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `₺${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatFuelDateTR(dateString) {
  if (!dateString) return "Bugün";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Bugün";
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Bugün";
  }
}

// Clean SVG Fuel Icons (No Emojis)
function GasolineIcon({ className = "h-4 w-4 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h10a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h6v4H6V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 8h2a2 2 0 012 2v8a2 2 0 002 2" />
      <circle cx="9" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function DieselTruckIcon({ className = "h-4 w-4 text-[#F5A400]" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function LpgCylinderIcon({ className = "h-4 w-4 text-cyan-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v2H9V3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a3 3 0 013-3h6a3 3 0 013 3v10a3 3 0 01-3 3H9a3 3 0 01-3-3V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m-2-2h4" />
    </svg>
  );
}

export default function FuelPriceWidget({ province = null, className = "" }) {
  const [fuelData, setFuelData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const isMountedRef = useRef(true);

  const loadPrices = useCallback(async (bypassCache = false) => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      let data;
      if (province) {
        data = await fetchCityFuelPrices(province, bypassCache);
      } else {
        data = await fetchNationalFuelPrices(bypassCache);
      }

      if (isMountedRef.current) {
        setFuelData(data);
        setStatus("success");
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn("[FuelPriceWidget] Fiyat çekme hatası:", err.message);
        setErrorMsg("Akaryakıt piyasa verilerine şu anda ulaşılamıyor.");
        setStatus("error");
      }
    }
  }, [province]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      loadPrices(false);
    }, 0);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [loadPrices]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleManualRefresh = () => {
    if (cooldownSec > 0 || status === "loading") return;
    setCooldownSec(30);
    loadPrices(true);
  };

  const prices = fuelData?.prices || {};
  const isStale = Boolean(fuelData?.isStale);
  const isNationalFallback = Boolean(fuelData?.isNationalFallback);
  const activeProvinceName = fuelData?.province?.name || (typeof province === "string" ? province : province?.name);
  const updateDateText = formatFuelDateTR(fuelData?.updatedAt);

  return (
    <section
      aria-label="Akaryakıt Fiyatları"
      className={`relative flex flex-col justify-between rounded-3xl border border-white/8 bg-[#0F1723] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)] backdrop-blur-md ${className}`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F5A400] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A400]">
              YAKIT PİYASASI
            </span>
            {activeProvinceName ? (
              <>
                <span className="text-[10px] text-slate-500 font-bold">·</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  {activeProvinceName}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-slate-500 font-bold">·</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  TÜRKİYE GENELİ
                </span>
              </>
            )}
          </div>

          {/* Refresh Button with Cooldown */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={cooldownSec > 0 || status === "loading"}
            title={cooldownSec > 0 ? `${cooldownSec}s sonra yenilenebilir` : "Fiyatları yenile"}
            aria-label="Yakıt fiyatlarını yenile"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <svg
              className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin text-[#F5A400]" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">
            {activeProvinceName ? `${activeProvinceName} Güncel Pompa Fiyatları` : "Güncel Akaryakıt Fiyatları"}
          </h3>
          <div className="flex items-center gap-1.5">
            {isNationalFallback && (
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400">
                Ulusal Ortalama
              </span>
            )}
            {isStale && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                Son Bilinen Veri
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-4 space-y-2">
        {status === "loading" && !fuelData ? (
          // Skeleton Loading State
          <div className="space-y-2 py-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/4 bg-white/[0.01] px-3.5 py-2.5 animate-pulse"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded bg-white/10" />
                  <div className="h-3 w-16 rounded bg-white/10" />
                </div>
                <div className="h-4 w-20 rounded bg-white/10" />
              </div>
            ))}
            <div className="pt-1 text-center text-[10px] text-slate-500">
              Yakıt fiyatları yükleniyor...
            </div>
          </div>
        ) : status === "error" && !fuelData ? (
          // Compact Single-Line Error State
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#101923] px-3.5 py-2.5 text-xs text-[#8C98A8]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F5B94C]" />
              <span>Akaryakıt verisine ulaşılamıyor.</span>
            </div>
            <button
              type="button"
              onClick={() => loadPrices(true)}
              className="text-[11px] font-bold text-[#F5A400] hover:underline"
            >
              Yenile
            </button>
          </div>
        ) : (
          // 3 Fuel Price Rows
          <>
            {/* 1. MOTORİN (Primary Logistics Hierarchy — Emerald Highlight) */}
            <div className="flex items-center justify-between rounded-xl border border-[#F5A400]/25 bg-[#F5A400]/[0.06] px-3.5 py-2.5 shadow-[0_0_16px_rgba(245,164,0,0.06)] transition hover:border-[#F5A400]/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F5A400]/30 bg-[#F5A400]/15">
                  <DieselTruckIcon className="h-3.5 w-3.5 text-[#F5A400]" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">MOTORİN</div>
                  <div className="text-[10px] font-bold text-[#F5A400]/80">Dizel Navlun</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black tracking-tight text-[#F5A400]">
                  {formatFuelPriceTR(prices.diesel?.price ?? prices.diesel?.average)}
                  <span className="text-[10px] font-medium text-slate-400"> / L</span>
                </div>
                {prices.diesel?.min && prices.diesel?.max && prices.diesel.min !== prices.diesel.max && (
                  <div className="text-[9px] font-medium text-slate-400">
                    Min {formatFuelPriceTR(prices.diesel.min)} · Max {formatFuelPriceTR(prices.diesel.max)}
                  </div>
                )}
              </div>
            </div>

            {/* 2. BENZİN (Secondary) */}
            <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3.5 py-2 transition hover:border-white/12">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <GasolineIcon className="h-3 w-3 text-slate-300" />
                </div>
                <span className="text-xs font-bold text-slate-200">BENZİN</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-200">
                  {formatFuelPriceTR(prices.gasoline?.price ?? prices.gasoline?.average)}
                </span>
                <span className="text-[10px] font-medium text-slate-500"> / L</span>
              </div>
            </div>

            {/* 3. LPG (Secondary) */}
            <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3.5 py-2 transition hover:border-white/12">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <LpgCylinderIcon className="h-3 w-3 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">LPG</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-200">
                  {formatFuelPriceTR(prices.lpg?.price ?? prices.lpg?.average)}
                </span>
                <span className="text-[10px] font-medium text-slate-500"> / L</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Attribution & Date */}
      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[10px] text-slate-500 font-medium">
        <span>Güncelleme: {updateDateText}</span>
        <span>Kaynak: UcuzYakıtBul</span>
      </div>
    </section>
  );
}
