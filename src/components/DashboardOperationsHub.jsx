"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FuelPriceWidget from "./FuelPriceWidget";
import MiniLiveMap from "./MiniLiveMap";
import TorkIntelligenceCard from "./TorkIntelligenceCard";

// In-memory session cache for location & weather across tab switches
let sessionGeoCache = null;

const WEATHER_CODES = {
  0: { type: "sun", label: "Açık" },
  1: { type: "cloud-sun", label: "Az Bulutlu" },
  2: { type: "cloud-sun", label: "Parçalı Bulutlu" },
  3: { type: "cloud", label: "Bulutlu" },
  45: { type: "fog", label: "Sisli" },
  48: { type: "fog", label: "Donlu Sis" },
  51: { type: "rain", label: "Hafif Çisenti" },
  53: { type: "rain", label: "Çisenti" },
  55: { type: "rain", label: "Yoğun Yağmur" },
  61: { type: "rain", label: "Hafif Yağmur" },
  63: { type: "rain", label: "Orta Yağmur" },
  65: { type: "rain", label: "Şiddetli Yağmur" },
  71: { type: "snow", label: "Hafif Kar" },
  73: { type: "snow", label: "Kar Yağışlı" },
  75: { type: "snow", label: "Yoğun Kar" },
  80: { type: "rain", label: "Sağanak" },
  95: { type: "storm", label: "Fırtına" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { type: "cloud", label: "Bilinmiyor" };
}

function WeatherIcon({ type, className = "h-4 w-4 text-[#F5A400]" }) {
  if (type === "sun") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (type === "cloud-sun") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M17.657 16.95l-1.414-1.414M7.05 7.05L5.636 5.636M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (type === "rain" || type === "storm") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25M8 19v3m4-3v3m4-3v3" />
      </svg>
    );
  }
  if (type === "snow") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-9-9h18m-15.364-6.364l12.728 12.728m0-12.728L6.343 17.657" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}

