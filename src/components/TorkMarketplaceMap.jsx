"use client";

import React, { useEffect, useRef, useState } from "react";
import { resolveLoadLocations } from "../utils/location";
import { getRealRoadGeometry } from "../utils/roadGeometryService";

/**
 * TorkMarketplaceMap — Interactive Industrial B2B Freight Marketplace Map (Sprint 14)
 * 
 * - CartoDB Dark Matter dark cartography
 * - Ambient pins for open marketplace loads
 * - Real Road Geometry Polyline for selected load in TORK Orange (#F5A400)
 * - Origin & Destination pins
 * - Bidirectional List/Map synchronization
 * - Route status indicator ("Gerçek Karayolu Rotası" / "Rota Hesaplanamadı")
 * - Resilient ResizeObserver & Leaflet lifecycle
 */
export default function TorkMarketplaceMap({
  loads = [],
  selectedLoad = null,
  onSelectLoad = null,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const ambientMarkersRef = useRef([]);
  const selectedMarkersRef = useRef([]);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [hasLeaflet, setHasLeaflet] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // 1. Dynamic Leaflet import (SSR safe)
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

  // 2. Initialize Map
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

  // 3. Fetch Real Road Geometry when selectedLoad changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchRoute() {
      if (!selectedLoad) {
        setRouteData(null);
        return;
      }

      const { origin, destination } = resolveLoadLocations(selectedLoad);
      if (!origin || !destination) {
        setRouteData({ success: false, routeStatus: "missing_locations" });
        return;
      }

      setRouteLoading(true);
      const originParam = { lat: origin.lat, lng: origin.lng, name: selectedLoad.origin };
      const destParam = { lat: destination.lat, lng: destination.lng, name: selectedLoad.destination };

      const result = await getRealRoadGeometry(originParam, destParam);
      if (!isCancelled) {
        setRouteData(result);
        setRouteLoading(false);
      }
    }

    fetchRoute();

    return () => {
      isCancelled = true;
    };
  }, [selectedLoad]);

  // 4. Render Ambient Markers for All Marketplace Loads
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear old ambient markers
    ambientMarkersRef.current.forEach((m) => m.remove());
    ambientMarkersRef.current = [];

    loads.forEach((load) => {
      if (selectedLoad && load.id === selectedLoad.id) return; // Rendered in selected group

      const { origin } = resolveLoadLocations(load);
      if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") return;

      const ambientIcon = L.divIcon({
        className: "custom-ambient-pin",
        html: `
          <div class="group/pin relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <span class="h-3 w-3 rounded-full bg-[#F5A400]/60 ring-2 ring-[#111827] shadow-[0_0_8px_rgba(245,164,0,0.4)]"></span>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([origin.lat, origin.lng], { icon: ambientIcon }).addTo(map);
      marker.bindTooltip(
        `<div class="text-xs font-bold text-slate-100"><strong>${load.origin}</strong> → ${load.destination} (${load.tonnage}t)</div>`,
        { direction: "top", offset: [0, -6], className: "tork-map-tooltip" }
      );

      marker.on("click", () => {
        if (onSelectLoad) {
          onSelectLoad(load);
        }
      });

      ambientMarkersRef.current.push(marker);
    });
  }, [isReady, loads, selectedLoad, onSelectLoad]);

  // 5. Render Selected Load Markers & Real Road Polyline
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear previous selected markers & lines
    selectedMarkersRef.current.forEach((m) => m.remove());
    selectedMarkersRef.current = [];

    if (polylineGlowRef.current) {
      polylineGlowRef.current.remove();
      polylineGlowRef.current = null;
    }
    if (polylineCoreRef.current) {
      polylineCoreRef.current.remove();
      polylineCoreRef.current = null;
    }

    if (!selectedLoad) {
      map.setView([39.0, 35.2], 6);
      return;
    }

    const { origin, destination } = resolveLoadLocations(selectedLoad);
    const bounds = [];

    // Origin Marker (TORK Orange #F5A400)
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number") {
      const originIcon = L.divIcon({
        className: "custom-selected-origin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-8 w-8 rounded-full bg-[#F5A400]/25 animate-ping"></span>
            <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#F5A400] ring-4 ring-[#111827] shadow-[0_0_16px_#F5A400]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#111827]"></span>
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const mOrigin = L.marker([origin.lat, origin.lng], { icon: originIcon, zIndexOffset: 1000 }).addTo(map);
      mOrigin.bindTooltip(
        `<div class="text-xs font-black text-[#F5A400]">YÜKLEME: ${selectedLoad.origin}</div>`,
        { permanent: false, direction: "top", offset: [0, -12], className: "tork-map-tooltip" }
      );
      selectedMarkersRef.current.push(mOrigin);
      bounds.push([origin.lat, origin.lng]);
    }

    // Destination Marker (Graphite / Amber Destination)
    if (destination && typeof destination.lat === "number" && typeof destination.lng === "number") {
      const destIcon = L.divIcon({
        className: "custom-selected-destination",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-8 w-8 rounded-full bg-[#D98200]/25 animate-pulse"></span>
            <span class="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#D98200] ring-4 ring-[#111827] shadow-[0_0_16px_#D98200]">
              <span class="h-1.5 w-1.5 rounded-full bg-[#111827]"></span>
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const mDest = L.marker([destination.lat, destination.lng], { icon: destIcon, zIndexOffset: 1000 }).addTo(map);
      mDest.bindTooltip(
        `<div class="text-xs font-black text-[#F3F4F6]">TESLİMAT: ${selectedLoad.destination}</div>`,
        { permanent: false, direction: "top", offset: [0, -12], className: "tork-map-tooltip" }
      );
      selectedMarkersRef.current.push(mDest);
      bounds.push([destination.lat, destination.lng]);
    }

    // Draw Real Road Polyline (Only when real multi-point geometry is available)
    if (routeData?.success && Array.isArray(routeData.geometry) && routeData.geometry.length > 2) {
      const polylineCoords = routeData.geometry.map((pt) => [pt.lat, pt.lng]);

      // Glow Layer
      polylineGlowRef.current = L.polyline(polylineCoords, {
        color: "#F5A400",
        weight: 8,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Core Highway Layer
      polylineCoreRef.current = L.polyline(polylineCoords, {
        color: "#F5A400",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      polylineCoords.forEach((pt) => bounds.push(pt));
    }

    // Fit bounds smoothly
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 12,
        animate: true,
        duration: 0.8,
      });
    }
  }, [isReady, selectedLoad, routeData]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#374151] bg-[#111827] shadow-xl ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[440px]" />

      {/* Top Floating Route Status Pill */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-[#374151] bg-[#1F2937]/95 px-3.5 py-2 text-xs backdrop-blur-md shadow-lg">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#F5A400] shadow-[0_0_8px_#F5A400] animate-pulse" />
          <span className="text-[#F5A400] font-black uppercase tracking-wider text-[11px]">
            {selectedLoad ? "SEÇİLİ SEVKİYAT" : "YÜK BORSASI HARİTASI"}
          </span>
          {selectedLoad ? (
            <>
              <span className="text-[#6B7280]">|</span>
              <span className="text-[#F3F4F6] font-bold truncate max-w-[200px] sm:max-w-none">
                {selectedLoad.origin} → {selectedLoad.destination}
              </span>
              {routeLoading ? (
                <span className="text-[#A0AEC0] text-[11px] animate-pulse">
                  Rota çiziliyor...
                </span>
              ) : routeData?.success && routeData.geometry?.length > 2 ? (
                <span className="rounded bg-[#F5A400]/15 px-2 py-0.5 text-[11px] font-bold text-[#F5A400] border border-[#F5A400]/30">
                  {routeData.geometry.length} Yol Noktası · Karayolu Geometrisi
                </span>
              ) : (
                <span className="rounded bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-bold text-[#EF4444] border border-[#EF4444]/30">
                  Rota hesaplanamadı
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-[#6B7280]">|</span>
              <span className="text-[#A0AEC0] font-medium">
                {loads.length} aktif yük listeleniyor
              </span>
            </>
          )}
        </div>

        {/* Map Control Buttons */}
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
