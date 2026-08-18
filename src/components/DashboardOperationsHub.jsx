"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MiniLiveMap from "./MiniLiveMap";

// In-memory session cache for location & weather across tab switches
let sessionGeoCache = null;

const WEATHER_CODES = {
  0: { emoji: "☀️", label: "Açık" },
  1: { emoji: "🌤️", label: "Az Bulutlu" },
  2: { emoji: "⛅", label: "Parçalı Bulutlu" },
  3: { emoji: "☁️", label: "Bulutlu" },
  45: { emoji: "🌫️", label: "Sisli" },
  48: { emoji: "🌫️", label: "Donlu Sis" },
  51: { emoji: "🌦️", label: "Hafif Çisenti" },
  53: { emoji: "🌦️", label: "Çisenti" },
  55: { emoji: "🌧️", label: "Yoğun Yağmur" },
  61: { emoji: "🌧️", label: "Hafif Yağmur" },
  63: { emoji: "🌧️", label: "Orta Yağmur" },
  65: { emoji: "🌧️", label: "Şiddetli Yağmur" },
  71: { emoji: "❄️", label: "Hafif Kar" },
  73: { emoji: "❄️", label: "Kar Yağışlı" },
  75: { emoji: "❄️", label: "Yoğun Kar" },
  80: { emoji: "🌦️", label: "Sağanak" },
  95: { emoji: "⛈️", label: "Fırtına" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { emoji: "🌡️", label: "Bilinmiyor" };
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
    weatherEmoji: "📍",
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
          weatherEmoji: info.emoji,
        };
      }

      const result = {
        coords: { lat: latitude, lng: longitude },
        locationName,
        temp: weatherData?.temp ?? null,
        feelsLike: weatherData?.feelsLike ?? null,
        weatherLabel: weatherData?.weatherLabel ?? "Normal",
        weatherEmoji: weatherData?.weatherEmoji ?? "📍",
        status: "success",
        errorMsg: null,
      };

      sessionGeoCache = result;

      if (isMountedRef.current) {
        setGeoState(result);
        setIsLocating(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setGeoState((prev) => ({
          ...prev,
          coords: { lat: latitude, lng: longitude },
          status: "success",
          errorMsg: null,
        }));
        setIsLocating(false);
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoState((prev) => ({
        ...prev,
        status: "error",
        errorMsg: "Cihazınızda konum desteği bulunmuyor.",
      }));
      return;
    }

    setIsLocating(true);
    setGeoState((prev) => ({ ...prev, status: "locating" }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherAndGeocode(latitude, longitude);
      },
      (error) => {
        if (isMountedRef.current) {
          setIsLocating(false);
          setGeoState((prev) => ({
            ...prev,
            status: "error",
            errorMsg: error.code === 1 ? "Konum izni verilmedi." : "Konum alınamadı.",
          }));
        }
      },
      { timeout: 8000, maximumAge: 120000, enableHighAccuracy: false }
    );
  }, [fetchWeatherAndGeocode]);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      if (!sessionGeoCache && isMountedRef.current) {
        requestLocation();
      }
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [requestLocation]);

  const greeting = new Date().getHours() < 12 ? "Günaydın" : "İyi günler";
  const firstName = (userDashboard?.company_name || "Operatör").split(" ")[0];
  const isShipper = userDashboard?.role === "shipper";

  return (
    <div className="space-y-6">
      {/* =========================================================
          OPERATIONS HUB HEADER & MINI MAP
         ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT / MAIN (7 COLS): Operational Summary */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/8 bg-gradient-to-br from-[#0e141f] via-[#0B111A] to-[#07090d] p-6 sm:p-8 lg:col-span-7 shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E5A0] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00E5A0]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00E5A0]">
                  CANLI OPERASYON HUB
                </span>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-slate-400">
                {isShipper ? "Yük Veren Terminali" : "Taşıyıcı Filo Terminali"}
              </div>
            </div>

            <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-[-0.035em] text-white">
              {greeting}, <span className="text-white">{firstName}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isShipper
                ? "Navlun ilanlarınızı ve gelen teklifleri gerçek zamanlı izleyin."
                : "Açık navlun pazarını ve aktif sevkiyatlarınızı anlık yönetin."}
            </p>
          </div>

          {/* Location & Weather Telemetry Card */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Location Pill */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00E5A0]/20 bg-[#00E5A0]/10 text-base text-[#00E5A0]">
                📍
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Terminal Konumu
                </div>
                <div className="truncate text-xs font-black text-white">
                  {geoState.locationName}
                </div>
              </div>
            </div>

            {/* Weather Pill */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ffcc00]/20 bg-[#ffcc00]/10 text-base">
                {geoState.weatherEmoji}
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

        {/* RIGHT (5 COLS): Mini Live Map */}
        <div className="lg:col-span-5">
          <MiniLiveMap
            coords={geoState.coords}
            locationName={geoState.locationName}
            onRequestLocation={requestLocation}
            isLocating={isLocating}
          />
        </div>
      </div>

      {/* =========================================================
          QUICK ACTIONS (2x2 Grid)
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
                className="group flex flex-col justify-between rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/5 p-5 text-left transition hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/10 hover:shadow-[0_0_24px_rgba(0,229,160,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/15 text-[#00E5A0] transition group-hover:scale-110">
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
                className="group flex flex-col justify-between rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-5 text-left transition hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/10 hover:shadow-[0_0_24px_rgba(6,182,212,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/15 text-[#06B6D4] transition group-hover:scale-110">
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
                className="group flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition group-hover:scale-110">
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
                className="group flex flex-col justify-between rounded-2xl border border-[#ffcc00]/20 bg-[#ffcc00]/5 p-5 text-left transition hover:border-[#ffcc00]/40 hover:bg-[#ffcc00]/10 hover:shadow-[0_0_24px_rgba(255,204,0,0.12)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffcc00]/30 bg-[#ffcc00]/15 text-[#ffcc00] transition group-hover:scale-110">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#ffcc00] opacity-0 transition group-hover:opacity-100">
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
                className="group flex flex-col justify-between rounded-2xl border border-[#00E5A0]/20 bg-[#00E5A0]/5 p-5 text-left transition hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/10 hover:shadow-[0_0_24px_rgba(0,229,160,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/15 text-[#00E5A0] transition group-hover:scale-110">
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

              {/* 2. Aktif Taşımalar */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("transports")}
                className="group flex flex-col justify-between rounded-2xl border border-[#06B6D4]/20 bg-[#06B6D4]/5 p-5 text-left transition hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/10 hover:shadow-[0_0_24px_rgba(6,182,212,0.15)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/15 text-[#06B6D4] transition group-hover:scale-110">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  {counts.activeTransportsCount > 0 && (
                    <span className="rounded-full bg-[#06B6D4] px-2 py-0.5 text-[10px] font-black text-black">
                      {counts.activeTransportsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Aktif Taşımalar</div>
                  <div className="mt-1 text-xs text-slate-400">Devam eden sevkiyatları takip et</div>
                </div>
              </button>

              {/* 3. Tekliflerim */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("board")}
                className="group flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition group-hover:scale-110">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-400 opacity-0 transition group-hover:opacity-100">
                    Gör →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-black text-white">Tekliflerim</div>
                  <div className="mt-1 text-xs text-slate-400">Verdiğin tekliflerin durumları</div>
                </div>
              </button>

              {/* 4. Cüzdan */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-2xl border border-[#ffcc00]/20 bg-[#ffcc00]/5 p-5 text-left transition hover:border-[#ffcc00]/40 hover:bg-[#ffcc00]/10 hover:shadow-[0_0_24px_rgba(255,204,0,0.12)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffcc00]/30 bg-[#ffcc00]/15 text-[#ffcc00] transition group-hover:scale-110">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#ffcc00] opacity-0 transition group-hover:opacity-100">
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