export default function DashboardOperationsHub({
  userDashboard,
  onNavigate,
  onResetCreateForm,
  counts = {},
  loads = [],
  myLoads = [],
  bids = [],
  activeTransports = [],
}) {
  const [geoState, setGeoState] = useState(() => sessionGeoCache || {
    coords: null,
    locationName: "Konum Bekleniyor",
    temp: null,
    feelsLike: null,
    weatherLabel: null,
    weatherType: "cloud",
    status: "idle",
    errorMsg: null,
  });

  const [isLocating, setIsLocating] = useState(false);
  const isMountedRef = useRef(true);

  const fetchWeatherAndGeocode = useCallback(async (latitude, longitude) => {
    try {
      const [weatherRes, geoRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=tr`),
      ]);

      let weatherData = null;
      if (weatherRes.ok) {
        weatherData = await weatherRes.json();
      }

      let geoData = null;
      if (geoRes.ok) {
        geoData = await geoRes.json();
      }

      const currentWeather = weatherData?.current_weather;
      const weatherInfo = currentWeather ? getWeatherInfo(currentWeather.weathercode) : { type: "cloud", label: "Açık" };
      const address = geoData?.address;
      const locationName = address
        ? `${address.town || address.district || address.suburb || ""}, ${address.province || address.city || "Türkiye"}`.replace(/^,\s*/, "")
        : "Türkiye";

      const newState = {
        coords: { lat: latitude, lng: longitude },
        locationName,
        temp: currentWeather ? Math.round(currentWeather.temperature) : null,
        feelsLike: currentWeather ? Math.round(currentWeather.temperature) : null,
        weatherLabel: weatherInfo.label,
        weatherType: weatherInfo.type,
        status: "success",
        errorMsg: null,
      };

      sessionGeoCache = newState;
      if (isMountedRef.current) {
        setGeoState(newState);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setGeoState((prev) => ({
          ...prev,
          status: "fallback",
          locationName: "Türkiye (Genel)",
          errorMsg: "Hava durumu servisi yanıt vermedi.",
        }));
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoState((prev) => ({ ...prev, status: "error", errorMsg: "Tarayıcınız konum servisini desteklemiyor." }));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        fetchWeatherAndGeocode(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        fetchWeatherAndGeocode(41.0082, 28.9784); // Default to Istanbul
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [fetchWeatherAndGeocode]);

  useEffect(() => {
    isMountedRef.current = true;
    let timer = null;
    if (!sessionGeoCache) {
      timer = setTimeout(() => {
        requestLocation();
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
      isMountedRef.current = false;
    };
  }, [requestLocation]);

  const isShipper = userDashboard?.role === "shipper";
  const activeLoadsCount = isShipper ? counts.myLoadsCount || 0 : counts.loadsCount || 0;
  const bidsCount = isShipper ? counts.bidsCount || 0 : counts.carrierBidsCount || 0;
  const transportsCount = counts.activeTransportsCount || 0;
  const openFreightEstimate = `₺${((activeLoadsCount * 42000) || 184000).toLocaleString("tr-TR")}`;

  const detectedProvince = useMemo(() => {
    if (!geoState.locationName) return null;
    return geoState.locationName.split(",").pop().trim();
  }, [geoState.locationName]);

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto pb-12">
      {/* =========================================================
          TOP KPI LINE (4 Major Metrics Strip in TORK Orange)
         ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: AKTİF YÜK */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
            Aktif Yük
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-[#F3F4F6]">
            {activeLoadsCount}
          </div>
          <div className="mt-1 text-xs text-[#A0AEC0]">
            {isShipper ? "Açık İlanlarınız" : "Piyasadaki Yükler"}
          </div>
        </div>

        {/* KPI 2: BEKLEYEN TEKLİF */}
        <div className="rounded-xl border border-[#F5A400]/40 bg-[#1F2937] p-4 sm:p-5 shadow-lg shadow-[#F5A400]/5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#F5A400]">
            Bekleyen Teklif
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-[#F5A400]">
            {bidsCount}
          </div>
          <div className="mt-1 text-xs text-[#A0AEC0]">
            {isShipper ? "Gelen Teklifler" : "Verdiğiniz Teklifler"}
          </div>
        </div>

        {/* KPI 3: AKTİF TAŞIMA */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#F3F4F6]">
            Aktif Taşıma
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-[#F3F4F6]">
            {transportsCount}
          </div>
          <div className="mt-1 text-xs text-[#A0AEC0]">
            Devam Eden Seferler
          </div>
        </div>

        {/* KPI 4: AÇIK NAVLUN */}
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
            Açık Navlun Hacmi
          </div>
          <div className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-[#F5A400]">
            {openFreightEstimate}
          </div>
          <div className="mt-1 text-xs text-[#A0AEC0]">
            Tahmini Sefer Değeri
          </div>
        </div>
      </div>

      {/* =========================================================
          CONTROL TOWER SPLIT GRID
          LEFT (7 COLS): Live Interactive Fleet & Rerouting Map
          RIGHT (5 COLS): TORK Intelligence Operations Center
         ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* LEFT COLUMN: Map & Live Telemetry */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <MiniLiveMap
            coords={geoState.coords}
            locationName={geoState.locationName}
            onRequestLocation={requestLocation}
            isLocating={isLocating}
          />

          {/* Location & Weather Mini Card */}
          <div className="flex items-center justify-between rounded-xl border border-[#374151] bg-[#1F2937] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] border border-[#374151]">
                <WeatherIcon type={geoState.weatherType} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#F3F4F6]">
                  {geoState.locationName}
                </div>
                <div className="text-xs text-[#A0AEC0]">
                  {geoState.temp !== null ? `${geoState.temp}°C · ${geoState.weatherLabel}` : "Konum ve hava durumu taranıyor"}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5A400] bg-[#F5A400]/10 border border-[#F5A400]/30 px-2.5 py-1 rounded-full">
              CANLI TELEMETRİ
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: TORK Intelligence Operations Card & Fuel Widget */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <TorkIntelligenceCard
            loads={loads}
            myLoads={myLoads}
            bids={bids}
            activeTransports={activeTransports}
            userDashboard={userDashboard}
            onNavigate={onNavigate}
          />

          <FuelPriceWidget province={detectedProvince} />
        </div>
      </div>

      {/* =========================================================
          QUICK ACTIONS
         ========================================================= */}
      <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#A0AEC0]">
              Hızlı İşlemler
            </div>
            <h3 className="text-lg font-black text-[#F3F4F6]">Operasyonel Kısayollar</h3>
          </div>
          <span className="text-xs font-semibold text-[#A0AEC0]">Tek Tıkla Erişim</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {isShipper ? (
            <>
              {/* 1. Yeni Yük İlanı (Primary CTA) */}
              <button
                type="button"
                onClick={() => {
                  if (onResetCreateForm) onResetCreateForm();
                  if (onNavigate) onNavigate("create");
                }}
                className="group flex flex-col justify-between rounded-xl border border-[#F5A400]/40 bg-[#111827] p-5 text-left transition hover:border-[#F5A400] hover:bg-[#F5A400]/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5A400]/20 text-[#F5A400]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#F5A400] opacity-0 transition group-hover:opacity-100">
                    Başlat →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">+ Yeni Yük İlanı</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Adım adım sihirbaz ile yayınla</div>
                </div>
              </button>

              {/* 2. Gelen Teklifler (Secondary CTA) */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("bids")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#F5A400]/50 hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5A400]/10 text-[#F5A400]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  {counts.bidsCount > 0 && (
                    <span className="rounded-full bg-[#F5A400] px-2 py-0.5 text-[11px] font-black text-[#111827]">
                      {counts.bidsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Gelen Teklifler</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Teklifleri matriste karşılaştır</div>
                </div>
              </button>

              {/* 3. İlanlarım */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("loads")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#4B5563] hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2937] text-[#F3F4F6]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">İlanlarım</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Açık yük listesini kontrol et</div>
                </div>
              </button>

              {/* 4. Cüzdan & Ödemeler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#4B5563] hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2937] text-[#F5A400]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Cüzdan & Bakiye</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Mutabakatlar & ödemeler</div>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* 1. Açık Yükleri Gör (Primary CTA) */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("board")}
                className="group flex flex-col justify-between rounded-xl border border-[#F5A400]/40 bg-[#111827] p-5 text-left transition hover:border-[#F5A400] hover:bg-[#F5A400]/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5A400]/20 text-[#F5A400]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#F5A400] opacity-0 transition group-hover:opacity-100">
                    Göz At →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Açık Yükleri Gör</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Pazaryerinde yük bul & teklif ver</div>
                </div>
              </button>

              {/* 2. Aktif Seferler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("transports")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#4B5563] hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2937] text-[#F3F4F6]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Aktif Seferler</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Yoldaki yükleri & POD yükle</div>
                </div>
              </button>

              {/* 3. Tekliflerim */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("my-bids")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#4B5563] hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2937] text-[#F3F4F6]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Tekliflerim</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Verilen tekliflerin durumu</div>
                </div>
              </button>

              {/* 4. Cüzdan */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-xl border border-[#374151] bg-[#111827] p-5 text-left transition hover:border-[#4B5563] hover:bg-[#283548]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2937] text-[#F5A400]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F3F4F6]">Hakediş & Cüzdan</div>
                  <div className="mt-0.5 text-xs text-[#A0AEC0]">Bakiye durumu & mutabakatlar</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
