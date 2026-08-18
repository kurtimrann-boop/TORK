"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WEATHER_CODES = {
  0: { emoji: "☀️", label: "Açık" },
  1: { emoji: "🌤️", label: "Çok bulutlu değil" },
  2: { emoji: "⛅", label: "Parçalı bulutlu" },
  3: { emoji: "☁️", label: "Bulutlu" },
  45: { emoji: "🌫️", label: "Sisli" },
  48: { emoji: "🌫️", label: "Donlu sis" },
  51: { emoji: "🌦️", label: "Hafif çiseleyen yağmur" },
  53: { emoji: "🌦️", label: "Orta çiseleyen yağmur" },
  55: { emoji: "🌦️", label: "Yoğun çiseleyen yağmur" },
  61: { emoji: "🌧️", label: "Hafif yağmur" },
  63: { emoji: "🌧️", label: "Orta yağmur" },
  65: { emoji: "🌧️", label: "Yoğun yağmur" },
  66: { emoji: "🌧️", label: "Buzlu yağmur" },
  67: { emoji: "🌧️", label: "Buzlu yağmur" },
  71: { emoji: "❄️", label: "Hafif kar" },
  73: { emoji: "❄️", label: "Orta kar" },
  75: { emoji: "❄️", label: "Yoğun kar" },
  77: { emoji: "❄️", label: "Kar tanecikleri" },
  80: { emoji: "🌦️", label: "Hafif sağanak" },
  81: { emoji: "🌦️", label: "Orta sağanak" },
  82: { emoji: "🌦️", label: "Yoğun sağanak" },
  85: { emoji: "❄️", label: "Hafif kar sağanağı" },
  86: { emoji: "❄️", label: "Yoğun kar sağanağı" },
  95: { emoji: "⛈️", label: "Fırtına" },
  96: { emoji: "⛈️", label: "Fırtına + hafif dolu" },
  99: { emoji: "⛈️", label: "Fırtına + yoğun dolu" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { emoji: "🌡️", label: "Bilinmiyor" };
}

export default function WeatherIndicator() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef(null);

  const fetchWeather = useCallback(async (latitude, longitude) => {
    try {
      const [weatherRes, geoRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        ),
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=tr`
        ),
      ]);

      if (!weatherRes.ok) throw new Error("Weather API error");

      const weatherData = await weatherRes.json();
      const current = weatherData.current_weather;
      const weatherInfo = getWeatherInfo(current.weathercode);

      let locationName = "Mevcut konum";

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        locationName =
          addr.city ||
          addr.town ||
          addr.district ||
          addr.county ||
          addr.state ||
          "Mevcut konum";
      }

      const result = {
        temp: Math.round(current.temperature),
        ...weatherInfo,
        locationName,
      };

      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };

      setWeather(result);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const CACHE_TTL = 10 * 60 * 1000;

      if (cacheRef.current) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age < CACHE_TTL) {
          setWeather(cacheRef.current.data);
          setLoading(false);
          return;
        }
      }

      if (!("geolocation" in navigator)) {
        setError("Geolocation unavailable");
        setLoading(false);
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 60 * 1000,
          });
        });

        if (cancelled) return;

        const { latitude, longitude } = position.coords;
        await fetchWeather(latitude, longitude);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [fetchWeather]);

  if (loading) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-black/20 px-3.5 py-1 text-[10px] text-slate-500 backdrop-blur-md"
        aria-hidden="true"
      >
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffcc00]" />
        <span>Konum alınıyor...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-black/20 px-3.5 py-1 text-[10px] text-slate-500 backdrop-blur-md"
        aria-label="Konum alınamadı"
      >
        <span aria-hidden="true">📍</span>
        <span>Konum alınamadı</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-black/35 px-4 py-1.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition hover:border-white/15"
      aria-label={`${weather.locationName}, ${weather.temp} derece, ${weather.label}`}
    >
      <span className="text-sm" aria-hidden="true">
        {weather.emoji}
      </span>
      <span className="text-[11px] font-bold text-slate-200">
        {weather.locationName}
      </span>
      <span className="h-2.5 w-px bg-white/12" />
      <span className="text-[11px] font-black text-[#ffcc00]">
        {weather.temp}°C
      </span>
      <span className="h-2.5 w-px bg-white/12" />
      <span className="text-[10px] font-medium text-slate-400">
        {weather.label}
      </span>
    </div>
  );
}
