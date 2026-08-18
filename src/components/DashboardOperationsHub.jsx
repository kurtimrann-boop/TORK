"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FuelPriceWidget from "./FuelPriceWidget";
import MiniLiveMap from "./MiniLiveMap";

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

function WeatherIcon({ type, className = "h-5 w-5 text-[#FFCC00]" }) {
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
}) {
  const [geoState, setGeoState] = useState(() => sessionGeoCache || {
    coords: null,
    locationName: "Konum Bekleniyor",
    temp: null,
    feelsLike: null,
    weatherLabel: null,
    weatherType: "cloud",
    status: "idle", // idle | locating | success | error
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

      let locationName = "Mevcut Konum";
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const district = addr.district || addr.suburb || addr.town || addr.county || "";
        const city = addr.city || addr.province || addr.state || "";
        locationName = district && city ? `${city}, ${district}` : city || district || "Mevcut Konum";
      }

      let weatherData = null;
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        const cur = data.current_weather;
        const info = getWeatherInfo(cur.weathercode);
        const temp = Math.round(cur.temperature);
        const wind = cur.windspeed || 0;
        const feelsLike = Math.round(temp - (wind > 15 ? 1 : 0));

        weatherData = {
          temp,
          feelsLike,
          weatherLabel: info.label,
          weatherType: info.type,
        };
      }

      const nextState = {
        coords: { lat: latitude, lng: longitude },
        locationName,
        temp: weatherData?.temp ?? null,
        feelsLike: weatherData?.feelsLike ?? null,
        weatherLabel: weatherData?.weatherLabel ?? "Açık",
        weatherType: weatherData?.weatherType ?? "cloud",
        status: "success",
        errorMsg: null,
      };

      sessionGeoCache = nextState;
      if (isMountedRef.current) {
        setGeoState(nextState);
      }
    } catch (err) {
      console.warn("[DashboardOperationsHub] Geocode/Weather fetch failed:", err);
      const fallbackState = {
        coords: { lat: latitude, lng: longitude },
        locationName: "Operasyon Merkezi",
        temp: null,
        feelsLike: null,
        weatherLabel: null,
        weatherType: "cloud",
        status: "success",
        errorMsg: null,
      };
      sessionGeoCache = fallbackState;
      if (isMountedRef.current) {
        setGeoState(fallbackState);
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState((prev) => ({
        ...prev,
        status: "error",
        errorMsg: "Tarayıcınız konum servisini desteklemiyor.",
      }));
      return;
    }

    setIsLocating(true);
    setGeoState((prev) => ({ ...prev, status: "locating", errorMsg: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        fetchWeatherAndGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn("[DashboardOperationsHub] Geolocation error:", err.message);
        setGeoState((prev) => ({
          ...prev,
          status: "error",
          errorMsg: "Konum izni alınamadı.",
        }));
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, [fetchWeatherAndGeocode]);

  useEffect(() => {
    isMountedRef.current = true;
    let timer = null;
    if (!sessionGeoCache && geoState.status === "idle") {
      timer = setTimeout(() => {
        requestLocation();
      }, 0);
    }
    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [geoState.status, requestLocation]);

  const isShipper = userDashboard?.role === "shipper";

  const detectedProvince = useMemo(() => {
    if (!geoState.locationName || geoState.locationName === "Mevcut Konum" || geoState.locationName === "Konum Bekleniyor") {
      return null;
    }
    const parts = geoState.locationName.split(",");
    return parts[0]?.trim() || null;
  }, [geoState.locationName]);

  return (
    <div className="space-y-6">
      {/* =========================================================
          1. OPERATIONS INTELLIGENCE BANNER
         ========================================================= */}
      <div className="rounded-3xl border border-white/8 bg-[#0F1723] p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-3 w-3 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-ping" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00E5A0]">
                CANLI OPERASYON HUB
              </span>
              <span className="text-[10px] text-slate-500 font-bold">·</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isShipper ? "Yük Veren Terminali" : "Taşıyıcı Filo Terminali"}
              </span>
            </div>

            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-[-0.03em]">
              Günaydın, {userDashboard?.company_name || userDashboard?.full_name || "TORK Operasyon"}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {isShipper
                ? "Navlun ilanlarınızı ve gelen teklifleri gerçek zamanlı izleyin."
                : "Açık navlun fırsatlarını inceleyin ve tekliflerinizi yönetin."}
            </p>
          </div>

          {/* Location & Weather Telemetry Pills */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[480px]">
            {/* Location Pill */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00E5A0]/20 bg-[#00E5A0]/10 text-[#00E5A0]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Operasyon Konumu
                </div>
                <div className="truncate text-xs font-black text-white">
                  {geoState.locationName}
                </div>
                {!geoState.coords && (
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="mt-0.5 text-[10px] font-bold text-[#00E5A0] hover:underline"
                  >
                    Konum iznini etkinleştir →
                  </button>
                )}
              </div>
            </div>

            {/* Weather Pill */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/10">
                <WeatherIcon type={geoState.weatherType} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Hava Durumu
                </div>
                <div className="text-xs font-black text-white">
                  {geoState.temp !== null ? (
                    <>
                      <span>{geoState.temp}°C</span>
                      <span className="mx-1 text-slate-500">·</span>
                      <span className="font-medium text-slate-300">{geoState.weatherLabel}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Veri alınıyor...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          2. LIVE OPERATIONS GRID: MINI MAP + FUEL MARKET
         ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* LEFT (7 COLS): Mini Live Map */}
        <div className="lg:col-span-7">
          <MiniLiveMap
            coords={geoState.coords}
            locationName={geoState.locationName}
            onRequestLocation={requestLocation}
            isLocating={isLocating}
          />
        </div>

        {/* RIGHT (5 COLS): Fuel Price Market Widget */}
        <div className="lg:col-span-5">
          <FuelPriceWidget province={detectedProvince} className="h-full" />
        </div>
      </div>

      {/* =========================================================
          QUICK ACTIONS (Compact 4-Column Grid)
         ========================================================= */}
      <div className="rounded-3xl border border-white/8 bg-[#0F1723] p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA7B5]">
              Hızlı Aksiyon Merkezi
            </div>
            <h3 className="text-lg font-black text-white">Operasyon İşlemleri</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">Doğrudan Navigasyon</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isShipper ? (
            <>
              {/* 1. Yeni Yük */}
              <button
                type="button"
                onClick={() => {
                  if (onResetCreateForm) onResetCreateForm();
                  if (onNavigate) onNavigate("create");
                }}
                className="group flex flex-col justify-between rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/5 p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/10 hover:shadow-[0_0_24px_rgba(0,229,160,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/15 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#00E5A0] opacity-0 transition group-hover:opacity-100">
                    Başlat →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">+ Yeni Yük</div>
                  <div className="mt-1 text-xs text-slate-400">Yeni navlun ilanı yayınla</div>
                </div>
              </button>

              {/* 2. Gelen Teklifler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("bids")}
                className="group flex flex-col justify-between rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-5 text-left transition duration-200 hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/10 hover:shadow-[0_0_24px_rgba(6,182,212,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/15 text-[#06B6D4] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  {counts.bidsCount > 0 && (
                    <span className="rounded-full bg-[#06B6D4] px-2 py-0.5 text-[10px] font-black text-black">
                      {counts.bidsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Gelen Teklifler</div>
                  <div className="mt-1 text-xs text-slate-400">Teklifleri karşılaştır & onayla</div>
                </div>
              </button>

              {/* 3. İlanlarım */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("loads")}
                className="group flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-400 opacity-0 transition group-hover:opacity-100">
                    Yönet →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">İlanlarım</div>
                  <div className="mt-1 text-xs text-slate-400">Tüm yük ilanlarını yönet</div>
                </div>
              </button>

              {/* 4. Cüzdan */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-2xl border border-[#FFCC00]/20 bg-[#FFCC00]/5 p-5 text-left transition duration-200 hover:border-[#FFCC00]/40 hover:bg-[#FFCC00]/10 hover:shadow-[0_0_24px_rgba(255,204,0,0.12)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FFCC00]/30 bg-[#FFCC00]/15 text-[#FFCC00] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#FFCC00] opacity-0 transition group-hover:opacity-100">
                    Bakiye →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Cüzdan & Finans</div>
                  <div className="mt-1 text-xs text-slate-400">Bakiye ve ödeme geçmişi</div>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* 1. Uygun Yükler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("board")}
                className="group flex flex-col justify-between rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/5 p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/10 hover:shadow-[0_0_24px_rgba(0,229,160,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/15 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#00E5A0] opacity-0 transition group-hover:opacity-100">
                    İncele →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Uygun Yükler</div>
                  <div className="mt-1 text-xs text-slate-400">Açık navlun fırsatlarını gör</div>
                </div>
              </button>

              {/* 2. Tekliflerim */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("my-bids")}
                className="group flex flex-col justify-between rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-5 text-left transition duration-200 hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/10 hover:shadow-[0_0_24px_rgba(6,182,212,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/15 text-[#06B6D4] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  {counts.carrierBidsCount > 0 && (
                    <span className="rounded-full bg-[#06B6D4] px-2 py-0.5 text-[10px] font-black text-black">
                      {counts.carrierBidsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Tekliflerim</div>
                  <div className="mt-1 text-xs text-slate-400">Verdiğin tekliflerin durumları</div>
                </div>
              </button>

              {/* 3. Aktif Taşımalar */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("transports")}
                className="group flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  {counts.activeTransportsCount > 0 && (
                    <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-black">
                      {counts.activeTransportsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Aktif Taşımalar</div>
                  <div className="mt-1 text-xs text-slate-400">Devam eden sevkiyatları takip et</div>
                </div>
              </button>

              {/* 4. Cüzdan */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-2xl border border-[#FFCC00]/20 bg-[#FFCC00]/5 p-5 text-left transition duration-200 hover:border-[#FFCC00]/40 hover:bg-[#FFCC00]/10 hover:shadow-[0_0_24px_rgba(255,204,0,0.12)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FFCC00]/30 bg-[#FFCC00]/15 text-[#FFCC00] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#FFCC00] opacity-0 transition group-hover:opacity-100">
                    Bakiye →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Cüzdan & Hakediş</div>
                  <div className="mt-1 text-xs text-slate-400">Ödemeler ve hakediş bakiyesi</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
