"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import RouteSummary from "./RouteSummary";
import { setRouteDistance } from "../utils/location";

// Leaflet dynamic load (SSR safe)
const MapComponent = dynamic(() => import("./TorkMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] sm:h-[420px] lg:h-[460px] w-full items-center justify-center rounded-3xl border border-white/8 bg-[#090D14] text-sm text-[#9AA7B5]">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-bold text-slate-300">
        <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-pulse" />
        Harita yükleniyor...
      </div>
    </div>
  ),
});

/**
 * Session içi rota cache'i.
 * key: `profile:lat,lng-lat,lng`
 */
const routeCache = new Map();

/**
 * RouteVisualization — Harita + Gerçek Rota Hesaplama
 *
 * origin/destination (koordinat) değişince /api/routes'a istek atar.
 * AbortController ile eski isteklerin yeni route'u ezmesi engellenir.
 */
export default function RouteVisualization({
  origin,
  destination,
  originLabel,
  destinationLabel,
  showSummary = true,
  profile = "driving-car",
  loadId,
}) {
  const [routeState, setRouteState] = useState({
    status: "idle", // idle | loading | success | error
    distanceText: null,
    durationText: null,
    points: [],
  });

  const abortControllerRef = useRef(null);

  const originCoord = origin?.lat != null && origin?.lng != null;
  const destinationCoord = destination?.lat != null && destination?.lng != null;

  const cacheKey =
    originCoord && destinationCoord
      ? `${profile}:${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`
      : null;

  // Rota hesaplama: koordinatlar mevcut olduğunda çalışır
  useEffect(() => {
    if (!originCoord || !destinationCoord) {
      return;
    }

    // Cache'te varsa hemen kullan
    if (cacheKey && routeCache.has(cacheKey)) {
      const cached = routeCache.get(cacheKey);
      Promise.resolve().then(() => {
        setRouteState({
          status: "success",
          distanceText: cached.distanceText,
          durationText: cached.durationText,
          points: cached.geometry,
        });
      });
      return;
    }

    // Eski request'i iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchRoute() {
      setRouteState({ status: "loading", distanceText: null, durationText: null, points: [] });

      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            profile,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Rota hesaplanamadı.");
        }

        // Cache'e kaydet
        if (cacheKey) {
          routeCache.set(cacheKey, {
            distanceText: data.distanceText,
            durationText: data.durationText,
            geometry: data.geometry || [],
          });
        }

        setRouteState({
          status: "success",
          distanceText: data.distanceText,
          durationText: data.durationText,
          points: data.geometry || [],
        });

        if (loadId && data.distanceKm != null) {
          setRouteDistance(loadId, data.distanceKm, data.durationMinutes || null);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.error("[routes] Rota hesaplama hatası:", err.message);
        setRouteState({
          status: "error",
          distanceText: null,
          durationText: null,
          points: [],
        });
      }
    }

    fetchRoute();

    return () => {
      controller.abort();
    };
  }, [originCoord, destinationCoord, origin?.lat, origin?.lng, destination?.lat, destination?.lng, cacheKey, profile, loadId]);

  const activeStatus = !originCoord || !destinationCoord ? "idle" : routeState.status;

  // Haritada gösterilecek noktalar: gerçek rota varsa o, yoksa boş
  const visualPoints =
    activeStatus === "success" && routeState.points?.length > 0
      ? routeState.points
      : [];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl">
        <MapComponent
          origin={origin}
          destination={destination}
          originLabel={originLabel}
          destinationLabel={destinationLabel}
          routePoints={visualPoints}
        />

        {/* Loading Floating Indicator */}
        {activeStatus === "loading" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 rounded-full border border-[#00E5A0]/25 bg-black/80 px-4 py-2 text-xs font-black text-[#00E5A0] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-ping" />
              Rota hesaplanıyor...
            </div>
          </div>
        )}

        {/* Error Floating Banner with Retry Action */}
        {activeStatus === "error" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center">
            <div className="flex items-center gap-2.5 rounded-full border border-red-500/25 bg-black/85 px-4 py-2 text-xs font-bold text-red-400 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <span>Rota hesaplanamadı.</span>
              <button
                type="button"
                onClick={() => {
                  if (cacheKey) routeCache.delete(cacheKey);
                  setRouteState({ status: "idle", distanceText: null, durationText: null, points: [] });
                }}
                className="underline hover:text-red-300 font-bold"
              >
                Tekrar dene
              </button>
            </div>
          </div>
        )}
      </div>

      {showSummary && (
        <RouteSummary
          originLabel={originLabel || "Başlangıç"}
          destinationLabel={destinationLabel || "Varış"}
          distanceText={
            activeStatus === "loading"
              ? "Rota hesaplanıyor..."
              : activeStatus === "success"
                ? routeState.distanceText
                : activeStatus === "error"
                  ? "Rota hesaplanamadı."
                  : "Henüz hesaplanmadı"
          }
          durationText={
            activeStatus === "loading"
              ? "Rota hesaplanıyor..."
              : activeStatus === "success"
                ? routeState.durationText
                : activeStatus === "error"
                  ? "Rota hesaplanamadı."
                  : "Henüz hesaplanmadı"
          }
        />
      )}
    </div>
  );
}