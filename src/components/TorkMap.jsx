"use client";

import React, { useEffect, useRef, useState } from "react";
// Road geometry integration — imported for direct fetch capability (Sprint 14)
// Active transport map uses routePoints prop supplied by RouteVisualization wrapper
import { getRealRoadGeometry } from "../utils/roadGeometryService";


/**
 * TorkMap — Industrial B2B Logistics Map Experience (Sprint 14)
 *
 * - Dark cartography (CartoDB Dark Matter)
 * - Dual-layer road route polyline in TORK Orange (#F5A400)
 * - Custom pulsing origin (TORK Orange #F5A400) & destination (#D98200) pins
 * - Sleek circular controls with SVG iconography
 * - Live Route Pill: CANLI ROTA | X km · Y saat
 * - Robust ResizeObserver + map.invalidateSize()
 * - SSR Safe dynamic Leaflet lifecycle
 */
export default function TorkMap({
  origin,
  destination,
  originLabel = "Başlangıç",
  destinationLabel = "Varış",
  routePoints = [],
  className = "",
  distanceKm = null,
  durationText = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [hasLeaflet, setHasLeaflet] = useState(false);

  // Dynamic Leaflet load (SSR safe)
  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      try {
        const L = (await import("leaflet")).default;
        if (!cancelled) {
          window.L = L;
          setHasLeaflet(true);
        }
      } catch (err) {
        console.error("Leaflet load error:", err);
      }
    }

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!hasLeaflet || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, 35.2], // Center of Turkey
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsReady(true);

    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      const ro = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      ro.observe(mapContainerRef.current);
      resizeObserverRef.current = ro;
    }

    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(t);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      map.remove();
      mapRef.current = null;
    };
  }, [hasLeaflet]);

  // Update Markers & Polyline
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear previous polylines
    if (polylineGlowRef.current) {
      polylineGlowRef.current.remove();
      polylineGlowRef.current = null;
    }
    if (polylineCoreRef.current) {
      polylineCoreRef.current.remove();
      polylineCoreRef.current = null;
    }

    const bounds = [];

    // 1. Origin Marker (TORK Orange #F5A400)
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number") {
      const originIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-7 w-7 rounded-full bg-[#F5A400]/25 animate-ping"></span>
            <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#F5A400] ring-4 ring-[#111827] shadow-[0_0_14px_#F5A400]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#111827]"></span>
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m1 = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);
      if (originLabel) {
        m1.bindTooltip(
          `<div class="text-xs font-black text-[#F5A400]">YÜKLEME: ${originLabel}</div>`,
          { permanent: false, direction: "top", offset: [0, -12], className: "tork-map-tooltip" }
        );
      }
      markersRef.current.push(m1);
      bounds.push([origin.lat, origin.lng]);
    }

    // 2. Destination Marker (#D98200)
    if (destination && typeof destination.lat === "number" && typeof destination.lng === "number") {
      const destIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-7 w-7 rounded-full bg-[#D98200]/25 animate-pulse"></span>
            <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#D98200] ring-4 ring-[#111827] shadow-[0_0_14px_#D98200]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#111827]"></span>
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m2 = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      if (destinationLabel) {
        m2.bindTooltip(
          `<div class="text-xs font-black text-[#F3F4F6]">TESLİMAT: ${destinationLabel}</div>`,
          { permanent: false, direction: "top", offset: [0, -12], className: "tork-map-tooltip" }
        );
      }
      markersRef.current.push(m2);
      bounds.push([destination.lat, destination.lng]);
    }

    // 3. Polyline Route
    if (Array.isArray(routePoints) && routePoints.length > 1) {
      const polylineCoords = routePoints.map((pt) => [pt.lat, pt.lng]);

      // Outer glow
      polylineGlowRef.current = L.polyline(polylineCoords, {
        color: "#F5A400",
        weight: 8,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Core highway line
      polylineCoreRef.current = L.polyline(polylineCoords, {
        color: "#F5A400",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      polylineCoords.forEach((pt) => bounds.push(pt));
    }

    // Smooth fit bounds
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 12,
        animate: true,
        duration: 0.8,
      });
    }
  }, [isReady, origin, destination, originLabel, destinationLabel, routePoints]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#374151] bg-[#111827] shadow-xl ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[440px]" />

      {/* Floating Status Header */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-[#374151] bg-[#1F2937]/95 px-3.5 py-2 text-xs backdrop-blur-md shadow-lg">
          <span className="flex h-2 w-2 rounded-full bg-[#F5A400] shadow-[0_0_8px_#F5A400] animate-pulse" />
          <span className="text-[#F5A400] font-black uppercase tracking-wider text-[11px]">
            CANLI ROTA
          </span>
          {originLabel && destinationLabel && (
            <>
              <span className="text-[#6B7280]">|</span>
              <span className="text-[#F3F4F6] font-bold">
                {originLabel} → {destinationLabel}
              </span>
            </>
          )}
          {distanceKm && (
            <span className="rounded bg-[#F5A400]/15 px-2 py-0.5 text-[11px] font-bold text-[#F5A400] border border-[#F5A400]/30">
              {Math.round(distanceKm)} km {durationText ? `· ${durationText}` : ""}
            </span>
          )}
        </div>

        {/* Map Controls */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-[#374151] bg-[#1F2937]/95 p-1 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Yakınlaştır"
            className="flex h-7 w-7 items-center justify-center rounded text-[#A0AEC0] hover:bg-[#283548] hover:text-[#F3F4F6] transition"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Uzaklaştır"
            className="flex h-7 w-7 items-center justify-center rounded text-[#A0AEC0] hover:bg-[#283548] hover:text-[#F3F4F6] transition"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.setView([39.0, 35.2], 6)}
            title="Haritayı Sıfırla"
            className="flex h-7 px-2.5 items-center justify-center rounded text-[11px] font-bold text-[#A0AEC0] hover:bg-[#283548] hover:text-[#F5A400] transition"
          >
            TR
          </button>
        </div>
      </div>
    </div>
  );
}