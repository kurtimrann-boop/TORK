"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import RouteSummary from "./RouteSummary";
import { setRouteDistance } from "../utils/location";
import { calculateRouteFuelCost } from "../utils/fuelCostService";
import { fetchCityFuelPrices, fetchNationalFuelPrices } from "../utils/fuelService";

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
 * RouteVisualization — Harita + Gerçek Rota Hesaplama + Yakıt Maliyeti Motoru (Hürmüz Phase 2)
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
    distanceKm: null,
    points: [],
    fuelCost: null,
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
          distanceKm: cached.distanceKm,
          points: cached.geometry,
          fuelCost: cached.fuelCost,
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

    async function fetchRouteAndFuel() {
      setRouteState({
        status: "loading",
        distanceText: null,
        durationText: null,
        distanceKm: null,
        points: [],
        fuelCost: null,
      });

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

        // Live Fuel Cost calculation
        let calculatedFuelCost = null;
        if (data.distanceKm) {
          try {
            const originCity = originLabel ? originLabel.split("/")[0].trim() : null;
            const fuelRes = originCity
              ? await fetchCityFuelPrices(originCity).catch(() => fetchNationalFuelPrices())
              : await fetchNationalFuelPrices();

            const dieselPrice =
              fuelRes?.prices?.diesel?.price ??
              fuelRes?.prices?.diesel?.average ??
              76.35;

            calculatedFuelCost = calculateRouteFuelCost({
              distanceKm: data.distanceKm,
              fuelPricePerLiter: dieselPrice,
              vehicleTypeId: "TIR",
            });
          } catch (fuelErr) {
            console.warn("[RouteVisualization] Yakıt maliyeti hesaplanamadı:", fuelErr);
          }
        }

        // Cache'e kaydet
        if (cacheKey) {
          routeCache.set(cacheKey, {
            distanceText: data.distanceText,
            durationText: data.durationText,
            distanceKm: data.distanceKm,
            geometry: data.geometry || [],
            fuelCost: calculatedFuelCost,
          });
        }

        setRouteState({
          status: "success",
          distanceText: data.distanceText,
          durationText: data.durationText,
          distanceKm: data.distanceKm,
          points: data.geometry || [],
          fuelCost: calculatedFuelCost,
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
          distanceKm: null,
          points: [],
          fuelCost: null,
        });
      }
    }

    fetchRouteAndFuel();

    return () => {
      controller.abort();
    };
  }, [originCoord, destinationCoord, origin?.lat, origin?.lng, destination?.lat, destination?.lng, originLabel, cacheKey, profile, loadId]);

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

        {/* Floating Live Route Info Pill (Bottom-Left) */}
        {activeStatus === "success" && routeState.distanceText && (
          <div className="absolute left-3 bottom-3 z-[400] flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B111A]/85 px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#00E5A0]/10 text-[#00E5A0]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-[#00E5A0]">
                CANLI ROTA
              </div>
              <div className="text-xs sm:text-sm font-black text-white tracking-tight">
                {routeState.distanceText} <span className="text-white/40">·</span> {routeState.durationText}
                {routeState.fuelCost && (
                  <>
                    <span className="text-white/40"> · </span>
                    <span className="text-[#00E5A0]/90">≈ {routeState.fuelCost.formatted?.cost} yakıt</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Floating Indicator with smooth 300ms transition */}
        {activeStatus === "loading" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none transition-all duration-300">
            <div className="flex items-center gap-2 rounded-full border border-[#00E5A0]/25 bg-black/80 px-4 py-2 text-xs font-black text-[#00E5A0] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#00E5A0] animate-ping" />
              Rota hesaplanıyor...
            </div>
          </div>
        )}

        {/* Error Floating Banner with Retry Action */}
        {activeStatus === "error" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center transition-all duration-300">
            <div className="flex items-center gap-2.5 rounded-full border border-red-500/25 bg-black/85 px-4 py-2 text-xs font-bold text-red-400 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Rota hesaplanamadı.</span>
              <button
                type="button"
                onClick={() => {
                  if (cacheKey) routeCache.delete(cacheKey);
                  setRouteState({
                    status: "idle",
                    distanceText: null,
                    durationText: null,
                    distanceKm: null,
                    points: [],
                    fuelCost: null,
                  });
                }}
                className="underline hover:text-red-300 font-bold ml-1"
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
          fuelCostInfo={activeStatus === "success" ? routeState.fuelCost : null}
        />
      )}
    </div>
  );
}