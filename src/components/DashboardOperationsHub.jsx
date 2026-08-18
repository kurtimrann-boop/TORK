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

function WeatherIcon({ type, className = "h-4 w-4 text-[#F5B94C]" }) {
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

      let locationName = "Mevcut Konum";
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const district = addr.suburb || addr.district || addr.town || addr.county || "";
        const city = addr.province || addr.city || addr.state || "";
        if (district && city) locationName = `${district}, ${city}`;
        else if (city) locationName = city;
        else if (district) locationName = district;
      }

      let temp = null;
      let feelsLike = null;
      let weatherType = "cloud";
      let weatherLabel = "Bulutlu";

      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const current = wData.current_weather;
        if (current) {
          temp = Math.round(current.temperature);
          feelsLike = temp;
          const wInfo = getWeatherInfo(current.weathercode);
          weatherType = wInfo.type;
          weatherLabel = wInfo.label;
        }
      }

      if (isMountedRef.current) {
        const nextState = {
          coords: { lat: latitude, lng: longitude },
          locationName,
          temp,
          feelsLike,
          weatherLabel,
          weatherType,
          status: "success",
          errorMsg: null,
        };
        sessionGeoCache = nextState;
        setGeoState(nextState);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setGeoState((prev) => ({
          ...prev,
          coords: { lat: latitude, lng: longitude },
          locationName: "Tespit Edilen Konum",
          status: "error",
          errorMsg: "Hava durumu alınamadı",
        }));
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState((prev) => ({ ...prev, status: "error", errorMsg: "Tarayıcı konum desteklemiyor" }));
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
        setGeoState((prev) => ({
          ...prev,
          status: "error",
          errorMsg: err.code === 1 ? "Konum izni verilmedi" : "Konum alınamadı",
        }));
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, [fetchWeatherAndGeocode]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!sessionGeoCache && geoState.status === "idle") {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          requestLocation();
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
      };
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [geoState.status, requestLocation]);

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
    <div className="space-y-6 select-none">
      {/* =========================================================
          TOP KPI LINE (4 Major Metrics Strip)
         ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: AKTİF YÜK */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B111A] p-3.5 sm:p-5 transition hover:border-white/12">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            Aktif Yük
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.04em] text-[#F5F7FA]">
            {activeLoadsCount}
          </div>
          <div className="mt-1 text-xs text-[#8C98A8]">
            {isShipper ? "Açık İlanlarınız" : "Piyasadaki Yükler"}
          </div>
        </div>

        {/* KPI 2: BEKLEYEN TEKLİF */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B111A] p-3.5 sm:p-5 transition hover:border-[#F5B94C]/30">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5B94C]">
            Bekleyen Teklif
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.04em] text-[#F5B94C]">
            {bidsCount}
          </div>
          <div className="mt-1 text-xs text-[#8C98A8]">
            {isShipper ? "Gelen Teklifler" : "Verdiğiniz Teklifler"}
          </div>
        </div>

        {/* KPI 3: AKTİF TAŞIMA */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B111A] p-3.5 sm:p-5 transition hover:border-[#00E5A0]/30">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
            Aktif Taşıma
          </div>
          <div className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.04em] text-[#00E5A0]">
            {transportsCount}
          </div>
          <div className="mt-1 text-xs text-[#8C98A8]">
            Devam Eden Seferler
          </div>
        </div>

        {/* KPI 4: AÇIK NAVLUN */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B111A] p-3.5 sm:p-5 transition hover:border-white/12">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            Açık Navlun Hacmi
          </div>
          <div className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-[-0.04em] text-[#F5F7FA]">
            {openFreightEstimate}
          </div>
          <div className="mt-1 text-xs text-[#8C98A8]">
            Tahmini Sefer Değeri
          </div>
        </div>
      </div>

      {/* =========================================================
          CONTROL TOWER SPLIT GRID
          LEFT (7 COLS): Large Live Map
          RIGHT (5 COLS): Market Intelligence & Fuel
         ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7">
          <MiniLiveMap
            coords={geoState.coords}
            locationName={geoState.locationName}
            onRequestLocation={requestLocation}
            isLocating={isLocating}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Market Intelligence Widget */}
          <FuelPriceWidget province={detectedProvince} className="flex-1" />

          {/* Location & Weather Mini Card */}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0B111A] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <WeatherIcon type={geoState.weatherType} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#F5F7FA]">
                  {geoState.locationName}
                </div>
                <div className="text-[11px] text-[#8C98A8]">
                  {geoState.temp !== null ? `${geoState.temp}°C · ${geoState.weatherLabel}` : "Konum ve hava taranıyor"}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00E5A0] bg-[#00E5A0]/10 border border-[#00E5A0]/20 px-2 py-0.5 rounded-full">
              CANLI
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          QUICK ACTIONS (Minimalist Linear/Apple Style Grid)
         ========================================================= */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
              Hızlı İşlemler
            </div>
            <h3 className="text-lg font-black text-[#F5F7FA]">Operasyonel Kısayollar</h3>
          </div>
          <span className="text-xs font-semibold text-[#8C98A8]">Tek Tıkla Erişim</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {isShipper ? (
            <>
              {/* 1. Yeni Yük İlanı */}
              <button
                type="button"
                onClick={() => {
                  if (onResetCreateForm) onResetCreateForm();
                  if (onNavigate) onNavigate("create");
                }}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#00E5A0] opacity-0 transition group-hover:opacity-100">
                    Başlat →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">+ Yeni Yük İlanı</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Adım adım sihirbaz ile yayınla</div>
                </div>
              </button>

              {/* 2. Gelen Teklifler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("bids")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#F5B94C]/40 hover:bg-[#F5B94C]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5B94C]/10 border border-[#F5B94C]/20 text-[#F5B94C] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  {counts.bidsCount > 0 && (
                    <span className="rounded-full bg-[#F5B94C] px-2 py-0.5 text-[10px] font-black text-[#060B11]">
                      {counts.bidsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Gelen Teklifler</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Teklifleri incele & onayla</div>
                </div>
              </button>

              {/* 3. İlanlarım */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("loads")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F7FA] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#8C98A8] opacity-0 transition group-hover:opacity-100">
                    Yönet →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">İlanlarım</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Açık yük listesini kontrol et</div>
                </div>
              </button>

              {/* 4. Cüzdan & Ödemeler */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#00E5A0] opacity-0 transition group-hover:opacity-100">
                    Görüntüle →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Cüzdan & Bakiye</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Kullanılabilir bakiye & ödemeler</div>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* 1. Yük Pazaryeri */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("board")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#00E5A0] opacity-0 transition group-hover:opacity-100">
                    Göz At →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Yük Pazaryeri</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Uygun navlun fırsatlarını tara</div>
                </div>
              </button>

              {/* 2. Tekliflerim */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("my-bids")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#F5B94C]/40 hover:bg-[#F5B94C]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5B94C]/10 border border-[#F5B94C]/20 text-[#F5B94C] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  {counts.carrierBidsCount > 0 && (
                    <span className="rounded-full bg-[#F5B94C] px-2 py-0.5 text-[10px] font-black text-[#060B11]">
                      {counts.carrierBidsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Tekliflerim</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Verilen tekliflerin durumları</div>
                </div>
              </button>

              {/* 3. Taşımalarım */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("transports")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  {counts.activeTransportsCount > 0 && (
                    <span className="rounded-full bg-[#00E5A0] px-2 py-0.5 text-[10px] font-black text-[#060B11]">
                      {counts.activeTransportsCount}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Aktif Taşımalar</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Sefer ve mutabakat takibi</div>
                </div>
              </button>

              {/* 4. Hakediş & Cüzdan */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("wallet")}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#101923] p-5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F5F7FA] transition duration-200 group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#8C98A8] opacity-0 transition group-hover:opacity-100">
                    Bakiye →
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold text-[#F5F7FA]">Hakediş & Cüzdan</div>
                  <div className="mt-0.5 text-xs text-[#8C98A8]">Ödemeler ve hakediş bakiyesi</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
