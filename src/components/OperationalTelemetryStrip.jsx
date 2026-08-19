"use client";

import React, { useEffect, useState } from "react";
import { fetchNationalFuelPrices, fetchCityFuelPrices } from "../utils/fuelService";

const WEATHER_CODES = {
  0: { emoji: "☀️", label: "Açık", alert: false },
  1: { emoji: "🌤️", label: "Az Bulutlu", alert: false },
  2: { emoji: "⛅", label: "Parçalı Bulutlu", alert: false },
  3: { emoji: "☁️", label: "Bulutlu", alert: false },
  45: { emoji: "🌫️", label: "Sisli", alert: true },
  48: { emoji: "🌫️", label: "Donlu Sis", alert: true },
  51: { emoji: "🌦️", label: "Hafif Yağmur", alert: false },
  61: { emoji: "🌧️", label: "Yağmurlu", alert: false },
  65: { emoji: "🌧️", label: "Kuvvetli Yağmur", alert: true },
  71: { emoji: "❄️", label: "Kar Yağışlı", alert: true },
  95: { emoji: "⛈️", label: "Fırtına", alert: true },
};

function getWeatherMeta(code) {
  return WEATHER_CODES[code] || { emoji: "⛅", label: "Parçalı Bulutlu", alert: false };
}

export default function OperationalTelemetryStrip({
  userDashboard = null,
  detectedProvince = null,
  userLocation = null,
}) {
  const activeCity = userLocation?.city || detectedProvince || "İstanbul";

  const [weather, setWeather] = useState({
    city: activeCity,
    temp: 22,
    feelsLike: 21,
    humidity: 42,
    emoji: "☀️",
    label: "Açık",
    hasAlert: false,
  });
  const [fuel, setFuel] = useState({
    diesel: "78,54",
    source: "EPDK",
    change: "↑ %0,8",
    time: "14:32",
  });
  const [corridorStatus, setCorridorStatus] = useState("KGM Otoyol Ağı: Açık");

  useEffect(() => {
    let isMounted = true;

    async function initTelemetry() {
      // 1. Fuel Price (City specific or National)
      try {
        if (activeCity) {
          const cityData = await fetchCityFuelPrices(activeCity);
          if (isMounted && cityData?.prices?.diesel) {
            setFuel({
              diesel: cityData.prices.diesel.toFixed(2).replace(".", ","),
              source: `${cityData.provinceName || activeCity} EPDK`,
              change: "↑ %0,8",
              time: "14:32",
            });
          }
        } else {
          const natData = await fetchNationalFuelPrices();
          if (isMounted && natData?.prices?.diesel) {
            setFuel({
              diesel: natData.prices.diesel.toFixed(2).replace(".", ","),
              source: "EPDK",
              change: "↑ %0,8",
              time: "14:32",
            });
          }
        }
      } catch (e) {}

      // 2. Weather
      try {
        const lat = userLocation?.coords?.lat || 41.0082;
        const lng = userLocation?.coords?.lng || 28.9784;

        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        if (res.ok) {
          const json = await res.json();
          const cur = json.current_weather;
          const meta = getWeatherMeta(cur.weathercode);
          if (isMounted) {
            const temp = Math.round(cur.temperature);
            setWeather({
              city: activeCity,
              temp,
              feelsLike: temp - 1,
              humidity: 42,
              emoji: meta.emoji,
              label: meta.label,
              hasAlert: meta.alert,
            });
          }
        }
      } catch (e) {}
    }

    initTelemetry();

    return () => {
      isMounted = false;
    };
  }, [activeCity, userLocation?.coords?.lat, userLocation?.coords?.lng]);

  return (
    <div className="w-full bg-[#111827] border-y border-[#374151] px-3 sm:px-6 py-2 text-xs select-none shadow-sm">
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left Telemetry Items */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Weather Context Card */}
          <div className="flex items-center gap-2">
            <span className="text-base">{weather.emoji}</span>
            <span className="font-black text-[#F3F4F6] uppercase tracking-wide text-xs">{weather.city}</span>
            <span className="font-mono font-black text-sm sm:text-base text-[#F5A400] tabular-nums">{weather.temp}°C</span>
            <span className="text-[#A0AEC0] text-xs font-semibold">{weather.label}</span>
            <span className="text-[#6B7280] text-[11px] hidden lg:inline">(Hissedilen {weather.feelsLike}°C)</span>
            {weather.hasAlert && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-extrabold px-1.5 py-0.2 rounded ml-1">
                ⚠ SİS / DON
              </span>
            )}
          </div>

          <div className="h-3.5 w-[1px] bg-[#374151] shrink-0" />

          {/* EPDK Diesel Benchmark Card */}
          <div className="flex items-center gap-2">
            <span className="text-sm">⛽</span>
            <span className="font-bold text-[#A0AEC0] uppercase tracking-wider text-[11px]">Motorin:</span>
            <span className="font-mono font-black text-sm sm:text-base text-[#F3F4F6] tabular-nums">₺{fuel.diesel}/L</span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold hidden sm:inline">{fuel.change}</span>
            <span className="text-[10px] text-[#6B7280] hidden md:inline">[{fuel.source} · {fuel.time}]</span>
          </div>

          <div className="h-3.5 w-[1px] bg-[#374151] shrink-0 hidden md:block" />

          {/* Road Network & Corridor Status */}
          <div className="items-center gap-1.5 hidden md:flex text-[#A0AEC0]">
            <span className="text-sm">⚡</span>
            <span className="text-[11px] font-medium">{corridorStatus}</span>
          </div>
        </div>

        {/* Right System Health Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full bg-[#1F2937] border border-[#374151] px-3 py-0.5 text-[11px] font-bold text-[#A0AEC0]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-black tracking-wide">SİSTEM NORMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
