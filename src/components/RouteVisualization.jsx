"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import RouteSummary from "./RouteSummary";
import { createRouteData, createVisualPolyline } from "../utils/location";

// Leaflet only client-side
const MapComponent = dynamic(() => import("./TorkMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-2xl border border-white/8 bg-[#0B111A] text-sm text-[#9AA7B5]">
      Harita yükleniyor...
    </div>
  ),
});

/**
 * Session içi rota cache'i.
 * Aynı origin/destination için gereksiz API çağrısını engeller.
 * key: `latlng-latlng`
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
  routePoints = [],
  showSummary = true,
  profile = "driving-car",
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
      ? `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`
      : null;

  // Rota hesaplama: yalnızca koordinatlar değişince tetiklenir
  useEffect(() => {
    if (!originCoord || !destinationCoord) {
      setRouteState({
        status: "idle",
        distanceText: null,
        durationText: null,
        points: [],
      });
      return;
    }

    // Cache'te varsa yeniden fetch yapma
    if (cacheKey && routeCache.has(cacheKey)) {
      const cached = routeCache.get(cacheKey);
      setRouteState({
        status: "success",
        distanceText: cached.distanceText,
        durationText: cached.durationText,
        points: cached.geometry,
      });
      return;
    }

    // Eski request'i iptal et (hızlı route değişiminde eski response yeni route'u ezmesin)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRouteState({ status: "loading", distanceText: null, durationText: null, points: [] });

    async function fetchRoute() {
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

        // Cache'e yaz (session/client memory)
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
      } catch (err) {
        if (err.name === "AbortError") {
          // Eski istek iptal edildi — yeni istek zaten yolda, sessizce geç
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
  }, [originCoord, destinationCoord, origin?.lat, origin?.lng, destination?.lat, destination?.lng, cacheKey, profile]);

  const routeData = createRouteData({
    origin,
    destination,
    points: routeState.points,
  });

  // Haritada gösterilecek noktalar: gerçek rota varsa o, yoksa görsel fallback
  const visualPoints =
    routeState.points?.length > 0
      ? routeState.points
      : routePoints?.length > 0
        ? routePoints
        : originCoord && destinationCoord
          ? createVisualPolyline(origin, destination)
          : [];

  // Loading veya error bilgisini haritanın üstüne yerleştir
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0B111A]">
        <MapComponent
          origin={origin}
          destination={destination}
          originLabel={originLabel}
          destinationLabel={destinationLabel}
          routePoints={visualPoints}
        />

        {routeState.status === "loading" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center">
            <span className="rounded-full border border-[#00E5A0]/20 bg-[#0B111A]/90 px-4 py-2 text-xs font-bold text-[#00E5A0] shadow-lg">
              Rota hesaplanıyor...
            </span>
          </div>
        )}

        {routeState.status === "error" && (
          <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-[#0B111A]/90 px-4 py-2 text-xs font-bold text-red-400 shadow-lg">
              Rota hesaplanamadı.
              <button
                type="button"
                onClick={() => {
                  if (cacheKey) routeCache.delete(cacheKey);
                  setRouteState({ status: "idle", distanceText: null, durationText: null, points: [] });
                }}
                className="underline hover:text-red-300"
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
            routeState.status === "loading"
              ? "Rota hesaplanıyor..."
              : routeState.status === "success"
                ? routeState.distanceText
                : routeState.status === "error"
                  ? "Rota hesaplanamadı."
                  : "Henüz hesaplanmadı"
          }
          durationText={
            routeState.status === "loading"
              ? "Rota hesaplanıyor..."
              : routeState.status === "success"
                ? routeState.durationText
                : routeState.status === "error"
                  ? "Rota hesaplanamadı."
                  : "Henüz hesaplanmadı"
          }
        />
      )}
    </div>
  );
}